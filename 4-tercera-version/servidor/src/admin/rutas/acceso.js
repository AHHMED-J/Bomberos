// Acceso a la página de Administración. Igual que en la app, se entra con el
// número de empleado y la contraseña, o directo con la biometría. En el
// navegador la biometría es una «llave de acceso» (WebAuthn / passkey): Touch
// ID, Face ID, Windows Hello o una llave USB. La huella nunca llega aquí; el
// dispositivo firma un reto con una llave privada que no sale de él.
//
// La contraseña sola NUNCA abre la página: después siempre se pide la llave.
//
//   POST /entrar                      número de empleado + contraseña → sesión a medias
//   POST /llave/opciones-registro     (a medias, sin llaves; o completa) opciones para crear una llave
//   POST /llave/registrar             guarda la llave → sesión completa
//   POST /llave/opciones-acceso       (a medias) opciones para usar una de sus llaves
//   POST /llave/verificar             comprueba la llave → sesión completa
//   POST /llave-sola/opciones         entrar sólo con la llave (sin escribir nada)
//   POST /llave-sola/verificar        comprueba la llave → sesión completa
//   GET  /yo                          quién soy y en qué paso voy
//   POST /salir                       cierra la sesión
//   POST /contrasena                  cambia la propia contraseña
//   GET  /llaves                      mis llaves de acceso
//   DELETE /llaves/:id                quita una (nunca la última)

'use strict';

const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const db = require('../../db');
const { sha256 } = require('../../firma');
const config = require('../config');
const sesion = require('../sesion');
const limite = require('../limite');
const { anotar } = require('../bitacora');

const r = express.Router();

// Si el número de empleado no existe, igual se compara contra este hash: así
// la respuesta tarda lo mismo y no revela qué números existen.
const HASH_FALSO = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 12);

const texto = (v, max = 200) => (typeof v === 'string' && v.length <= max ? v : null);

function publico(u) {
  return { id: u.id, nombre: u.nombre, matricula: u.matricula, rango: u.rango, rol: u.rol };
}

const llavesDe = (usuarioId) =>
  db.filas('SELECT id, llave, contador, transportes FROM credencial_web WHERE usuario_id = ?', [usuarioId]);

const transportes = (fila) => (fila.transportes ? fila.transportes.split(',') : undefined);

function credencial(fila) {
  return { id: fila.id, publicKey: new Uint8Array(fila.llave), counter: fila.contador, transports: transportes(fila) };
}

// El reto de esta sesión se usa una sola vez, salga bien o mal.
async function gastarRetoDeSesion(s) {
  await db.ejecutar('UPDATE sesion_web SET reto = NULL WHERE token_hash = ?', [s.tokenHash]);
  return s.reto;
}

// --- Número de empleado y contraseña -----------------------------------------

r.post('/entrar', async (req, res) => {
  const matricula = String(texto(req.body.no_empleado, 20) ?? '').trim();
  const contrasena = texto(req.body.contrasena, 200);
  const ip = sesion.ipDe(req);

  const espera = limite.espera(ip, matricula);
  if (espera > 0) {
    res.set('Retry-After', String(espera));
    return res.status(429).json({ error: 'demasiados_intentos', segundos: espera });
  }

  const u = matricula ? await db.fila('SELECT * FROM usuario WHERE matricula = ?', [matricula]) : null;
  const correcta = await bcrypt.compare(contrasena || '-', u?.contrasena_hash || HASH_FALSO);
  if (!u || !correcta || !u.activo || u.rol !== 'administracion') {
    limite.fallo(ip, matricula);
    await anotar(req, 'acceso_fallido', { usuarioId: u?.id ?? null, objetivo: matricula });
    return res.status(401).json({ error: 'credenciales_incorrectas' });
  }

  limite.exito(ip, matricula);
  await sesion.cerrar(req, res);
  await sesion.abrir(req, res, u.id, 'contrasena');
  const tiene = (await llavesDe(u.id)).length > 0;
  res.json({ paso: tiene ? 'usar_llave' : 'registrar_llave', usuario: publico(u) });
});

// --- Crear una llave de acceso ----------------------------------------------

r.post('/llave/opciones-registro', sesion.exigir('contrasena'), async (req, res) => {
  const u = req.usuario;
  const existentes = await llavesDe(u.id);
  // Con la contraseña sola sólo se crea la PRIMERA llave (la contraseña que le
  // dieron sirve de invitación). Para agregar otra, hay que entrar con una llave.
  if (req.sesion.nivel !== 'completa' && existentes.length > 0) return res.status(403).json({ error: 'usa_tu_llave' });

  const opciones = await generateRegistrationOptions({
    rpName: config.RP_NOMBRE,
    rpID: config.RP_ID,
    userName: u.matricula,
    userDisplayName: u.nombre,
    userID: new Uint8Array(Buffer.from(u.id, 'utf8')),
    attestationType: 'none',
    excludeCredentials: existentes.map((c) => ({ id: c.id, transports: transportes(c) })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });
  await db.ejecutar('UPDATE sesion_web SET reto = ? WHERE token_hash = ?', [opciones.challenge, req.sesion.tokenHash]);
  res.json(opciones);
});

r.post('/llave/registrar', sesion.exigir('contrasena'), async (req, res) => {
  const s = req.sesion;
  const reto = await gastarRetoDeSesion(s);
  if (!reto) return res.status(400).json({ error: 'sin_reto' });
  if (s.nivel !== 'completa' && (await llavesDe(s.usuario.id)).length > 0) {
    return res.status(403).json({ error: 'usa_tu_llave' });
  }

  let resultado;
  try {
    resultado = await verifyRegistrationResponse({
      response: req.body.respuesta,
      expectedChallenge: reto,
      expectedOrigin: config.ORIGENES,
      expectedRPID: config.RP_ID,
      requireUserVerification: true,
    });
  } catch {
    resultado = { verified: false };
  }
  if (!resultado.verified) {
    await anotar(req, 'llave_rechazada', { objetivo: 'registro' });
    return res.status(400).json({ error: 'llave_invalida' });
  }

  const c = resultado.registrationInfo.credential;
  const nombre = String(texto(req.body.nombre, 80) || '').trim() || 'Llave de acceso';
  await db.ejecutar(
    'INSERT INTO credencial_web (id, usuario_id, llave, contador, transportes, nombre) VALUES (?, ?, ?, ?, ?, ?)',
    [c.id, s.usuario.id, Buffer.from(c.publicKey), c.counter, (c.transports || []).join(',') || null, nombre],
  );
  await anotar(req, 'llave_registrada', { objetivo: nombre });
  if (s.nivel !== 'completa') await sesion.renovar(req, res, s);
  res.json({ ok: true });
});

// --- Usar una llave después de la contraseña ---------------------------------

r.post('/llave/opciones-acceso', sesion.exigir('contrasena'), async (req, res) => {
  const llaves = await llavesDe(req.usuario.id);
  if (!llaves.length) return res.status(409).json({ error: 'sin_llaves' });
  const opciones = await generateAuthenticationOptions({
    rpID: config.RP_ID,
    allowCredentials: llaves.map((c) => ({ id: c.id, transports: transportes(c) })),
    userVerification: 'required',
  });
  await db.ejecutar('UPDATE sesion_web SET reto = ? WHERE token_hash = ?', [opciones.challenge, req.sesion.tokenHash]);
  res.json(opciones);
});

// Comprueba la respuesta del navegador contra una llave guardada. Devuelve la
// fila de la llave si salió bien, o null.
async function comprobarLlave(req, reto, filtroUsuarioId) {
  const respuesta = req.body.respuesta;
  const id = texto(respuesta?.id, 255);
  if (!reto || !id) return null;
  const fila = await db.fila(
    `SELECT c.*, u.activo, u.rol FROM credencial_web c JOIN usuario u ON u.id = c.usuario_id WHERE c.id = ?`,
    [id],
  );
  if (!fila || !fila.activo || fila.rol !== 'administracion') return null;
  if (filtroUsuarioId && fila.usuario_id !== filtroUsuarioId) return null;

  let resultado;
  try {
    resultado = await verifyAuthenticationResponse({
      response: respuesta,
      expectedChallenge: reto,
      expectedOrigin: config.ORIGENES,
      expectedRPID: config.RP_ID,
      credential: credencial(fila),
      requireUserVerification: true,
    });
  } catch {
    return null;
  }
  if (!resultado.verified) return null;

  // La llave dice de quién es (userHandle). Si no coincide, no entra.
  const dueno = respuesta.response?.userHandle;
  if (dueno && dueno !== Buffer.from(fila.usuario_id, 'utf8').toString('base64url')) return null;

  await db.ejecutar('UPDATE credencial_web SET contador = ?, usada_en = NOW() WHERE id = ?', [
    resultado.authenticationInfo.newCounter,
    fila.id,
  ]);
  return fila;
}

r.post('/llave/verificar', sesion.exigir('contrasena'), async (req, res) => {
  const s = req.sesion;
  const reto = await gastarRetoDeSesion(s);
  const fila = await comprobarLlave(req, reto, s.usuario.id);
  if (!fila) {
    await anotar(req, 'llave_rechazada', { objetivo: 'acceso' });
    return res.status(401).json({ error: 'llave_invalida' });
  }
  await sesion.renovar(req, res, s);
  await anotar(req, 'acceso', { detalle: { metodo: 'contrasena+llave', llave: fila.nombre } });
  res.json({ ok: true });
});

// --- Entrar sólo con la llave ------------------------------------------------

r.post('/llave-sola/opciones', async (req, res) => {
  const opciones = await generateAuthenticationOptions({ rpID: config.RP_ID, userVerification: 'required' });
  const id = crypto.randomBytes(24).toString('base64url');
  await db.ejecutar('INSERT INTO reto_web (id_hash, reto) VALUES (?, ?)', [sha256(id), opciones.challenge]);
  sesion.ponerCookie(res, config.COOKIE_RETO, id, config.VIGENCIA_RETO);
  res.json(opciones);
});

r.post('/llave-sola/verificar', async (req, res) => {
  const id = sesion.leerCookies(req)[config.COOKIE_RETO];
  sesion.borrarCookie(res, config.COOKIE_RETO);
  let reto = null;
  if (id) {
    const fila = await db.fila(
      `SELECT reto FROM reto_web WHERE id_hash = ? AND usado_en IS NULL
          AND creado_en > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [sha256(id), config.VIGENCIA_RETO],
    );
    const { affectedRows } = await db.ejecutar('UPDATE reto_web SET usado_en = NOW() WHERE id_hash = ? AND usado_en IS NULL', [
      sha256(id),
    ]);
    if (fila && affectedRows === 1) reto = fila.reto;
  }

  const llave = await comprobarLlave(req, reto, null);
  if (!llave) {
    await anotar(req, 'llave_rechazada', { objetivo: 'acceso_directo' });
    return res.status(401).json({ error: 'llave_invalida' });
  }
  await sesion.cerrar(req, res);
  await sesion.abrir(req, res, llave.usuario_id, 'completa');
  await anotar(req, 'acceso', { usuarioId: llave.usuario_id, detalle: { metodo: 'llave', llave: llave.nombre } });
  res.json({ ok: true });
});

// --- La sesión ---------------------------------------------------------------

r.get('/yo', sesion.exigir('contrasena'), async (req, res) => {
  const llaves = await llavesDe(req.usuario.id);
  res.json({
    usuario: publico(req.usuario),
    nivel: req.sesion.nivel,
    debe_cambiar: Boolean(req.usuario.debe_cambiar),
    tiene_llaves: llaves.length > 0,
  });
});

r.post('/salir', async (req, res) => {
  const s = await sesion.actual(req);
  if (s) await anotar(req, 'salida', { usuarioId: s.usuario.id });
  await sesion.cerrar(req, res);
  res.json({ ok: true });
});

r.post('/contrasena', sesion.exigir(), async (req, res) => {
  const u = req.usuario;
  const actual = texto(req.body.actual, 200);
  const nueva = texto(req.body.nueva, 200);
  if (!actual || !(await bcrypt.compare(actual, u.contrasena_hash))) {
    return res.status(401).json({ error: 'contrasena_incorrecta' });
  }
  if (!nueva || nueva.length < config.LARGO_MINIMO_CONTRASENA) {
    return res.status(400).json({ error: 'contrasena_corta', minimo: config.LARGO_MINIMO_CONTRASENA });
  }
  if (nueva === actual || nueva.includes(u.matricula)) return res.status(400).json({ error: 'contrasena_debil' });

  await db.ejecutar('UPDATE usuario SET contrasena_hash = ?, debe_cambiar = 0 WHERE id = ?', [
    await bcrypt.hash(nueva, 12),
    u.id,
  ]);
  await sesion.cerrarTodas(u.id, req.sesion.tokenHash);
  await anotar(req, 'contrasena_cambiada');
  res.json({ ok: true });
});

r.get('/llaves', sesion.exigir(), async (req, res) => {
  const filas = await db.filas(
    'SELECT id, nombre, creada_en, usada_en FROM credencial_web WHERE usuario_id = ? ORDER BY creada_en',
    [req.usuario.id],
  );
  res.json({ llaves: filas });
});

r.delete('/llaves/:id', sesion.exigir(), async (req, res) => {
  const propias = await llavesDe(req.usuario.id);
  if (!propias.some((c) => c.id === req.params.id)) return res.status(404).json({ error: 'no_existe' });
  if (propias.length === 1) return res.status(409).json({ error: 'es_la_ultima' });
  await db.ejecutar('DELETE FROM credencial_web WHERE id = ? AND usuario_id = ?', [req.params.id, req.usuario.id]);
  await anotar(req, 'llave_quitada');
  res.json({ ok: true });
});

module.exports = r;

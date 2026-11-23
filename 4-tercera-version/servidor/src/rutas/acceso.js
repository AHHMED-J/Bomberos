// Acceso y cuenta del usuario.
//
//   POST /api/acceso/entrar       número de empleado y contraseña → sesión
//   POST /api/acceso/reto         pide el reto para entrar con la biometría
//   POST /api/acceso/verificar    manda la firma del reto → sesión
//
// Con sesión (Authorization: Bearer <token>), sobre la propia cuenta:
//
//   POST /api/acceso/llave        registra la llave pública de su celular
//   POST /api/acceso/contrasena   cambia su contraseña
//   POST /api/acceso/trazo        sube o actualiza su firma en trazo (con su contraseña)

'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');

const db = require('../db');
const datos = require('../datos');
const firma = require('../firma');
const boveda = require('../boveda');
const notificaciones = require('../notificaciones');

const r = express.Router();

const LARGO_MINIMO_CONTRASENA = 8;

async function responderSesion(res, usuario, extra = {}) {
  const token = await datos.abrirSesion(usuario.id);
  res.json({ ok: true, ...extra, token, usuario: datos.usuarioPublico(usuario) });
}

// El número de empleado es la matrícula. El mensaje es el mismo si falla el
// número o la contraseña.
r.post('/entrar', async (req, res) => {
  const usuario = await db.fila('SELECT * FROM usuario WHERE matricula = ?', [String(req.body.no_empleado ?? '').trim()]);
  if (!usuario || !(await firma.contrasenaCorrecta(usuario, req.body.contrasena)) || !datos.puedeUsarLaApp(usuario)) {
    return res.status(401).json({ error: 'credenciales_incorrectas' });
  }
  await responderSesion(res, usuario);
});

r.post('/reto', async (req, res) => {
  if (!(await datos.usuarioCompleto(req.body.usuario_id))) return res.status(404).json({ error: 'usuario_desconocido' });
  res.json({ reto: await firma.nuevoReto('acceso') });
});

r.post('/verificar', async (req, res) => {
  const { usuario_id: id, reto, firma: f } = req.body;
  const usuario = await datos.usuarioCompleto(id);
  if (!usuario) return res.status(404).json({ error: 'usuario_desconocido' });
  if (!datos.puedeUsarLaApp(usuario)) return res.status(401).json({ error: 'credenciales_incorrectas' });
  if (!String(reto || '').endsWith(':acceso')) return res.status(401).json({ error: 'reto_desconocido' });

  const v = await firma.confirmar({ reto, firma: f, usuario });
  if (!v.ok) return res.status(401).json({ error: v.motivo });
  await responderSesion(res, usuario, { simulada: v.simulada });
});

// Un celular por usuario. Si ya tiene uno registrado, este no se registra y
// aquí confirma con su contraseña. (Cambiar de celular todavía no existe:
// por ahora Dirección borra la llave con `npm run usuario -- restablecer`.)
r.post('/llave', datos.exigirSesion, async (req, res) => {
  const llave = req.body.llave_publica;
  if (!llave || typeof llave !== 'string') return res.status(400).json({ error: 'falta_llave_publica' });

  const { affectedRows } = await db.ejecutar('UPDATE usuario SET llave_publica = ? WHERE id = ? AND llave_publica IS NULL', [
    llave,
    req.usuario.id,
  ]);
  if (affectedRows !== 1) return res.status(409).json({ error: 'ya_tiene_celular' });
  res.json({ ok: true });
});

r.post('/contrasena', datos.exigirSesion, async (req, res) => {
  const { actual, nueva } = req.body;
  if (!(await firma.contrasenaCorrecta(req.usuario, actual))) return res.status(401).json({ error: 'contrasena_incorrecta' });
  if (typeof nueva !== 'string' || nueva.length < LARGO_MINIMO_CONTRASENA) {
    return res.status(400).json({ error: 'contrasena_corta', minimo: LARGO_MINIMO_CONTRASENA });
  }
  await db.ejecutar('UPDATE usuario SET contrasena_hash = ? WHERE id = ?', [await bcrypt.hash(nueva, 12), req.usuario.id]);
  res.json({ ok: true });
});

// La firma en trazo del perfil. Se guarda cifrada (src/boveda.js) y se copia a
// cada parte que su dueño firma; los partes ya firmados conservan su copia, así
// que cambiarla aquí no los toca.
//
// Poner o cambiar la firma pide la contraseña: con una sesión robada o un
// teléfono prestado no se puede poner una firma ajena para firmar partes.
// Cada cambio queda en la bitácora y le llega un aviso a la propia persona.
const FORMATO_TRAZO = /^[0-9.,| -]+$/;
const MAXIMO_TRAZO = 60000;

r.post('/trazo', datos.exigirSesion, async (req, res) => {
  const { trazo, contrasena } = req.body;
  if (!trazo || typeof trazo !== 'string') return res.status(400).json({ error: 'falta_trazo' });
  if (trazo.length > MAXIMO_TRAZO || !FORMATO_TRAZO.test(trazo) || trazo.split(/[ |]/).length < 3) {
    return res.status(400).json({ error: 'trazo_invalido' });
  }
  if (!(await firma.contrasenaCorrecta(req.usuario, contrasena))) return res.status(401).json({ error: 'contrasena_incorrecta' });

  const tenia = Boolean(req.usuario.trazo);
  await db.transaccion(async (t) => {
    await t.ejecutar('UPDATE usuario SET trazo = ? WHERE id = ?', [boveda.cifrar(trazo, req.usuario.id), req.usuario.id]);
    await t.ejecutar('INSERT INTO bitacora (usuario_id, accion, objetivo, ip) VALUES (?, ?, ?, ?)', [
      req.usuario.id,
      tenia ? 'firma_cambiada' : 'firma_creada',
      req.usuario.matricula,
      String(req.ip || '').slice(0, 45),
    ]);
    await notificaciones.avisar(t, {
      usuarioId: req.usuario.id,
      tipo: 'firma_cambiada',
      titulo: tenia ? 'Cambiaste tu firma' : 'Guardaste tu firma',
      texto: 'Si no fuiste tú, avisa a Dirección y cambia tu contraseña.',
    });
  });
  res.json({ ok: true, usuario: await datos.usuarioPorId(req.usuario.id) });
});

module.exports = r;

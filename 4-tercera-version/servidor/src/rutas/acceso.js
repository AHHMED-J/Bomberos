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
//   POST /api/acceso/trazo        sube o actualiza su firma en trazo

'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');

const db = require('../db');
const datos = require('../datos');
const firma = require('../firma');
const { sesionesIa } = require('../de-la-app');

const r = express.Router();

const LARGO_MINIMO_CONTRASENA = 8;

async function responderSesion(res, usuario, extra = {}) {
  const token = await datos.abrirSesion(usuario.id);
  sesionesIa.set(token, usuario.id); // para que las rutas de la IA reconozcan la sesión
  res.json({ ok: true, ...extra, token, usuario: datos.usuarioPublico(usuario) });
}

// El número de empleado es la matrícula. El mensaje es el mismo si falla el
// número o la contraseña.
r.post('/entrar', async (req, res) => {
  const usuario = await db.fila('SELECT * FROM usuario WHERE matricula = ?', [String(req.body.no_empleado ?? '').trim()]);
  if (!usuario || !(await firma.contrasenaCorrecta(usuario, req.body.contrasena))) {
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

// Los partes ya firmados guardan su propia copia del trazo, así que
// actualizarlo aquí no los cambia.
r.post('/trazo', datos.exigirSesion, async (req, res) => {
  const trazo = req.body.trazo;
  if (!trazo || typeof trazo !== 'string') return res.status(400).json({ error: 'falta_trazo' });
  await db.ejecutar('UPDATE usuario SET trazo = ? WHERE id = ?', [trazo, req.usuario.id]);
  res.json({ ok: true, usuario: await datos.usuarioPorId(req.usuario.id) });
});

module.exports = r;

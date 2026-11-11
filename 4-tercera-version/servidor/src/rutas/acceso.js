// Acceso. Las mismas rutas y respuestas que app-bomberos/servidor:
//
//   GET  /api/acceso/codigo/:codigo   a quién pertenece un código de alta
//   POST /api/acceso/alta             registra la llave pública del celular
//   POST /api/acceso/reto             pide el reto para entrar
//   POST /api/acceso/verificar        manda la firma del reto y recibe la sesión
//
// Y una más, de las notas de la tercera versión (la app todavía no la usa):
//
//   POST /api/acceso/entrar           entrada manual: número de empleado y contraseña

'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');

const db = require('../db');
const datos = require('../datos');
const firma = require('../firma');
const { sesionesIa } = require('../de-la-app');

const r = express.Router();

async function codigoVigente(codigo) {
  const fila = await db.fila('SELECT codigo, usuario_id FROM codigo_alta WHERE codigo = ? AND usado_en IS NULL', [
    String(codigo || '').toUpperCase(),
  ]);
  return fila;
}

async function sesionNueva(usuarioId) {
  const token = await datos.abrirSesion(usuarioId);
  sesionesIa.set(token, usuarioId);
  return token;
}

r.get('/codigo/:codigo', async (req, res) => {
  const c = await codigoVigente(req.params.codigo);
  if (!c) return res.status(404).json({ error: 'codigo_invalido' });
  res.json({ usuario: await datos.usuarioPorId(c.usuario_id) });
});

r.post('/alta', async (req, res) => {
  const { codigo, llave_publica: llave } = req.body;
  const c = await codigoVigente(codigo);
  if (!c) return res.status(404).json({ error: 'codigo_invalido' });
  if (!llave || typeof llave !== 'string') return res.status(400).json({ error: 'falta_llave_publica' });

  // El código se gasta y la llave se guarda juntos. Las llaves anteriores
  // del usuario se quedan: dar de alta otro celular no desactiva el primero.
  const gastado = await db.transaccion(async (t) => {
    const { affectedRows } = await t.ejecutar('UPDATE codigo_alta SET usado_en = NOW() WHERE codigo = ? AND usado_en IS NULL', [
      c.codigo,
    ]);
    if (affectedRows === 1) {
      await t.ejecutar('INSERT INTO llave (usuario_id, llave_publica) VALUES (?, ?)', [c.usuario_id, llave]);
    }
    return affectedRows === 1;
  });
  if (!gastado) return res.status(404).json({ error: 'codigo_invalido' });

  res.json({ usuario: await datos.usuarioPorId(c.usuario_id) });
});

r.post('/reto', async (req, res) => {
  if (!(await datos.usuarioPorId(req.body.usuario_id))) return res.status(404).json({ error: 'usuario_desconocido' });
  res.json({ reto: await firma.nuevoReto('acceso') });
});

r.post('/verificar', async (req, res) => {
  const { usuario_id: id, reto, firma: f } = req.body;
  const u = await datos.usuarioPorId(id);
  if (!u) return res.status(404).json({ error: 'usuario_desconocido' });
  if (!String(reto || '').endsWith(':acceso')) return res.status(401).json({ error: 'reto_desconocido' });

  const v = await firma.verificar({ reto, firma: f, llaves: await datos.llavesDe(u.id) });
  if (!v.ok) return res.status(401).json({ error: v.motivo });

  res.json({ ok: true, simulada: v.simulada, token: await sesionNueva(u.id), usuario: u });
});

// Entrada manual. El número de empleado es la matrícula. El mensaje es el
// mismo si falla el número o la contraseña.
r.post('/entrar', async (req, res) => {
  const fila = await db.fila('SELECT id, contrasena_hash FROM usuario WHERE matricula = ?', [
    String(req.body.no_empleado ?? '').trim(),
  ]);
  const contrasena = req.body.contrasena;
  const coincide =
    fila && fila.contrasena_hash && typeof contrasena === 'string' && (await bcrypt.compare(contrasena, fila.contrasena_hash));
  if (!coincide) return res.status(401).json({ error: 'credenciales_incorrectas' });

  res.json({ ok: true, token: await sesionNueva(fila.id), usuario: await datos.usuarioPorId(fila.id) });
});

module.exports = r;

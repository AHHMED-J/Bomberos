// Avisos: lo que le pasó a un parte, para quien le importa.
//
//   parte_por_revisar   → los capitanes de la división (llegó un parte, o uno corregido)
//   parte_devuelto      → quien lo elaboró (con la nota del capitán)
//   parte_validado      → quien lo elaboró, y Administración (llegó a la página web)
//   firma_cambiada      → la propia persona (por si no fue ella)
//
// Se guardan en la tabla `notificacion`, uno por destinatario. Quien los lee
// (app o página web) sólo ve los suyos: la sesión decide de quién son.
// Los avisos se crean dentro de la misma transacción que el cambio del parte:
// si el parte no se guarda, tampoco se avisa.

'use strict';

const express = require('express');

const db = require('./db');

const MAXIMO = 50;

function avisar(conexion, { usuarioId, tipo, folio = null, titulo, texto = '' }) {
  return conexion.ejecutar('INSERT INTO notificacion (usuario_id, tipo, folio, titulo, texto) VALUES (?, ?, ?, ?, ?)', [
    usuarioId,
    tipo,
    folio,
    String(titulo).slice(0, 120),
    String(texto).slice(0, 400),
  ]);
}

async function avisarA(conexion, ids, datos) {
  for (const usuarioId of ids) await avisar(conexion, { ...datos, usuarioId });
}

async function avisarACapitanes(conexion, division, exceptoId, datos) {
  const filas = await conexion.filas("SELECT id FROM usuario WHERE rol = 'capitan' AND activo = 1 AND division = ? AND id <> ?", [
    division,
    exceptoId,
  ]);
  await avisarA(conexion, filas.map((f) => f.id), datos);
}

async function avisarAAdministracion(conexion, datos) {
  const filas = await conexion.filas("SELECT id FROM usuario WHERE rol = 'administracion' AND activo = 1");
  await avisarA(conexion, filas.map((f) => f.id), datos);
}

// Las rutas son las mismas en la app y en la página web; cambia sólo cómo se
// pide la sesión (`exigir`). Siempre sobre los avisos de req.usuario.
//
//   GET  /            los últimos y cuántos faltan por leer
//   POST /leidas      los marca todos
//   POST /:id/leida   marca uno
function rutas(exigir) {
  const r = express.Router();
  r.use(exigir);

  r.get('/', async (req, res) => {
    const filas = await db.filas(
      'SELECT id, tipo, folio, titulo, texto, creada_en, leida_en FROM notificacion WHERE usuario_id = ? ORDER BY id DESC LIMIT ?',
      [req.usuario.id, MAXIMO],
    );
    const { n } = await db.fila('SELECT COUNT(*) AS n FROM notificacion WHERE usuario_id = ? AND leida_en IS NULL', [
      req.usuario.id,
    ]);
    res.json({
      notificaciones: filas.map(({ leida_en: leida, ...f }) => ({ ...f, leida: leida != null })),
      sin_leer: n,
    });
  });

  r.post('/leidas', async (req, res) => {
    await db.ejecutar('UPDATE notificacion SET leida_en = NOW() WHERE usuario_id = ? AND leida_en IS NULL', [req.usuario.id]);
    res.json({ ok: true });
  });

  r.post('/:id/leida', async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isSafeInteger(id)) return res.status(400).json({ error: 'id_invalido' });
    await db.ejecutar('UPDATE notificacion SET leida_en = NOW() WHERE id = ? AND usuario_id = ? AND leida_en IS NULL', [
      id,
      req.usuario.id,
    ]);
    res.json({ ok: true });
  });

  return r;
}

module.exports = { avisar, avisarA, avisarACapitanes, avisarAAdministracion, rutas };

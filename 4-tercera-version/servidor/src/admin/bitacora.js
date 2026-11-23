// Bitácora de Administración: quién hizo qué, cuándo y desde dónde.
// Nunca guarda contraseñas ni tokens.

'use strict';

const db = require('../db');
const { ipDe } = require('./sesion');

function anotar(req, accion, { usuarioId, objetivo, detalle } = {}) {
  return db.ejecutar('INSERT INTO bitacora (usuario_id, accion, objetivo, detalle, ip) VALUES (?, ?, ?, ?, ?)', [
    usuarioId ?? req.usuario?.id ?? null,
    accion,
    objetivo == null ? null : String(objetivo).slice(0, 80),
    detalle == null ? null : JSON.stringify(detalle),
    ipDe(req),
  ]);
}

module.exports = { anotar };

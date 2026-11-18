// La bitácora, de lo más nuevo a lo más viejo. Sólo lectura.
//
//   GET /?pagina=&accion=

'use strict';

const express = require('express');

const db = require('../../db');

const r = express.Router();
const POR_PAGINA = 50;

r.get('/', async (req, res) => {
  const pagina = Math.max(1, Math.min(10000, Number.parseInt(req.query.pagina, 10) || 1));
  const accion = typeof req.query.accion === 'string' && /^[a-z_]{1,60}$/.test(req.query.accion) ? req.query.accion : null;
  const where = accion ? 'WHERE b.accion = ?' : '';
  const valores = accion ? [accion] : [];
  const filas = await db.filas(
    `SELECT b.id, b.accion, b.objetivo, b.detalle, b.ip, b.creada_en, u.nombre, u.matricula
       FROM bitacora b LEFT JOIN usuario u ON u.id = b.usuario_id
       ${where} ORDER BY b.id DESC LIMIT ? OFFSET ?`,
    [...valores, POR_PAGINA, (pagina - 1) * POR_PAGINA],
  );
  const { total } = await db.fila(`SELECT COUNT(*) AS total FROM bitacora b ${where}`, valores);
  res.json({ registros: filas, total, pagina, por_pagina: POR_PAGINA });
});

module.exports = r;

// Los partes, vistos por Administración (RF-10 y RF-14). Sólo lectura: aquí
// nadie edita un parte.
//
//   GET /                 lista con filtros (estado, desde, hasta, tipo, unidad, division, texto, pagina)
//   GET /opciones         los tipos, unidades y divisiones que existen, para los filtros
//   GET /exportar         la misma lista, en CSV
//   GET /:folio           el parte completo y la evidencia de sus firmas
//   GET /:folio/adjuntos/:hash   una foto o el croquis del parte
//   GET /:folio/sello     «Verificar sello»: lo vuelve a sacar y lo compara (y las imágenes)

'use strict';

const express = require('express');

const db = require('../../db');
const datos = require('../../datos');
const adjuntos = require('../../adjuntos');
const { calcularSello } = require('../../sello');
const { anotar } = require('../bitacora');

const r = express.Router();

const ESTADOS = ['enviado', 'devuelto', 'validado'];
const POR_PAGINA = 25;
const MAXIMO_EXPORTAR = 5000;

// Un campo de la hoja dentro del JSON del parte.
const campo = (id) => `JSON_UNQUOTE(JSON_EXTRACT(datos, '$.campos.${id}.valor'))`;
const FECHA = `STR_TO_DATE(${campo('fecha')}, '%d/%m/%Y')`;

const fechaValida = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const corto = (v) => (typeof v === 'string' && v.trim() && v.length <= 120 ? v.trim() : null);

// Arma el WHERE con los filtros de la consulta. Los valores siempre van como ?.
function filtros(q) {
  const condiciones = [];
  const valores = [];

  const estado = q.estado === 'todos' ? null : ESTADOS.includes(q.estado) ? q.estado : 'validado';
  if (estado) {
    condiciones.push('estado = ?');
    valores.push(estado);
  } else {
    condiciones.push(`estado IN (${ESTADOS.map(() => '?').join(', ')})`);
    valores.push(...ESTADOS);
  }
  if (fechaValida(q.desde)) {
    condiciones.push(`${FECHA} >= ?`);
    valores.push(q.desde);
  }
  if (fechaValida(q.hasta)) {
    condiciones.push(`${FECHA} <= ?`);
    valores.push(q.hasta);
  }
  for (const [param, id] of [
    ['tipo', 'tipo_servicio'],
    ['unidad', 'unidad'],
  ]) {
    if (corto(q[param])) {
      condiciones.push(`${campo(id)} = ?`);
      valores.push(corto(q[param]));
    }
  }
  if (corto(q.division)) {
    condiciones.push('division = ?');
    valores.push(corto(q.division));
  }
  if (corto(q.texto)) {
    const like = `%${corto(q.texto).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    condiciones.push(
      `(folio LIKE ? OR ${campo('lugar_servicio')} LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(datos, '$.elaboro_nombre')) LIKE ?)`,
    );
    valores.push(like, like, like);
  }
  return { where: `WHERE ${condiciones.join(' AND ')}`, valores };
}

// Lo que cabe en un renglón de la tabla.
function resumen(p) {
  const c = p.campos || {};
  const v = (id) => c[id]?.valor || '';
  return {
    folio: p.folio,
    estado: p.estado,
    fecha: v('fecha'),
    tipo: v('tipo_servicio'),
    unidad: v('unidad'),
    turno: v('turno'),
    estacion: v('estacion'),
    division: p.division || '',
    lugar: v('lugar_servicio'),
    elaboro: p.elaboro_nombre || '',
    reviso: p.firmas?.revisor_nombre || '',
    enviado_en: p.enviado_en || null,
    validado_en: p.validado_en || null,
    sello: p.sello || null,
  };
}

async function buscar(q, limite, desplazamiento) {
  const { where, valores } = filtros(q);
  const filas = await db.filas(
    `SELECT datos FROM parte ${where} ORDER BY ${FECHA} DESC, folio DESC LIMIT ? OFFSET ?`,
    [...valores, limite, desplazamiento],
  );
  const { total } = await db.fila(`SELECT COUNT(*) AS total FROM parte ${where}`, valores);
  return { partes: filas.map((f) => resumen(f.datos)), total };
}

r.get('/', async (req, res) => {
  const pagina = Math.max(1, Math.min(10000, Number.parseInt(req.query.pagina, 10) || 1));
  const { partes, total } = await buscar(req.query, POR_PAGINA, (pagina - 1) * POR_PAGINA);
  res.json({ partes, total, pagina, por_pagina: POR_PAGINA });
});

r.get('/opciones', async (_req, res) => {
  const distintos = async (expresion) =>
    (
      await db.filas(
        `SELECT DISTINCT ${expresion} AS valor FROM parte WHERE ${expresion} IS NOT NULL AND ${expresion} <> '' ORDER BY valor`,
      )
    ).map((f) => f.valor);
  res.json({
    tipos: await distintos(campo('tipo_servicio')),
    unidades: await distintos(campo('unidad')),
    divisiones: await distintos('division'),
  });
});

// Una celda de CSV. Si empieza con = + - @ (o tabulador), Excel la tomaría
// como fórmula: se le antepone un apóstrofo para que sea sólo texto.
function celda(valor) {
  let t = valor == null ? '' : String(valor);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[",\n\r;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

const COLUMNAS = [
  ['folio', 'Folio'],
  ['estado', 'Estado'],
  ['fecha', 'Fecha'],
  ['tipo', 'Tipo de servicio'],
  ['unidad', 'Unidad'],
  ['turno', 'Turno'],
  ['estacion', 'Estación'],
  ['division', 'División'],
  ['lugar', 'Lugar'],
  ['elaboro', 'Elaboró'],
  ['reviso', 'Revisó'],
  ['validado_en', 'Validado en'],
  ['sello', 'Sello SHA-256'],
];

r.get('/exportar', async (req, res) => {
  const { partes, total } = await buscar(req.query, MAXIMO_EXPORTAR, 0);
  const lineas = [COLUMNAS.map(([, t]) => celda(t)).join(',')];
  for (const p of partes) lineas.push(COLUMNAS.map(([k]) => celda(p[k])).join(','));

  const filtrosUsados = Object.fromEntries(
    ['estado', 'desde', 'hasta', 'tipo', 'unidad', 'division', 'texto']
      .filter((k) => typeof req.query[k] === 'string' && req.query[k])
      .map((k) => [k, String(req.query[k]).slice(0, 120)]),
  );
  await anotar(req, 'exportacion', { detalle: { filtros: filtrosUsados, renglones: partes.length, total } });

  const hoy = new Date().toISOString().slice(0, 10);
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="partes-${hoy}.csv"`);
  // El BOM hace que Excel lea bien los acentos.
  res.send(`﻿${lineas.join('\r\n')}\r\n`);
});

const folioValido = (f) => /^[A-Z0-9-]{1,20}$/.test(f);

r.get('/:folio', async (req, res) => {
  if (!folioValido(req.params.folio)) return res.status(404).json({ error: 'no_existe' });
  const parte = await datos.partePorFolio(req.params.folio);
  if (!parte) return res.status(404).json({ error: 'no_existe' });
  // La evidencia de cada firma, sin la firma criptográfica en sí.
  const firmas = await db.filas(
    `SELECT f.rol, f.metodo, f.simulada, f.firmada_en, u.nombre, u.matricula
       FROM firma_parte f LEFT JOIN usuario u ON u.id = f.usuario_id
      WHERE f.folio = ? ORDER BY f.firmada_en, f.id`,
    [parte.folio],
  );
  await anotar(req, 'parte_consultado', { objetivo: parte.folio });
  res.json({ parte, firmas: firmas.map((f) => ({ ...f, simulada: Boolean(f.simulada) })) });
});

r.get('/:folio/adjuntos/:sha256', async (req, res) => {
  if (!folioValido(req.params.folio)) return res.status(404).json({ error: 'no_existe' });
  const fila = await adjuntos.buscar(req.params.folio, req.params.sha256);
  if (!fila) return res.status(404).json({ error: 'no_existe' });
  adjuntos.servir(res, fila);
});

r.get('/:folio/sello', async (req, res) => {
  if (!folioValido(req.params.folio)) return res.status(404).json({ error: 'no_existe' });
  const parte = await datos.partePorFolio(req.params.folio);
  if (!parte) return res.status(404).json({ error: 'no_existe' });
  if (!parte.sello) return res.status(409).json({ error: 'sin_sello' });
  const calculado = calcularSello(parte);
  // Además del contenido, que las imágenes guardadas sigan siendo las que se firmaron.
  const imagenes = await adjuntos.integras(parte.folio, parte.adjuntos);
  const coincide = calculado === parte.sello && imagenes;
  await anotar(req, 'sello_verificado', { objetivo: parte.folio, detalle: { coincide, imagenes_integras: imagenes } });
  res.json({ folio: parte.folio, sello: parte.sello, calculado, coincide, imagenes_integras: imagenes });
});

module.exports = r;

// El revisor (capitán). Las mismas rutas y respuestas que
// app-bomberos/servidor:
//
//   GET  /api/revision/bandeja?division=…   los partes de su división
//   POST /api/revision/:folio/devolver      lo regresa con una nota
//   POST /api/revision/:folio/validar       lo firma (llave del celular + trazo) y lo sella

'use strict';

const express = require('express');

const db = require('../db');
const datos = require('../datos');
const firma = require('../firma');
const { contenidoParaFirmar, hashContenido, sha256 } = require('../de-la-app').validacion;

const r = express.Router();

r.get('/bandeja', async (req, res) => {
  const division = String(req.query.division || datos.DIVISION);
  res.json({ partes: await datos.partesDonde('WHERE division = ?', [division]) });
});

r.post('/:folio/devolver', async (req, res) => {
  const p = await datos.partePorFolio(req.params.folio);
  if (!p) return res.status(404).json({ error: 'no_existe' });
  if (!String(req.body.nota || '').trim()) return res.status(400).json({ error: 'falta_nota' });

  const revisor = await datos.usuarioPorId(req.body.revisor_id);
  const devuelto = {
    ...p,
    estado: 'devuelto',
    nota: {
      texto: req.body.nota,
      seccion: req.body.seccion || 'Datos del servicio',
      revisor: revisor?.nombre || '?',
      fecha: new Date().toISOString(),
    },
  };
  await datos.guardarParte(devuelto);
  res.json({ parte: devuelto });
});

r.post('/:folio/validar', async (req, res) => {
  const p = await datos.partePorFolio(req.params.folio);
  if (!p) return res.status(404).json({ error: 'no_existe' });
  const { reto, firma: f, trazo, revisor_id: revisorId } = req.body;
  if (!trazo) return res.status(400).json({ error: 'falta_trazo' });

  // Reglas de las notas de la tercera versión: valida un revisor, y nunca
  // quien llenó el parte.
  const revisor = await datos.usuarioPorId(revisorId);
  if (!revisor || revisor.rol !== 'capitan') return res.status(403).json({ error: 'no_es_revisor' });
  if (revisor.id === p.elaboro_id) return res.status(403).json({ error: 'es_su_parte' });

  const hash = hashContenido(contenidoParaFirmar(p));
  if (String(reto || '').split(':')[1] !== hash) return res.status(409).json({ error: 'contenido_cambio' });

  const v = await firma.verificar({ reto, firma: f, llaves: await datos.llavesDe(revisor.id) });
  if (!v.ok) return res.status(401).json({ error: v.motivo });

  // Sello: contenido + firma del celular + trazo.
  const sello = sha256(`${hash}|${f}|${sha256(trazo)}`);
  const validado = { ...p, estado: 'validado', sello };
  await db.transaccion(async (t) => {
    await datos.guardarParte(validado, t);
    await t.ejecutar(
      'INSERT INTO firma_parte (folio, usuario_id, rol, reto, firma, simulada, trazo) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [validado.folio, revisor.id, 'revisor', reto, f, v.simulada ? 1 : 0, trazo],
    );
  });
  res.json({ parte: validado });
});

module.exports = r;

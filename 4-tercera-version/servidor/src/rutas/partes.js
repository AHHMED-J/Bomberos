// Partes de quien los elabora. Las mismas rutas y respuestas que
// app-bomberos/servidor:
//
//   POST /api/partes/folio          un folio nuevo
//   GET  /api/partes?usuario=…      los partes de un usuario
//   POST /api/partes/:folio/reto    el reto para firmar (lleva el hash del contenido)
//   POST /api/partes/:folio/enviar  revisa, comprueba la firma y manda a revisión

'use strict';

const express = require('express');

const db = require('../db');
const datos = require('../datos');
const firma = require('../firma');
const { pendientes, contenidoParaFirmar, hashContenido } = require('../de-la-app').validacion;

const r = express.Router();

r.post('/folio', async (_req, res) => res.json({ folio: await datos.nuevoFolio() }));

r.get('/', async (req, res) => {
  const partes = req.query.usuario
    ? await datos.partesDonde('WHERE elaboro_id = ?', [String(req.query.usuario)])
    : await datos.partesDonde('', []);
  res.json({ partes });
});

// Reto = azar + ':' + SHA-256 del contenido. La firma queda ligada a ese
// contenido exacto.
r.post('/:folio/reto', async (req, res) => {
  if (!req.body.contenido) return res.status(400).json({ error: 'falta_contenido' });
  const hash = hashContenido(req.body.contenido);
  res.json({ reto: await firma.nuevoReto(hash), hash });
});

r.post('/:folio/enviar', async (req, res) => {
  const { parte, reto, firma: f } = req.body;
  if (!parte || parte.folio !== req.params.folio) return res.status(400).json({ error: 'parte_invalido' });

  // Después de enviarlo, quien lo llenó solo lo ve, a menos que se lo
  // devuelvan (notas de la tercera versión).
  const anterior = await datos.partePorFolio(parte.folio);
  if (anterior && !['borrador', 'devuelto'].includes(anterior.estado)) {
    return res.status(409).json({ error: 'ya_enviado' });
  }

  // 1) Nada sin confirmar ni obligatorio vacío.
  const faltan = pendientes(parte);
  if (faltan.length) return res.status(422).json({ error: 'pendientes', pendientes: faltan });

  // 2) El contenido que llega es el mismo que se firmó.
  const hash = hashContenido(contenidoParaFirmar(parte));
  if (String(reto || '').split(':')[1] !== hash) return res.status(409).json({ error: 'contenido_cambio' });

  // 3) La firma corresponde a una llave de quien elabora.
  const v = await firma.verificar({ reto, firma: f, llaves: await datos.llavesDe(parte.elaboro_id) });
  if (!v.ok) return res.status(401).json({ error: v.motivo });

  const ahora = new Date().toISOString();
  const guardado = { ...parte, creado_en: parte.creado_en || ahora, estado: 'enviado', enviado_en: ahora, nota: null };
  await db.transaccion(async (t) => {
    await datos.guardarParte(guardado, t);
    await t.ejecutar('INSERT INTO firma_parte (folio, usuario_id, rol, reto, firma, simulada) VALUES (?, ?, ?, ?, ?, ?)', [
      guardado.folio,
      guardado.elaboro_id,
      'autor',
      reto,
      f,
      v.simulada ? 1 : 0,
    ]);
  });
  res.json({ parte: guardado, firma_simulada: !!v.simulada });
});

module.exports = r;

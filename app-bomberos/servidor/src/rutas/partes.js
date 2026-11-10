// Partes de quien los elabora: folio, lista, reto de firma y envío (con la misma validación que la app).
const express = require('express');
const datos = require('../datos');
const firma = require('../firma');
const { pendientes, contenidoParaFirmar, hashContenido } = require('../validacion');

const r = express.Router();

r.post('/folio', (_req, res) => res.json({ folio: datos.nuevoFolio() }));

r.get('/', (req, res) => {
  const lista = [...datos.partes.values()].filter((p) => !req.query.usuario || p.elaboro_id === req.query.usuario);
  res.json({ partes: lista });
});

// Reto = azar + ':' + SHA-256 del contenido. La firma queda ligada a ese contenido exacto.
r.post('/:folio/reto', (req, res) => {
  if (!req.body.contenido) return res.status(400).json({ error: 'falta_contenido' });
  const hash = hashContenido(req.body.contenido);
  res.json({ reto: firma.nuevoReto(hash), hash });
});

r.post('/:folio/enviar', (req, res) => {
  const { parte, reto, firma: f } = req.body;
  if (!parte || parte.folio !== req.params.folio) return res.status(400).json({ error: 'parte_invalido' });

  // 1) Nada sin confirmar ni obligatorio vacío (decisión del 8 de noviembre: lo revisa el servidor).
  const faltan = pendientes(parte);
  if (faltan.length) return res.status(422).json({ error: 'pendientes', pendientes: faltan });

  // 2) El contenido que llega es el mismo que se firmó.
  const hash = hashContenido(contenidoParaFirmar(parte));
  if (String(reto || '').split(':')[1] !== hash) return res.status(409).json({ error: 'contenido_cambio' });

  // 3) La firma corresponde a la llave de quien elabora.
  const v = firma.verificar({ reto, firma: f, llavePublica: datos.llaves.get(parte.elaboro_id) });
  if (!v.ok) return res.status(401).json({ error: v.motivo });

  const ahora = new Date().toISOString();
  const guardado = { ...parte, creado_en: parte.creado_en || ahora, estado: 'enviado', enviado_en: ahora, nota: null };
  datos.partes.set(parte.folio, guardado);
  res.json({ parte: guardado, firma_simulada: !!v.simulada });
});

module.exports = r;

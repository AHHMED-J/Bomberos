// Capitán (revisor): bandeja de su división, devolver con nota, firmar (credencial + trazo) y validar.
const express = require('express');
const datos = require('../datos');
const firma = require('../firma');
const { contenidoParaFirmar, hashContenido, sha256 } = require('../validacion');

const r = express.Router();

r.get('/bandeja', (req, res) => {
  const division = req.query.division || datos.DIVISION;
  res.json({ partes: [...datos.partes.values()].filter((p) => p.division === division) });
});

r.post('/:folio/devolver', (req, res) => {
  const p = datos.partes.get(req.params.folio);
  if (!p) return res.status(404).json({ error: 'no_existe' });
  if (!String(req.body.nota || '').trim()) return res.status(400).json({ error: 'falta_nota' });
  const revisor = datos.usuarios.find((u) => u.id === req.body.revisor_id);
  const devuelto = {
    ...p,
    estado: 'devuelto',
    nota: { texto: req.body.nota, seccion: req.body.seccion || 'Datos del servicio', revisor: revisor?.nombre || '?', fecha: new Date().toISOString() },
  };
  datos.partes.set(p.folio, devuelto);
  res.json({ parte: devuelto });
});

r.post('/:folio/validar', (req, res) => {
  const p = datos.partes.get(req.params.folio);
  if (!p) return res.status(404).json({ error: 'no_existe' });
  const { reto, firma: f, trazo, revisor_id: revisorId } = req.body;
  if (!trazo) return res.status(400).json({ error: 'falta_trazo' });
  const hash = hashContenido(contenidoParaFirmar(p));
  if (String(reto || '').split(':')[1] !== hash) return res.status(409).json({ error: 'contenido_cambio' });
  const v = firma.verificar({ reto, firma: f, llavePublica: datos.llaves.get(revisorId) });
  if (!v.ok) return res.status(401).json({ error: v.motivo });
  // Sello: contenido + firma de credencial + trazo. Resguardo de 10 años (TODO: archivo y PDF).
  const sello = sha256(`${hash}|${f}|${sha256(trazo)}`);
  const validado = { ...p, estado: 'validado', sello };
  datos.partes.set(p.folio, validado);
  res.json({ parte: validado });
});

module.exports = r;

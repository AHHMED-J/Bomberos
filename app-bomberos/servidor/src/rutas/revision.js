// El revisor (capitán).
//
//   GET  /api/revision/bandeja?division=…   los partes de su división
//   POST /api/revision/:folio/devolver      lo regresa con una nota
//   POST /api/revision/:folio/validar       lo firma, lo sella y queda enviado a Dirección

'use strict';

const express = require('express');

const db = require('../db');
const datos = require('../datos');
const firma = require('../firma');
const { calcularSello } = require('../sello');
const { contenidoParaFirmar, hashContenido } = require('../validacion');

const r = express.Router();

r.get('/bandeja', async (req, res) => {
  const division = String(req.query.division || datos.DIVISION);
  res.json({ partes: await datos.partesDonde('WHERE division = ?', [division]) });
});

// Un parte devuelto no se sella. Quien lo llenó lo corrige y vuelve a firmar.
r.post('/:folio/devolver', async (req, res) => {
  const p = await datos.partePorFolio(req.params.folio);
  if (!p) return res.status(404).json({ error: 'no_existe' });
  if (!String(req.body.nota || '').trim()) return res.status(400).json({ error: 'falta_nota' });
  if (p.estado !== 'enviado') return res.status(409).json({ error: 'no_espera_revision' });

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

// Llega el reto y la confirmación del revisor: firma (biometría del celular)
// o contrasena. Su trazo es el que tiene guardado en su cuenta.
r.post('/:folio/validar', async (req, res) => {
  const p = await datos.partePorFolio(req.params.folio);
  if (!p) return res.status(404).json({ error: 'no_existe' });
  if (p.estado !== 'enviado') return res.status(409).json({ error: 'no_espera_revision' });
  const { reto, firma: f, contrasena, revisor_id: revisorId } = req.body;

  // Valida un revisor de la división del parte, y nunca quien lo llenó.
  const revisor = await datos.usuarioCompleto(revisorId);
  if (!revisor || revisor.rol !== 'capitan') return res.status(403).json({ error: 'no_es_revisor' });
  if (revisor.id === p.elaboro_id) return res.status(403).json({ error: 'es_su_parte' });
  if (revisor.division !== p.division) return res.status(403).json({ error: 'otra_division' });
  if (!revisor.trazo) return res.status(409).json({ error: 'falta_trazo' });

  const hash = hashContenido(contenidoParaFirmar(p));
  if (String(reto || '').split(':')[1] !== hash) return res.status(409).json({ error: 'contenido_cambio' });

  const v = await firma.confirmar({ reto, firma: f, contrasena, usuario: revisor });
  if (!v.ok) return res.status(401).json({ error: v.motivo });

  const validado = {
    ...p,
    estado: 'validado',
    validado_en: new Date().toISOString(),
    firmas: {
      ...p.firmas,
      revisor_id: revisor.id,
      revisor_nombre: revisor.nombre,
      revisor: v.metodo === 'biometria' ? f : 'contrasena',
      revisor_simulada: v.simulada,
      revisor_trazo: revisor.trazo,
    },
  };
  validado.sello = calcularSello(validado);

  await db.transaccion(async (t) => {
    await datos.guardarParte(validado, t);
    await datos.guardarFirma(t, {
      folio: validado.folio,
      usuarioId: revisor.id,
      rol: 'revisor',
      reto,
      confirmacion: v,
      firma: f,
      trazo: revisor.trazo,
    });
  });
  res.json({ parte: validado });
});

module.exports = r;

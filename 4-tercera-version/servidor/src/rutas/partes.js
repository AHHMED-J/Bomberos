// Partes de quien los elabora.
//
//   POST /api/partes/folio          un folio nuevo
//   GET  /api/partes?usuario=…      los partes de un usuario
//   POST /api/partes/:folio/reto    el reto para firmar (lleva el hash del contenido)
//   POST /api/partes/:folio/enviar  revisa, confirma a quien firma y manda a revisión
//   GET  /api/partes/:folio/sello   «Verificar sello»: lo vuelve a sacar y lo compara

'use strict';

const express = require('express');

const db = require('../db');
const datos = require('../datos');
const firma = require('../firma');
const { calcularSello } = require('../sello');
const { pendientes, contenidoParaFirmar, hashContenido } = require('../de-la-app').validacion;

const r = express.Router();

r.post('/folio', async (_req, res) => res.json({ folio: await datos.nuevoFolio() }));

r.get('/', async (req, res) => {
  const partes = req.query.usuario
    ? await datos.partesDonde('WHERE elaboro_id = ?', [String(req.query.usuario)])
    : await datos.partesDonde('', []);
  res.json({ partes });
});

// Reto = azar + ':' + SHA-256 del contenido. La confirmación queda ligada a
// ese contenido exacto.
r.post('/:folio/reto', async (req, res) => {
  if (!req.body.contenido) return res.status(400).json({ error: 'falta_contenido' });
  const hash = hashContenido(req.body.contenido);
  res.json({ reto: await firma.nuevoReto(hash), hash });
});

// Llega el parte, el reto y la confirmación: firma (biometría del celular) o
// contrasena.
r.post('/:folio/enviar', async (req, res) => {
  const { parte, reto, firma: f, contrasena } = req.body;
  if (!parte || parte.folio !== req.params.folio) return res.status(400).json({ error: 'parte_invalido' });

  // Después de enviarlo, quien lo llenó solo lo ve, a menos que se lo devuelvan.
  const anterior = await datos.partePorFolio(parte.folio);
  if (anterior && !['borrador', 'devuelto'].includes(anterior.estado)) {
    return res.status(409).json({ error: 'ya_enviado' });
  }

  // 1) Nada sin confirmar ni obligatorio vacío.
  const faltan = pendientes(parte);
  if (faltan.length) return res.status(422).json({ error: 'pendientes', pendientes: faltan });

  // 2) El contenido que llega es el mismo que se confirmó.
  const hash = hashContenido(contenidoParaFirmar(parte));
  if (String(reto || '').split(':')[1] !== hash) return res.status(409).json({ error: 'contenido_cambio' });

  // 3) Quien lo elabora tiene su firma en trazo y confirma que es él.
  const autor = await datos.usuarioCompleto(parte.elaboro_id);
  if (!autor) return res.status(404).json({ error: 'usuario_desconocido' });
  if (!autor.trazo) return res.status(409).json({ error: 'falta_trazo' });
  const v = await firma.confirmar({ reto, firma: f, contrasena, usuario: autor });
  if (!v.ok) return res.status(401).json({ error: v.motivo });

  // El parte se queda con una copia del trazo: si el usuario lo cambia
  // después, este parte no cambia.
  const ahora = new Date().toISOString();
  const guardado = {
    ...parte,
    creado_en: parte.creado_en || ahora,
    estado: 'enviado',
    enviado_en: ahora,
    nota: null,
    firmas: {
      ...parte.firmas,
      elaboro: v.metodo === 'biometria' ? f : 'contrasena',
      elaboro_simulada: v.simulada,
      elaboro_trazo: autor.trazo,
    },
  };
  await db.transaccion(async (t) => {
    await datos.guardarParte(guardado, t);
    await datos.guardarFirma(t, {
      folio: guardado.folio,
      usuarioId: autor.id,
      rol: 'autor',
      reto,
      confirmacion: v,
      firma: f,
      trazo: autor.trazo,
    });
  });
  res.json({ parte: guardado, firma_simulada: v.simulada });
});

r.get('/:folio/sello', async (req, res) => {
  const parte = await datos.partePorFolio(req.params.folio);
  if (!parte) return res.status(404).json({ error: 'no_existe' });
  if (!parte.sello) return res.status(409).json({ error: 'sin_sello' });
  const calculado = calcularSello(parte);
  res.json({ folio: parte.folio, sello: parte.sello, calculado, coincide: calculado === parte.sello });
});

module.exports = r;

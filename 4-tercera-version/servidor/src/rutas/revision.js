// El revisor (capitán). Todas las rutas piden sesión de un capitán: quién revisa
// lo decide la sesión, no el cuerpo de la petición (`revisor_id`, si llega, debe ser el mismo).
//
//   GET  /api/revision/bandeja              los partes de su división
//   POST /api/revision/:folio/devolver      lo regresa con una nota
//   POST /api/revision/:folio/validar       lo firma, lo sella y queda enviado a Dirección

'use strict';

const express = require('express');

const db = require('../db');
const datos = require('../datos');
const firma = require('../firma');
const notificaciones = require('../notificaciones');
const { calcularSello } = require('../sello');
const { contenidoParaFirmar, hashContenido } = require('../validacion');

const r = express.Router();

r.use(datos.exigirSesion, (req, res, siguiente) => {
  if (req.usuario.rol !== 'capitan') return res.status(403).json({ error: 'no_es_revisor' });
  const dice = req.body?.revisor_id;
  if (dice !== undefined && dice !== req.usuario.id) return res.status(403).json({ error: 'no_es_tu_cuenta' });
  siguiente();
});

// Sólo la división del capitán.
r.get('/bandeja', async (req, res) => {
  res.json({ partes: await datos.partesDonde('WHERE division = ?', [req.usuario.division]) });
});

// Un parte devuelto no se sella. Quien lo llenó lo corrige y vuelve a firmar.
r.post('/:folio/devolver', async (req, res) => {
  const p = await datos.partePorFolio(req.params.folio);
  if (!p) return res.status(404).json({ error: 'no_existe' });
  if (!String(req.body.nota || '').trim()) return res.status(400).json({ error: 'falta_nota' });
  if (p.estado !== 'enviado') return res.status(409).json({ error: 'no_espera_revision' });
  const revisor = req.usuario;
  if (revisor.id === p.elaboro_id) return res.status(403).json({ error: 'es_su_parte' });
  if (revisor.division !== p.division) return res.status(403).json({ error: 'otra_division' });

  const devuelto = {
    ...p,
    estado: 'devuelto',
    nota: {
      texto: req.body.nota,
      seccion: req.body.seccion || 'Datos del servicio',
      revisor: revisor.nombre,
      fecha: new Date().toISOString(),
    },
  };
  await db.transaccion(async (t) => {
    await datos.guardarParte(devuelto, t);
    await notificaciones.avisar(t, {
      usuarioId: p.elaboro_id,
      tipo: 'parte_devuelto',
      folio: p.folio,
      titulo: 'Parte devuelto',
      texto: `${devuelto.nota.revisor} devolvió ${p.folio}: ${devuelto.nota.texto}`,
    });
  });
  res.json({ parte: devuelto });
});

// Llega el reto y la confirmación del revisor: firma (biometría del celular)
// o contrasena. Su trazo es el que tiene guardado en su cuenta.
r.post('/:folio/validar', async (req, res) => {
  const p = await datos.partePorFolio(req.params.folio);
  if (!p) return res.status(404).json({ error: 'no_existe' });
  if (p.estado !== 'enviado') return res.status(409).json({ error: 'no_espera_revision' });
  const { reto, firma: f, contrasena } = req.body;

  // Valida un revisor de la división del parte, y nunca quien lo llenó.
  const revisor = req.usuario;
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
    await notificaciones.avisar(t, {
      usuarioId: p.elaboro_id,
      tipo: 'parte_validado',
      folio: validado.folio,
      titulo: 'Parte validado',
      texto: `${revisor.nombre} validó ${validado.folio}. Ya está en Administración.`,
    });
    await notificaciones.avisarAAdministracion(t, {
      tipo: 'parte_validado',
      folio: validado.folio,
      titulo: 'Parte validado',
      texto: `${validado.folio} fue validado por ${revisor.nombre} y llegó a Administración.`,
    });
  });
  res.json({ parte: validado });
});

module.exports = r;

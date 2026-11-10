// Endpoints de las DOS IAs (contrato: CONTRATOS-IA.md).
//   IA_MODO=fijo  (predeterminado) → respuestas de ejemplo, sin modelos. Lo usan las pruebas.
//   IA_MODO=local                   → Whisper (whisper.cpp) + Ollama en esta Mac. Pide clave.
// Nunca se registra ni se guarda el audio ni el texto dictado.
const crypto = require('crypto');
const express = require('express');
const config = require('../ia/config');
const datos = require('../datos');

const r = express.Router();

if (config.modo === 'local') {
  const { conAudioTemporal } = require('../ia/audio');
  const whisper = require('../ia/whisper');
  const { llenarCampos } = require('../ia/llenado');
  const { resumir } = require('../ia/resumen');

  r.use(autorizar);

  r.post('/transcribir', async (req, res, next) => {
    try {
      const { audio_base64: audio, formato = 'm4a', idioma = 'es' } = req.body;
      if (!audio) return res.status(400).json({ error: 'falta_audio' });
      const t0 = Date.now();
      const salida = await conAudioTemporal(audio, formato, async (wav, info) => {
        const t = await whisper.transcribir(wav);
        return { ...t, duracion_s: Math.round(info.duracionS * 10) / 10 };
      });
      // Aquí el audio ya se borró (conAudioTemporal limpia siempre).
      if (!salida.texto) return res.status(422).json({ error: 'audio_vacio', mensaje: 'Casi no se escuchó nada' });
      console.log(`  IA1 transcribir · ${salida.duracion_s} s de audio · ${Date.now() - t0} ms`);
      res.json({ texto: salida.texto, idioma, duracion_s: salida.duracion_s, modelo: 'whisper-large-v3 (whisper.cpp)', segmentos: salida.segmentos, audio_borrado: true });
    } catch (e) { next(e); }
  });

  r.post('/llenar-campos', async (req, res, next) => {
    try {
      const { transcripcion, campos_actuales: actuales = {}, catalogo } = req.body;
      if (!transcripcion || !transcripcion.texto) return res.status(400).json({ error: 'falta_transcripcion' });
      if (!Array.isArray(catalogo) || catalogo.length === 0) return res.status(400).json({ error: 'falta_catalogo' });
      const t0 = Date.now();
      const out = await llenarCampos({ texto: transcripcion.texto, catalogo, actuales });
      console.log(`  IA2 llenar · ${out.campos.length} campos · ${out.descartados} descartados · ${Date.now() - t0} ms`);
      res.json(out);
    } catch (e) { next(e); }
  });

  r.post('/resumen', async (req, res, next) => {
    try {
      const t0 = Date.now();
      const out = await resumir({ campos: req.body.campos || {}, transcripcion: req.body.transcripcion || '' });
      console.log(`  IA2 resumen · ${out.texto.length} caracteres · ${Date.now() - t0} ms`);
      res.json(out);
    } catch (e) { next(e); }
  });

  // Errores de la IA con su código del contrato. Sólo se registra el código, nunca el contenido.
  // eslint-disable-next-line no-unused-vars
  r.use((e, _req, res, _next) => {
    console.error(`  IA error · ${e.codigo || 'interno'}`);
    res.status(e.estado || 500).json({ error: e.codigo || 'error_ia', mensaje: e.codigo ? e.message : 'Error de la IA' });
  });
}

/** Sólo la app con la clave local (cabecera X-Clave-Local) o con una sesión válida. */
function autorizar(req, res, next) {
  const clave = req.get('x-clave-local') || '';
  if (config.claveLocal && clave.length === config.claveLocal.length &&
      crypto.timingSafeEqual(Buffer.from(clave), Buffer.from(config.claveLocal))) return next();
  const bearer = /^Bearer (.+)$/.exec(req.get('authorization') || '');
  if (bearer && datos.sesiones.has(bearer[1])) return next();
  res.status(401).json({ error: 'sin_autorizacion', mensaje: 'Falta la clave local o una sesión válida' });
}

// ---------- Modo fijo (sin modelos) ----------

// § 1 · Transcripción (IA 1: Whisper large-v3).
r.post('/transcribir', (req, res) => {
  const { audio_base64: audio, duracion_s: dur = 0, idioma = 'es' } = req.body;
  if (!audio) return res.status(400).json({ error: 'falta_audio' });
  if (dur < 2) return res.status(422).json({ error: 'audio_vacio', mensaje: 'Casi no se escuchó nada' });
  // TODO(IA): reenviar el audio a Whisper large-v3 (Colab o la Mac del equipo), p. ej.
  //   const r = await fetch(process.env.URL_WHISPER + '/transcribir', { method: 'POST', body: Buffer.from(audio, 'base64') });
  // y BORRAR el audio en cuanto llegue el texto (decisión del 8 de noviembre). Aquí no se guarda nunca.
  res.json({
    texto: '(Ejemplo del servidor) Incendio de pastizal. Unidad E7 de la estación 3. Calle López Mateos, El Sauzal. Se sofocó el fuego con pitón de niebla. No hubo lesionados.',
    idioma,
    duracion_s: dur,
    modelo: 'fijo-sin-ia',
    segmentos: [
      { inicio: 0.0, fin: 2.1, texto: 'Incendio de pastizal.' },
      { inicio: 2.1, fin: 4.8, texto: 'Unidad E7 de la estación 3.' },
    ],
    audio_borrado: true,
  });
});

// § 2 · Llenado de campos (IA 2).
r.post('/llenar-campos', (req, res) => {
  const { transcripcion, campos_actuales: actuales = {} } = req.body;
  if (!transcripcion || !transcripcion.texto) return res.status(400).json({ error: 'falta_transcripcion' });
  // TODO(IA): llamar al modelo de llenado con { transcripcion, campos_actuales, catalogo } y validar su JSON
  // contra el contrato (estados permitidos, confianza 0..1, valor_anterior sólo en «corregido», ids del catálogo).
  const segundo = !!actuales.tipo_servicio;
  const campos = segundo
    ? [
        actuales.hora_llegada
          ? { campo: 'hora_llegada', valor: '14:35', estado: 'corregido', confianza: 0.88, valor_anterior: actuales.hora_llegada.valor, evidencia: 'Corrijo, llegamos a las 14:35' }
          : { campo: 'hora_llegada', valor: '14:35', estado: 'revisar', confianza: 0.8, valor_anterior: null, evidencia: 'llegamos a las 14:35' },
        { campo: 'propietario', valor: 'Manuel Torres', estado: 'revisar', confianza: 0.7, valor_anterior: null, evidencia: 'El propietario es Manuel Torres' },
        { campo: 'personal_turno', valor: 'R. Cota, D. Mora', estado: 'revisar', confianza: 0.66, valor_anterior: null, evidencia: 'Iban R. Cota y D. Mora' },
      ]
    : [
        { campo: 'tipo_servicio', valor: 'Incendio de pastizal', estado: 'entendido', confianza: 0.96, valor_anterior: null, evidencia: 'Incendio de pastizal' },
        { campo: 'unidad', valor: 'E7 · Estación 3', estado: 'entendido', confianza: 0.93, valor_anterior: null, evidencia: 'Unidad E7 de la estación 3' },
        { campo: 'hora_llegada', valor: '', estado: 'falta', confianza: 0, valor_anterior: null, evidencia: null },
        { campo: 'lugar_servicio', valor: 'Calle López Mateos, El Sauzal', estado: 'revisar', confianza: 0.64, valor_anterior: null, evidencia: 'Calle López Mateos, El Sauzal' },
        { campo: 'propietario', valor: '', estado: 'falta', confianza: 0, valor_anterior: null, evidencia: null },
        { campo: 'descripcion', valor: 'Se sofocó el fuego con pitón de niebla. No hubo lesionados.', estado: 'revisar', confianza: 0.71, valor_anterior: null, evidencia: 'Se sofocó el fuego con pitón de niebla' },
      ];
  res.json({ modelo: 'fijo-sin-ia', campos });
});

// § 3 · Resumen informal para WhatsApp (IA 2). No se guarda.
r.post('/resumen', (req, res) => {
  const c = req.body.campos || {};
  // TODO(IA): pedir al modelo un texto breve, sin datos personales del propietario ni del testigo.
  const texto =
    `🚒 ${c.tipo_servicio || 'Servicio'} en ${c.lugar_servicio || 'lugar por confirmar'}\n` +
    `${c.unidad || 'La unidad'} llegó a las ${c.hora_llegada || '--:--'}. ${c.descripcion || ''}\n` +
    '(Texto fijo del servidor, sin IA)';
  res.json({ texto, advertencia: 'Borrador informal. No es documento oficial ni se guarda.', modelo: 'fijo-sin-ia' });
});

module.exports = r;

// IA 1 · Transcripción con Whisper large-v3 (whisper.cpp, acelerado con Metal en la Mac).
// whisper-server se queda corriendo con el modelo cargado (se carga una sola vez, no por petición).
const fs = require('fs/promises');
const config = require('./config');
const glosario = require('./glosario');

async function transcribir(rutaWav) {
  const form = new FormData();
  form.append('file', new Blob([await fs.readFile(rutaWav)], { type: 'audio/wav' }), 'audio.wav');
  form.append('language', 'es');
  form.append('temperature', '0');
  form.append('response_format', 'verbose_json');
  form.append('prompt', glosario.contextoWhisper);

  let r;
  try {
    r = await fetch(`${config.whisper.url}/inference`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(config.esperaMs.whisper),
    });
  } catch {
    const e = new Error('Whisper no responde');
    e.estado = 503;
    e.codigo = 'whisper_apagado';
    throw e;
  }
  if (!r.ok) {
    const e = new Error(`Whisper respondió ${r.status}`);
    e.estado = 502;
    e.codigo = 'whisper_error';
    throw e;
  }
  const j = await r.json();
  const segmentos = unirSegmentos(j.segments || []).map((s) => ({ ...s, texto: corregir(s.texto) }));
  const texto = corregir(segmentos.map((s) => s.texto).join(' ') || String(j.text || '').replace(/\s+/g, ' ').trim());
  return { texto, segmentos };
}

/**
 * whisper.cpp a veces corta un segmento a mitad de palabra («Juá» + «rez.»).
 * Un segmento que NO empieza con espacio continúa la palabra anterior: se pega sin espacio.
 */
function unirSegmentos(crudos) {
  const out = [];
  for (const s of crudos) {
    const crudo = String(s.text || '');
    const seg = { inicio: Number(s.start ?? s.t0 ?? 0), fin: Number(s.end ?? s.t1 ?? 0), texto: crudo.trim() };
    if (!seg.texto) continue;
    const previo = out[out.length - 1];
    if (previo && !/^\s/.test(crudo)) {
      previo.texto += seg.texto;
      previo.fin = seg.fin;
    } else {
      out.push(seg);
    }
  }
  return out;
}

function corregir(t) {
  return glosario.correcciones.reduce((acc, [re, bien]) => acc.replace(re, bien), t);
}

module.exports = { transcribir, corregir, unirSegmentos };

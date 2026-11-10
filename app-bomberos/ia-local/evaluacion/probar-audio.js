// Prueba de punta a punta por HTTP, como lo haría la app: audio → /transcribir → /llenar-campos.
// Requiere: ia-local/iniciar.sh y el servidor corriendo con IA_MODO=local.
// Uso: node probar-audio.js [http://127.0.0.1:3100]
const fs = require('fs');
const path = require('path');
const { leerCatalogo } = require('./catalogo');
const { evaluarCaso, wer } = require('./medidas');

const URL = process.argv[2] || 'http://127.0.0.1:3100';
const env = fs.readFileSync(path.join(__dirname, '..', '..', 'servidor', '.env'), 'utf8');
const CLAVE = (/^CLAVE_LOCAL=(.*)$/m.exec(env) || [])[1] || ''; // se usa, nunca se imprime
const catalogo = leerCatalogo();
const { casos } = require('./casos.json');
const AUDIOS = path.join(__dirname, '..', 'audios');

async function post(ruta, cuerpo, conClave = true) {
  const r = await fetch(URL + ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(conClave ? { 'X-Clave-Local': CLAVE } : {}) },
    body: JSON.stringify(cuerpo),
  });
  return { estado: r.status, cuerpo: await r.json() };
}
const audio = (id) => fs.readFileSync(path.join(AUDIOS, `${id}.m4a`)).toString('base64');

(async () => {
  console.log('Seguridad');
  const sin = await post('/api/ia/transcribir', { audio_base64: audio('silencio'), formato: 'm4a' }, false);
  console.log(`  sin clave → ${sin.estado} ${sin.cuerpo.error}`);
  const sil = await post('/api/ia/transcribir', { audio_base64: audio('silencio'), formato: 'm4a' });
  console.log(`  silencio  → ${sil.estado} ${sil.cuerpo.error}`);

  console.log('\nCasos (voz sintética de la Mac)');
  const filas = [];
  for (const caso of casos) {
    const t0 = Date.now();
    const t = await post('/api/ia/transcribir', { audio_base64: audio(caso.id), formato: 'm4a', idioma: 'es' });
    const msT = Date.now() - t0;
    if (t.estado !== 200) { filas.push({ caso: caso.id, error: `${t.estado} ${t.cuerpo.error}` }); continue; }
    const t1 = Date.now();
    const ll = await post('/api/ia/llenar-campos', {
      transcripcion: { texto: t.cuerpo.texto, idioma: 'es' },
      campos_actuales: caso.actuales || {},
      catalogo,
    });
    const msL = Date.now() - t1;
    const ev = ll.estado === 200 ? evaluarCaso(caso, ll.cuerpo) : null;
    filas.push({
      caso: caso.id,
      audio_s: t.cuerpo.duracion_s,
      whisper_ms: msT,
      WER: `${Math.round(wer(caso.dictado, t.cuerpo.texto) * 100)}%`,
      llenado_ms: msL,
      aciertos: ev ? `${ev.aciertos}/${ev.esperados}` : `error ${ll.estado}`,
      mal: ev ? ev.mal.length : '-',
      inventados: ev ? ev.inventados.length : '-',
      audio_borrado: t.cuerpo.audio_borrado,
    });
    if (ev && (ev.mal.length || ev.faltaron.length)) filas[filas.length - 1].nota = [...ev.mal, ...ev.faltaron.map((f) => `faltó ${f}`)].join('; ');
    if (wer(caso.dictado, t.cuerpo.texto) > 0.1) filas[filas.length - 1].transcrito = t.cuerpo.texto;
  }
  console.table(filas.map(({ transcrito, nota, ...f }) => f));
  for (const f of filas) {
    if (f.nota) console.log(`  ${f.caso}: ${f.nota}`);
    if (f.transcrito) console.log(`  ${f.caso} transcrito: «${f.transcrito}»`);
  }
})();

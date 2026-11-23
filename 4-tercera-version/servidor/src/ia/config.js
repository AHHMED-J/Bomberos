// Configuración de la IA local. Se lee de variables de entorno o de servidor/.env (que NO va al repo).
// Ver servidor/.env.example para la lista completa.
const fs = require('fs');
const os = require('os');
const path = require('path');

const archivoEnv = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(archivoEnv)) process.loadEnvFile(archivoEnv);

const casa = os.homedir();
const e = process.env;
const expandir = (r) => (r && r.startsWith('~') ? path.join(casa, r.slice(1)) : r);

module.exports = {
  // fijo  = respuestas de ejemplo (no necesita modelos; es lo que usan las pruebas)
  // local = Whisper (whisper.cpp) + Ollama corriendo en esta Mac
  modo: e.IA_MODO === 'local' ? 'local' : 'fijo',

  // Clave compartida con la app (cabecera X-Clave-Local). Sin clave, la IA local rechaza todo.
  claveLocal: e.CLAVE_LOCAL || '',

  whisper: {
    // whisper-server corre sólo en 127.0.0.1: el iPhone nunca le habla directo.
    url: e.WHISPER_URL || 'http://127.0.0.1:8178',
    modelo: expandir(e.WHISPER_MODELO) || path.join(casa, '.bomberos-ia', 'modelos', 'ggml-large-v3.bin'),
  },

  ollama: {
    url: e.OLLAMA_URL || 'http://127.0.0.1:11434',
    modelo: e.OLLAMA_MODELO || 'qwen2.5:14b',
    // Cuánto tiempo deja Ollama el modelo cargado en memoria después de usarlo.
    mantener: e.OLLAMA_MANTENER || '30m',
  },

  audio: {
    duracionMinimaS: 2,
    duracionMaximaS: Number(e.AUDIO_MAX_S) || 180,
    // Si el pico del audio no pasa de este nivel (dB), se considera silencio.
    picoMinimoDb: -45,
  },

  esperaMs: { whisper: 120000, ollama: 120000 },
};

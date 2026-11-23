// Manejo del audio: se escribe en una carpeta temporal privada, se convierte a WAV 16 kHz mono
// para Whisper y SE BORRA SIEMPRE al terminar (también si algo falla). Nunca se registra su contenido.
const { execFile } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const config = require('./config');

const ejecutar = promisify(execFile);
const FORMATOS = new Set(['m4a', 'aac', 'mp4', 'caf', 'wav', 'mp3', 'ogg', 'webm', 'aiff']);

class ErrorAudio extends Error {
  constructor(estado, codigo, mensaje) {
    super(mensaje || codigo);
    this.estado = estado;
    this.codigo = codigo;
  }
}

/** Ejecuta `trabajo(rutaWav, info)` con el audio convertido y borra todo al final. */
async function conAudioTemporal(base64, formato, trabajo) {
  const ext = FORMATOS.has(String(formato).toLowerCase()) ? String(formato).toLowerCase() : 'm4a';
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bomberos-audio-'));
  await fs.chmod(dir, 0o700);
  const original = path.join(dir, `entrada.${ext}`);
  const wav = path.join(dir, 'audio.wav');
  try {
    await fs.writeFile(original, Buffer.from(base64, 'base64'), { mode: 0o600 });
    try {
      await ejecutar('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', original, '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav]);
    } catch {
      throw new ErrorAudio(422, 'audio_ilegible', 'No se pudo leer el audio');
    }
    const info = await medir(wav);
    if (info.duracionS < config.audio.duracionMinimaS || info.picoDb < config.audio.picoMinimoDb) {
      throw new ErrorAudio(422, 'audio_vacio', 'Casi no se escuchó nada');
    }
    if (info.duracionS > config.audio.duracionMaximaS) {
      throw new ErrorAudio(413, 'audio_muy_largo', `Máximo ${config.audio.duracionMaximaS} s por dictado`);
    }
    return await trabajo(wav, info);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

/** Duración y pico de volumen con ffmpeg (sin guardar nada). */
async function medir(wav) {
  const { stderr } = await ejecutar('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', 'volumedetect', '-f', 'null', '-']);
  const dur = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
  const pico = /max_volume: (-?[\d.]+|-inf) dB/.exec(stderr);
  return {
    duracionS: dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) : 0,
    picoDb: pico && pico[1] !== '-inf' ? Number(pico[1]) : -Infinity,
  };
}

module.exports = { conAudioTemporal, ErrorAudio };

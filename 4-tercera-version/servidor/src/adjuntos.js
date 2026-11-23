// Las imágenes de un parte: las fotos de la evidencia y el croquis.
//
// Se guardan en la base (tabla `adjunto`), no en una carpeta: así entran en los
// respaldos de MySQL y el servidor no depende de rutas del disco. Cada una se
// identifica por su SHA-256. Ese hash viaja dentro del parte que firma quien lo
// elabora (validacion.js → «adjuntos»), así que la firma y el sello cubren las
// imágenes: cambiar un solo píxel después ya no coincide.
//
// Lo que se acepta (todo se comprueba aquí, la app no es de fiar):
//   - sólo PNG y JPEG, reconocidos por sus primeros bytes, no por lo que diga el cliente
//   - hasta 8 MB cada una, y 26 por parte (25 fotos y el croquis)
//   - sube quien elabora el parte (o nadie, si el folio es de otra persona)
//   - el hash que dice el cliente debe ser el de los bytes que mandó
//
// Se entregan con el tipo que detectó el servidor, `nosniff`, sin caché y con
// una política que no deja ejecutar nada: aunque alguien lograra subir otra
// cosa, el navegador no la interpreta como página.

'use strict';

const crypto = require('node:crypto');

const db = require('./db');

const MAXIMO_BYTES = 8 * 1024 * 1024;
const MAXIMO_POR_PARTE = 26;
const TIPOS = ['foto', 'croquis'];
const SHA256 = /^[0-9a-f]{64}$/;

const hashDe = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function mimeDe(b) {
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  return null;
}

// Guarda una imagen. Devuelve { ok: true, sha256 } o { ok: false, motivo }.
async function guardar({ folio, tipo, sha256, base64, usuarioId }) {
  if (!TIPOS.includes(tipo)) return { ok: false, motivo: 'tipo_invalido' };
  if (typeof sha256 !== 'string' || !SHA256.test(sha256)) return { ok: false, motivo: 'hash_invalido' };
  if (typeof base64 !== 'string' || base64.length > Math.ceil((MAXIMO_BYTES * 4) / 3) + 8) {
    return { ok: false, motivo: 'imagen_muy_grande' };
  }
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length === 0) return { ok: false, motivo: 'imagen_vacia' };
  if (bytes.length > MAXIMO_BYTES) return { ok: false, motivo: 'imagen_muy_grande' };
  const mime = mimeDe(bytes);
  if (!mime) return { ok: false, motivo: 'formato_no_valido' };
  if (hashDe(bytes) !== sha256) return { ok: false, motivo: 'hash_no_coincide' };

  const { n } = await db.fila('SELECT COUNT(*) AS n FROM adjunto WHERE folio = ? AND subido_por = ? AND sha256 <> ?', [folio, usuarioId, sha256]);
  if (n >= MAXIMO_POR_PARTE) return { ok: false, motivo: 'demasiados_adjuntos' };
  await db.ejecutar(
    `INSERT IGNORE INTO adjunto (folio, sha256, tipo, mime, bytes, contenido, subido_por) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [folio, sha256, tipo, mime, bytes.length, bytes, usuarioId],
  );
  return { ok: true, sha256 };
}

// Para mirar una imagen del parte (quien la pide ya fue autorizado). Con `usuarioId`, sólo la que subió esa persona.
const buscar = (folio, sha256, usuarioId = null) =>
  SHA256.test(String(sha256))
    ? db.fila(
        `SELECT tipo, mime, bytes, contenido, subido_por FROM adjunto WHERE folio = ? AND sha256 = ?${usuarioId ? ' AND subido_por = ?' : ''} LIMIT 1`,
        usuarioId ? [folio, sha256, usuarioId] : [folio, sha256],
      )
    : null;

// Las que subió esa persona para ese folio (aún sin parte en la base).
async function subidasPor(folio, usuarioId) {
  const filas = await db.filas('SELECT sha256 FROM adjunto WHERE folio = ? AND subido_por = ?', [folio, usuarioId]);
  return filas.map((f) => f.sha256);
}

function servir(res, fila) {
  res.set({
    'Content-Type': fila.mime,
    'Content-Length': String(fila.bytes),
    'Content-Disposition': 'inline',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  });
  res.end(fila.contenido);
}

// ¿Las imágenes guardadas siguen siendo las que se firmaron? Vuelve a sacar el
// SHA-256 de cada una, por si alguien tocó la base.
async function integras(folio, adjuntos) {
  for (const a of adjuntos || []) {
    const fila = await buscar(folio, a.sha256, a.subido_por);
    if (!fila || hashDe(fila.contenido) !== a.sha256) return false;
  }
  return true;
}

module.exports = { guardar, buscar, subidasPor, servir, integras, hashDe, MAXIMO_BYTES, TIPOS, SHA256 };

// La bóveda de las firmas en trazo.
//
// La firma de cada persona se guarda CIFRADA en la base (AES-256-GCM), no en
// texto. Quien copie la base de datos o un respaldo ve sólo texto ilegible.
// Se descifra únicamente en el servidor, en el momento de ponerla en un parte
// que su dueño confirmó, o de devolvérsela a su dueño.
//
// Formato guardado:  v1.<iv>.<etiqueta>.<cifrado>   (base64url)
//
//   - Cada firma lleva su propio iv al azar.
//   - La etiqueta de GCM detecta cualquier alteración.
//   - El id del usuario va como «dato asociado»: copiar el cifrado de una
//     cuenta a otra no sirve, porque no descifra.
//
// La clave (32 bytes) sale de FIRMAS_CLAVE en servidor/.env (64 caracteres
// hexadecimales). Si no existe y no estamos en producción, se crea una vez en
// servidor/firmas.key (permisos 600, fuera de git). Quien la pierda pierde las
// firmas guardadas: hay que respaldarla aparte de la base de datos.

'use strict';

require('./entorno');

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ARCHIVO_CLAVE = path.join(__dirname, '..', 'firmas.key');
const PREFIJO = 'v1.';

let clave = null;

function leerClave() {
  if (clave) return clave;
  let hex = (process.env.FIRMAS_CLAVE || '').trim();
  if (!hex) {
    if (process.env.NODE_ENV === 'production') throw new Error('Falta FIRMAS_CLAVE en servidor/.env');
    if (!fs.existsSync(ARCHIVO_CLAVE)) {
      fs.writeFileSync(ARCHIVO_CLAVE, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
      console.warn('Se creó servidor/firmas.key para cifrar las firmas. Respáldala aparte de la base de datos.');
    }
    hex = fs.readFileSync(ARCHIVO_CLAVE, 'utf8').trim();
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error('La clave de las firmas debe tener 64 caracteres hexadecimales');
  clave = Buffer.from(hex, 'hex');
  return clave;
}

const estaCifrado = (valor) => typeof valor === 'string' && valor.startsWith(PREFIJO);

function cifrar(texto, usuarioId) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', leerClave(), iv);
  c.setAAD(Buffer.from(String(usuarioId)));
  const cifrado = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return PREFIJO + [iv, c.getAuthTag(), cifrado].map((b) => b.toString('base64url')).join('.');
}

// Devuelve el texto, o null si el valor fue alterado o no es de ese usuario.
// Un valor sin prefijo es una firma guardada antes de la bóveda: se devuelve
// tal cual (la migración de `npm run db:crear` las cifra).
function descifrar(valor, usuarioId) {
  if (valor == null) return null;
  if (!estaCifrado(valor)) return valor;
  try {
    const [iv, etiqueta, cifrado] = valor.slice(PREFIJO.length).split('.').map((p) => Buffer.from(p, 'base64url'));
    const d = crypto.createDecipheriv('aes-256-gcm', leerClave(), iv);
    d.setAAD(Buffer.from(String(usuarioId)));
    d.setAuthTag(etiqueta);
    return Buffer.concat([d.update(cifrado), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

module.exports = { cifrar, descifrar, estaCifrado };

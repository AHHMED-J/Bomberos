// Las piezas de la confirmación con la llave del celular que no tocan la base
// de datos. Se prueban solas en scripts/probar-flujo.js.
//
// Cómo se confirma:
//   1. La primera vez, la app crea un par de llaves dentro del chip seguro del
//      celular (Secure Enclave en iPhone, Android Keystore en Android). La
//      llave privada nunca sale del chip y el celular solo la deja usar
//      después de reconocer la huella, la cara o el PIN del teléfono. Al
//      servidor llega solo la llave pública.
//   2. Para entrar o firmar, el servidor arma un mensaje único (el reto) y el
//      celular lo firma con esa llave.
//   3. El servidor comprueba la firma con la llave pública. Si alguien se
//      salta la biometría o el PIN del teléfono, no tiene cómo producir una
//      firma válida.
//
// La huella, la cara y el PIN del teléfono los revisa el celular: nunca
// llegan a la app ni al servidor.

'use strict';

const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');

const VIGENCIA_RETO_SEGUNDOS = 120;

// bcrypt es lento a propósito: así cuesta mucho probar contraseñas al azar si
// alguien se roba la base.
const COSTO_CONTRASENA = 12;

function sha256(texto) {
  return crypto.createHash('sha256').update(texto).digest('hex');
}

// Un valor al azar que nadie puede adivinar: tokens de sesión y la clave de
// cada celular.
function secreto() {
  return crypto.randomBytes(32).toString('base64url');
}

// La llave pública llega en base64, en formato SPKI (DER), o en PEM (que es
// lo mismo con encabezado). Solo se acepta EC P-256: es la única que crea el
// Secure Enclave del iPhone, y Android la crea igual.
function leerLlavePublica(texto) {
  if (typeof texto !== 'string' || texto.length > 400) return null;
  let llave;
  try {
    llave = texto.includes('-----BEGIN')
      ? crypto.createPublicKey(texto)
      : crypto.createPublicKey({ key: Buffer.from(texto, 'base64'), format: 'der', type: 'spki' });
  } catch {
    return null;
  }
  if (llave.asymmetricKeyType !== 'ec') return null;
  if (llave.asymmetricKeyDetails?.namedCurve !== 'prime256v1') return null;
  return llave;
}

// Se guarda siempre igual (SPKI en base64), llegue como llegue.
function normalizarLlavePublica(texto) {
  const llave = leerLlavePublica(texto);
  return llave ? llave.export({ type: 'spki', format: 'der' }).toString('base64') : null;
}

// ECDSA con SHA-256. Android (SHA256withECDSA) y iPhone
// (ecdsaSignatureMessageX962SHA256) entregan la firma en DER, que es lo que
// node:crypto espera por omisión.
function firmaValida(llavePublica, mensaje, firmaBase64) {
  const llave = leerLlavePublica(llavePublica);
  if (!llave || typeof firmaBase64 !== 'string' || firmaBase64.length > 200) return false;
  try {
    return crypto.verify('sha256', Buffer.from(mensaje, 'utf8'), llave, Buffer.from(firmaBase64, 'base64'));
  } catch {
    return false;
  }
}

// Lo que firma el celular. Lleva todo lo que identifica la operación (qué,
// quién, desde qué celular, qué parte y en qué versión), para que una firma
// no sirva para otra cosa. El nonce la hace única.
function armarMensaje({ accion, noEmpleado, dispositivoId, nonce, parte = null, hashContenido = null }) {
  const piezas = ['BomberosApp', `accion=${accion}`, `usuario=${noEmpleado}`, `dispositivo=${dispositivoId}`];
  if (parte) piezas.push(`parte=${parte.id}`, `folio=${parte.folio}`, `hash=${hashContenido}`);
  piezas.push(`nonce=${nonce}`);
  return piezas.join('|');
}

// JSON con las llaves siempre en el mismo orden, para que el mismo parte dé
// siempre el mismo hash.
function canonico(valor) {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(',')}]`;
  if (valor && typeof valor === 'object') {
    const llaves = Object.keys(valor)
      .filter((llave) => valor[llave] !== undefined)
      .sort();
    return `{${llaves.map((llave) => `${JSON.stringify(llave)}:${canonico(valor[llave])}`).join(',')}}`;
  }
  return JSON.stringify(valor ?? null);
}

function hashContrasena(contrasena) {
  return bcrypt.hash(contrasena, COSTO_CONTRASENA);
}

async function coincide(texto, hash) {
  if (typeof texto !== 'string' || !hash) return false;
  return bcrypt.compare(texto, hash);
}

module.exports = {
  VIGENCIA_RETO_SEGUNDOS,
  sha256,
  secreto,
  leerLlavePublica,
  normalizarLlavePublica,
  firmaValida,
  armarMensaje,
  canonico,
  hashContrasena,
  coincide,
};

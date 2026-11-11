// Retos y confirmación de quién firma.
//
// Para entrar o firmar, el servidor entrega un reto: 16 bytes al azar + ':' +
// («acceso» o el SHA-256 del contenido del parte). Vale 5 minutos y una sola
// vez. El usuario lo confirma de una de dos formas:
//
//   biometría   el celular reconoce la huella o la cara y firma el reto con
//               la llave de su chip seguro (ECDSA P-256). El servidor lo
//               comprueba con la llave pública del usuario.
//   contraseña  la misma con la que entra a la app.
//
// La biometría nunca llega al servidor.

'use strict';

const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');

const db = require('./db');

// Acepta firmas «SIMULADA:<sha256 del reto>» del simulador o de celulares sin
// biometría, igual que el servidor de la app. MODO_PRUEBA=0 las rechaza.
const ACEPTA_SIMULADAS = process.env.MODO_PRUEBA !== '0';

const VIGENCIA_MINUTOS = 5;

const sha256 = (texto) => crypto.createHash('sha256').update(texto).digest('hex');

async function nuevoReto(sufijo) {
  const reto = `${crypto.randomBytes(16).toString('hex')}:${sufijo}`;
  await db.ejecutar('INSERT INTO reto (reto) VALUES (?)', [reto]);
  return reto;
}

// Gasta el reto. Devuelve null si servía, o el motivo por el que no.
async function gastarReto(reto) {
  const fila =
    typeof reto === 'string'
      ? await db.fila('SELECT usado_en, creado_en > DATE_SUB(NOW(), INTERVAL ? MINUTE) AS vigente FROM reto WHERE reto = ?', [
          VIGENCIA_MINUTOS,
          reto,
        ])
      : null;
  if (!fila) return 'reto_desconocido';
  if (fila.usado_en) return 'reto_usado';
  if (!fila.vigente) return 'reto_vencido';

  // Si dos peticiones llegan con el mismo reto, solo una lo gasta.
  const { affectedRows } = await db.ejecutar('UPDATE reto SET usado_en = NOW() WHERE reto = ? AND usado_en IS NULL', [reto]);
  return affectedRows === 1 ? null : 'reto_usado';
}

function firmaReal(llavePublica, reto, firma) {
  try {
    return crypto.verify('sha256', Buffer.from(reto, 'utf8'), llavePublica, Buffer.from(firma, 'base64'));
  } catch {
    return false;
  }
}

async function contrasenaCorrecta(usuario, contrasena) {
  return typeof contrasena === 'string' && contrasena !== '' && (await bcrypt.compare(contrasena, usuario.contrasena_hash));
}

// usuario es el renglón completo (con contrasena_hash y llave_publica).
// Llega firma (biometría) o contrasena. Devuelve { ok, metodo, simulada, motivo }.
async function confirmar({ reto, firma, contrasena, usuario }) {
  const motivo = await gastarReto(reto);
  if (motivo) return { ok: false, motivo };

  if (contrasena !== undefined && contrasena !== null) {
    const ok = await contrasenaCorrecta(usuario, contrasena);
    return { ok, metodo: 'contrasena', simulada: false, motivo: ok ? null : 'contrasena_incorrecta' };
  }

  if (typeof firma === 'string' && firma.startsWith('SIMULADA:')) {
    if (!ACEPTA_SIMULADAS) return { ok: false, motivo: 'simuladas_desactivadas' };
    const ok = firma === `SIMULADA:${sha256(reto)}`;
    return { ok, metodo: 'biometria', simulada: true, motivo: ok ? null : 'firma_simulada_invalida' };
  }

  const llave = usuario.llave_publica;
  if (!llave || llave === 'SIMULADA') return { ok: false, motivo: 'sin_llave_publica' };
  const ok = typeof firma === 'string' && firmaReal(llave, reto, firma);
  return { ok, metodo: 'biometria', simulada: false, motivo: ok ? null : 'firma_invalida' };
}

module.exports = { nuevoReto, confirmar, contrasenaCorrecta, sha256, ACEPTA_SIMULADAS };

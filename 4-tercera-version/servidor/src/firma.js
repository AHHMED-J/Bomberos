// Retos y verificación de firmas ECDSA P-256 (la llave del chip seguro del
// celular). Hace lo mismo que app-bomberos/servidor/src/firma.js, con los
// retos guardados en MySQL.
//
// El celular solo deja usar su llave después de reconocer la huella, la cara
// o el PIN del teléfono; al servidor llega la firma, nunca la biometría.

'use strict';

const crypto = require('node:crypto');

const db = require('./db');

// Acepta firmas «SIMULADA:<sha256 del reto>» de celulares sin biometría o del
// simulador, igual que el servidor de la app. MODO_PRUEBA=0 las rechaza.
const ACEPTA_SIMULADAS = process.env.MODO_PRUEBA !== '0';

const VIGENCIA_MINUTOS = 5;

const sha256 = (texto) => crypto.createHash('sha256').update(texto).digest('hex');

// Reto = 16 bytes al azar + ':' + (hash del contenido o «acceso»).
async function nuevoReto(sufijo) {
  const reto = `${crypto.randomBytes(16).toString('hex')}:${sufijo}`;
  await db.ejecutar('INSERT INTO reto (reto) VALUES (?)', [reto]);
  return reto;
}

function firmaReal(llavePublica, reto, firma) {
  try {
    return crypto.verify('sha256', Buffer.from(reto, 'utf8'), llavePublica, Buffer.from(firma, 'base64'));
  } catch {
    return false;
  }
}

// Devuelve { ok, simulada, motivo } y gasta el reto: sirve una sola vez.
// llaves son las llaves públicas del usuario; basta con que una coincida.
async function verificar({ reto, firma, llaves }) {
  const fila =
    typeof reto === 'string'
      ? await db.fila('SELECT usado_en, creado_en > DATE_SUB(NOW(), INTERVAL ? MINUTE) AS vigente FROM reto WHERE reto = ?', [
          VIGENCIA_MINUTOS,
          reto,
        ])
      : null;
  if (!fila) return { ok: false, motivo: 'reto_desconocido' };
  if (fila.usado_en) return { ok: false, motivo: 'reto_usado' };
  if (!fila.vigente) return { ok: false, motivo: 'reto_vencido' };

  // Si dos peticiones llegan con el mismo reto, solo una lo gasta.
  const { affectedRows } = await db.ejecutar('UPDATE reto SET usado_en = NOW() WHERE reto = ? AND usado_en IS NULL', [reto]);
  if (affectedRows !== 1) return { ok: false, motivo: 'reto_usado' };

  if (typeof firma === 'string' && firma.startsWith('SIMULADA:')) {
    if (!ACEPTA_SIMULADAS) return { ok: false, motivo: 'simuladas_desactivadas' };
    const ok = firma === `SIMULADA:${sha256(reto)}`;
    return { ok, simulada: true, motivo: ok ? null : 'firma_simulada_invalida' };
  }

  const reales = llaves.filter((llave) => llave && llave !== 'SIMULADA');
  if (reales.length === 0) return { ok: false, motivo: 'sin_llave_publica' };
  if (typeof firma !== 'string') return { ok: false, motivo: 'firma_invalida' };

  const ok = reales.some((llave) => firmaReal(llave, reto, firma));
  return { ok, simulada: false, motivo: ok ? null : 'firma_invalida' };
}

module.exports = { nuevoReto, verificar, sha256, ACEPTA_SIMULADAS };

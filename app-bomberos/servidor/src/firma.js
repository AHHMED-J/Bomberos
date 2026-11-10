// Retos y verificación de firmas ECDSA P-256 (llave del Secure Enclave), igual que probandoFlutter/servidor.
const crypto = require('crypto');

// Prototipo: acepta firmas «SIMULADA:<sha256 del reto>» de teléfonos sin Face ID o del simulador.
// Poner MODO_PRUEBA=0 para rechazarlas.
const ACEPTA_SIMULADAS = process.env.MODO_PRUEBA !== '0';

const retos = new Map(); // reto -> { usado, creado }
const VIGENCIA_MS = 5 * 60 * 1000;

/** Reto = 16 bytes al azar + ':' + (hash del contenido o «acceso»). Sirve UNA vez. */
function nuevoReto(sufijo) {
  const reto = `${crypto.randomBytes(16).toString('hex')}:${sufijo}`;
  retos.set(reto, { usado: false, creado: Date.now() });
  return reto;
}

/** Devuelve { ok, simulada, motivo }. Marca el reto como usado. */
function verificar({ reto, firma, llavePublica }) {
  const r = retos.get(reto);
  if (!r) return { ok: false, motivo: 'reto_desconocido' };
  if (r.usado) return { ok: false, motivo: 'reto_usado' };
  if (Date.now() - r.creado > VIGENCIA_MS) return { ok: false, motivo: 'reto_vencido' };
  r.usado = true;

  if (typeof firma === 'string' && firma.startsWith('SIMULADA:')) {
    const esperada = 'SIMULADA:' + crypto.createHash('sha256').update(reto).digest('hex');
    if (!ACEPTA_SIMULADAS) return { ok: false, motivo: 'simuladas_desactivadas' };
    return { ok: firma === esperada, simulada: true, motivo: firma === esperada ? null : 'firma_simulada_invalida' };
  }
  if (!llavePublica || llavePublica === 'SIMULADA') return { ok: false, motivo: 'sin_llave_publica' };
  try {
    const v = crypto.createVerify('SHA256');
    v.update(reto);
    v.end();
    const ok = v.verify(llavePublica, Buffer.from(firma, 'base64'));
    return { ok, simulada: false, motivo: ok ? null : 'firma_invalida' };
  } catch (e) {
    return { ok: false, motivo: 'error_verificando: ' + e.message };
  }
}

module.exports = { nuevoReto, verificar, ACEPTA_SIMULADAS };

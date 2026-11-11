// Los retos: el mensaje único que el celular firma con su llave (después de
// reconocer la huella, la cara o el PIN del teléfono) para entrar a la app o
// para firmar un parte.
//
//   crearReto()    lo arma y lo guarda, con 2 minutos de vigencia.
//   cumplirReto()  comprueba la firma del celular y lo gasta. Un reto sirve
//                  una sola vez.

'use strict';

const crypto = require('node:crypto');

const db = require('./db');
const { ErrorApi } = require('./errores');
const c = require('./confirmacion');

async function crearReto({ usuario, dispositivo, accion, parte = null, hashContenido = null }) {
  const nonce = crypto.randomBytes(16).toString('base64url');
  const mensaje = c.armarMensaje({
    accion,
    noEmpleado: usuario.no_empleado,
    dispositivoId: dispositivo.id,
    nonce,
    parte,
    hashContenido,
  });

  const { insertId } = await db.ejecutar(
    `INSERT INTO reto (usuario_id, dispositivo_id, accion, parte_id, hash_contenido, mensaje, expira_en)
     VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))`,
    [usuario.id, dispositivo.id, accion, parte ? parte.id : null, hashContenido, mensaje, c.VIGENCIA_RETO_SEGUNDOS],
  );

  return { retoId: insertId, mensaje, vigenciaSegundos: c.VIGENCIA_RETO_SEGUNDOS };
}

async function cumplirReto({ retoId, usuario, dispositivo, accion, parteId = null, firma }) {
  const reto = await db.fila('SELECT *, expira_en > NOW() AS vigente FROM reto WHERE id = ?', [Number(retoId) || 0]);

  const corresponde =
    reto &&
    reto.usuario_id === usuario.id &&
    reto.dispositivo_id === dispositivo.id &&
    reto.accion === accion &&
    reto.parte_id === parteId;
  if (!corresponde) {
    throw new ErrorApi(400, 'RETO_INVALIDO', 'La confirmación no corresponde a esta operación. Vuelve a intentarlo.');
  }
  if (reto.usado_en) throw new ErrorApi(409, 'RETO_USADO', 'Esta confirmación ya se usó. Vuelve a intentarlo.');
  if (!reto.vigente) throw new ErrorApi(410, 'RETO_VENCIDO', 'Pasó demasiado tiempo. Vuelve a intentarlo.');
  if (!firma) throw new ErrorApi(400, 'SIN_FIRMA', 'Falta confirmar con la biometría o el PIN del celular.');

  // Si dos peticiones llegan con el mismo reto, solo una lo gasta. Se gasta
  // aunque la firma no cuadre: así nadie puede probar firmas contra el mismo
  // reto.
  const { affectedRows } = await db.ejecutar('UPDATE reto SET usado_en = NOW() WHERE id = ? AND usado_en IS NULL', [
    reto.id,
  ]);
  if (affectedRows !== 1) throw new ErrorApi(409, 'RETO_USADO', 'Esta confirmación ya se usó. Vuelve a intentarlo.');

  if (!c.firmaValida(dispositivo.llave_publica, reto.mensaje, firma)) {
    throw new ErrorApi(401, 'FIRMA_INVALIDA', 'No se pudo comprobar la firma del celular. Vuelve a intentarlo.');
  }

  return reto;
}

module.exports = { crearReto, cumplirReto };

// Las sesiones de la app. La app manda el token en cada petición:
//
//     Authorization: Bearer <token>
//
// En la base se guarda solo el SHA-256 del token.

'use strict';

const db = require('./db');
const { ErrorApi } = require('./errores');
const c = require('./confirmacion');

const HORAS_SESION = 12;

async function crearSesion(usuarioId, dispositivoId) {
  const token = c.secreto();
  await db.ejecutar(
    `INSERT INTO sesion (token_hash, usuario_id, dispositivo_id, expira_en)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))`,
    [c.sha256(token), usuarioId, dispositivoId, HORAS_SESION],
  );
  return token;
}

function usuarioPorId(id) {
  return db.fila('SELECT * FROM usuario WHERE id = ?', [id]);
}

// Lo que la app puede saber del usuario. Nunca el hash de la contraseña.
function usuarioPublico(usuario) {
  return {
    id: usuario.id,
    noEmpleado: usuario.no_empleado,
    nombre: usuario.nombre,
    puedeRevisar: usuario.puede_revisar === 1,
    tieneTrazo: Boolean(usuario.firma_trazo),
  };
}

// Filtro de Express. Deja en req.sesion, req.usuario y req.dispositivo (null
// si la sesión se abrió con contraseña y el celular todavía no registra su
// llave).
async function exigirSesion(req, res, siguiente) {
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const sesion = token
    ? await db.fila(
        `SELECT id, usuario_id, dispositivo_id
           FROM sesion
          WHERE token_hash = ? AND cerrada_en IS NULL AND expira_en > NOW()`,
        [c.sha256(token)],
      )
    : null;
  if (!sesion) throw new ErrorApi(401, 'SIN_SESION', 'Tu sesión terminó. Vuelve a entrar.');

  req.sesion = sesion;
  req.usuario = await usuarioPorId(sesion.usuario_id);
  req.dispositivo = sesion.dispositivo_id
    ? await db.fila('SELECT * FROM dispositivo WHERE id = ?', [sesion.dispositivo_id])
    : null;
  siguiente();
}

// Para firmar hace falta un celular con su llave registrada: la firma queda
// ligada a él.
function exigirDispositivo(req, res, siguiente) {
  if (!req.dispositivo) {
    throw new ErrorApi(403, 'SIN_CELULAR', 'Registra la llave de este celular antes de firmar.');
  }
  siguiente();
}

module.exports = { crearSesion, usuarioPorId, usuarioPublico, exigirSesion, exigirDispositivo };

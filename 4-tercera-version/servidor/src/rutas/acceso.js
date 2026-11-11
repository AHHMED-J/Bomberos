// Entrar a la app.
//
// La primera vez en un celular (entrada manual):
//   POST /api/acceso/entrar        número de empleado y contraseña
//   POST /api/acceso/dispositivo   registra la llave pública del celular
//
// Las demás veces, con la biometría o el PIN del celular:
//   POST /api/acceso/reto          pide el mensaje que hay que firmar
//   POST /api/acceso/desbloquear   manda la firma y recibe la sesión
//
//   POST /api/acceso/salir         cierra la sesión

'use strict';

const express = require('express');

const db = require('../db');
const { ErrorApi } = require('../errores');
const c = require('../confirmacion');
const { crearReto, cumplirReto } = require('../retos');
const { crearSesion, usuarioPorId, usuarioPublico, exigirSesion } = require('../sesion');

const router = express.Router();

router.post('/entrar', async (req, res) => {
  const noEmpleado = String(req.body?.noEmpleado ?? '').trim();
  const contrasena = String(req.body?.contrasena ?? '');

  const usuario = await db.fila('SELECT * FROM usuario WHERE no_empleado = ?', [noEmpleado]);
  if (!usuario || !(await c.coincide(contrasena, usuario.contrasena_hash))) {
    throw new ErrorApi(401, 'CREDENCIALES', 'Número de empleado o contraseña incorrectos.');
  }

  // Esta sesión todavía no tiene celular: sirve para registrar la llave.
  // Para firmar hace falta terminar ese paso.
  const token = await crearSesion(usuario.id, null);
  res.json({ token, usuario: usuarioPublico(usuario) });
});

// La app crea la llave en el chip seguro y manda aquí la pública. Cada
// usuario puede tener registrado más de un celular.
router.post('/dispositivo', exigirSesion, async (req, res) => {
  const plataforma = req.body?.plataforma;
  const llavePublica = c.normalizarLlavePublica(req.body?.llavePublica);

  if (!['android', 'ios'].includes(plataforma)) {
    throw new ErrorApi(400, 'PLATAFORMA', 'La plataforma debe ser android o ios.');
  }
  if (!llavePublica) {
    throw new ErrorApi(400, 'LLAVE_NO_SIRVE', 'La llave del celular no es válida (debe ser EC P-256).');
  }

  const claveDispositivo = c.secreto();
  const dispositivoId = await db.transaccion(async (t) => {
    const { insertId } = await t.ejecutar(
      'INSERT INTO dispositivo (usuario_id, clave_hash, llave_publica, plataforma) VALUES (?, ?, ?, ?)',
      [req.usuario.id, c.sha256(claveDispositivo), llavePublica, plataforma],
    );
    await t.ejecutar('UPDATE sesion SET dispositivo_id = ? WHERE id = ?', [insertId, req.sesion.id]);
    return insertId;
  });

  res.json({ dispositivoId, claveDispositivo });
});

// La clave del celular la guarda la app en su almacén seguro y la manda para
// pedir y cumplir el reto. Sin ella no se puede ni pedir un reto.
async function celularRegistrado(claveDispositivo) {
  const dispositivo =
    typeof claveDispositivo === 'string' && claveDispositivo
      ? await db.fila('SELECT * FROM dispositivo WHERE clave_hash = ?', [c.sha256(claveDispositivo)])
      : null;
  if (!dispositivo) {
    throw new ErrorApi(401, 'CELULAR_NO_REGISTRADO', 'Este celular no está registrado. Entra con tu contraseña.');
  }
  return { dispositivo, usuario: await usuarioPorId(dispositivo.usuario_id) };
}

router.post('/reto', async (req, res) => {
  const { dispositivo, usuario } = await celularRegistrado(req.body?.claveDispositivo);
  const reto = await crearReto({ usuario, dispositivo, accion: 'entrar' });
  res.json({ ...reto, usuario: usuarioPublico(usuario) });
});

router.post('/desbloquear', async (req, res) => {
  const { dispositivo, usuario } = await celularRegistrado(req.body?.claveDispositivo);
  await cumplirReto({ retoId: req.body?.retoId, usuario, dispositivo, accion: 'entrar', firma: req.body?.firma });
  const token = await crearSesion(usuario.id, dispositivo.id);
  res.json({ token, usuario: usuarioPublico(usuario) });
});

router.post('/salir', exigirSesion, async (req, res) => {
  await db.ejecutar('UPDATE sesion SET cerrada_en = NOW() WHERE id = ?', [req.sesion.id]);
  res.json({ ok: true });
});

module.exports = router;

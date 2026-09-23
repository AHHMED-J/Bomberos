// /acceso, /registro y /acceso/estacion (RF-01).
//
// SIMULADO: entrar es elegir un usuario de prueba, no hay WebAuthn.
// Lo que sí es real es /registro, que consume un código de codigo_alta
// comparando su SHA-256, sin usar y sin expirar (consulta de la Tabla 3).

'use strict';

const crypto = require('node:crypto');
const express = require('express');

const { filas, fila, ejecutar } = require('../db');
const sesion = require('../sesion');

const router = express.Router();

router.get('/acceso', async (req, res, siguiente) => {
  try {
    const usuarios = await filas(
      `SELECT u.id, u.nombre, u.no_empleado, u.rol, u.cargo, d.nombre AS division
         FROM usuario u
         LEFT JOIN division d ON d.id = u.division_id
         JOIN credencial c ON c.usuario_id = u.id
        ORDER BY FIELD(u.rol, 'bombero', 'revisor', 'direccion'), u.nombre`,
    );
    res.render('acceso', { titulo: 'Acceso', id: 'acceso', usuarios });
  } catch (error) {
    siguiente(error);
  }
});

router.post('/acceso', async (req, res, siguiente) => {
  try {
    const usuario = await fila('SELECT * FROM usuario WHERE id = ?', [Number(req.body.usuario_id)]);
    if (!usuario) return res.redirect('/acceso');

    res.cookie(sesion.COOKIE, usuario.id, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000, // un turno
    });
    res.redirect(sesion.inicioDe(usuario));
  } catch (error) {
    siguiente(error);
  }
});

router.post('/salir', (req, res) => {
  res.clearCookie(sesion.COOKIE);
  res.redirect('/acceso');
});

function pantallaRegistro(res, extra = {}) {
  res.render('registro', {
    titulo: 'Alta de credencial',
    id: 'registro-credencial',
    duenio: null,
    codigo: '',
    error: null,
    ...extra,
  });
}

async function duenioDelCodigo(codigo) {
  const hash = crypto.createHash('sha256').update(codigo).digest('hex');
  return fila(
    `SELECT u.id, u.nombre, u.no_empleado, u.cargo, e.nombre AS estacion, ca.id AS codigo_id
       FROM codigo_alta ca
       JOIN usuario u ON u.id = ca.usuario_id
       LEFT JOIN estacion e ON e.id = u.estacion_id
      WHERE ca.codigo_hash = ? AND ca.usado_en IS NULL AND ca.expira_en > NOW()`,
    [hash],
  );
}

router.get('/registro', (req, res) => pantallaRegistro(res));

router.post('/registro', async (req, res, siguiente) => {
  try {
    const codigo = String(req.body.codigo || '').trim().toUpperCase();
    const duenio = codigo ? await duenioDelCodigo(codigo) : null;

    pantallaRegistro(res, {
      duenio,
      codigo,
      error: duenio
        ? null
        : 'Ese código no existe, ya se usó o pasaron las 24 horas. Pídele otro a la Dirección.',
    });
  } catch (error) {
    siguiente(error);
  }
});

router.post('/registro/credencial', async (req, res, siguiente) => {
  try {
    const codigo = String(req.body.codigo || '').trim().toUpperCase();
    const duenio = await duenioDelCodigo(codigo);

    if (!duenio) {
      return pantallaRegistro(res, {
        error: 'El código dejó de ser válido. Pídele otro a la Dirección.',
      });
    }

    // SIMULADO: en el sistema real esto lo devuelve navigator.credentials
    // .create() y aquí sólo se guardaría la llave pública que trae.
    await ejecutar(
      `INSERT INTO credencial (usuario_id, credential_id, llave_publica)
       VALUES (?, ?, 'SIMULADA · llave pública de ejemplo')
       ON DUPLICATE KEY UPDATE contador = contador + 1`,
      [duenio.id, `demo-cred-${duenio.no_empleado}`],
    );
    await ejecutar('UPDATE codigo_alta SET usado_en = NOW() WHERE id = ?', [duenio.codigo_id]);

    const usuario = await fila('SELECT * FROM usuario WHERE id = ?', [duenio.id]);
    res.cookie(sesion.COOKIE, usuario.id, { httpOnly: true, sameSite: 'lax' });
    res.redirect(sesion.inicioDe(usuario));
  } catch (error) {
    siguiente(error);
  }
});

// La estación del equipo compartido está fija en el prototipo: la Central.
router.get('/acceso/estacion', async (req, res, siguiente) => {
  try {
    const personal = await filas(
      `SELECT u.id, u.nombre, u.no_empleado, u.cargo
         FROM usuario u JOIN credencial c ON c.usuario_id = u.id
        WHERE u.estacion_id = ? ORDER BY u.nombre`,
      [1],
    );
    res.render('acceso-estacion', {
      titulo: 'Equipo compartido',
      id: 'acceso-compartido',
      personal,
    });
  } catch (error) {
    siguiente(error);
  }
});

module.exports = router;

// Lo que las rutas leen y escriben en MySQL. Es el reemplazo de
// app-bomberos/servidor/src/datos.js, que guarda todo en memoria.

'use strict';

const crypto = require('node:crypto');

const db = require('./db');
const { sha256 } = require('./firma');

const DIVISION = 'División Estructural';

// La forma exacta en que la app espera a un usuario.
const COLUMNAS_USUARIO = 'id, nombre, matricula, rango, rol, division, estacion';

function usuarioPorId(id) {
  return db.fila(`SELECT ${COLUMNAS_USUARIO} FROM usuario WHERE id = ?`, [String(id ?? '')]);
}

async function llavesDe(usuarioId) {
  const filas = await db.filas('SELECT llave_publica FROM llave WHERE usuario_id = ?', [String(usuarioId ?? '')]);
  return filas.map((fila) => fila.llave_publica);
}

async function abrirSesion(usuarioId) {
  const token = crypto.randomBytes(24).toString('hex');
  await db.ejecutar('INSERT INTO sesion (token_hash, usuario_id) VALUES (?, ?)', [sha256(token), usuarioId]);
  return token;
}

async function sesionValida(token) {
  return Boolean(token && (await db.fila('SELECT 1 FROM sesion WHERE token_hash = ?', [sha256(token)])));
}

async function partePorFolio(folio) {
  const fila = await db.fila('SELECT datos FROM parte WHERE folio = ?', [folio]);
  return fila ? fila.datos : null;
}

async function partesDonde(condicion, valores) {
  const filas = await db.filas(`SELECT datos FROM parte ${condicion} ORDER BY folio DESC`, valores);
  return filas.map((fila) => fila.datos);
}

// Guarda el parte completo. Se usa con db o dentro de una transacción.
function guardarParte(parte, conexion = db) {
  return conexion.ejecutar(
    `INSERT INTO parte (folio, estado, elaboro_id, division, datos) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE estado = VALUES(estado), elaboro_id = VALUES(elaboro_id),
                             division = VALUES(division), datos = VALUES(datos)`,
    [parte.folio, parte.estado, parte.elaboro_id, parte.division || DIVISION, JSON.stringify(parte)],
  );
}

// PE-<año>-<consecutivo>. LAST_INSERT_ID(valor + 1) hace que dos peticiones
// al mismo tiempo nunca reciban el mismo número.
async function nuevoFolio() {
  const { insertId } = await db.ejecutar(
    "UPDATE consecutivo SET valor = LAST_INSERT_ID(valor + 1) WHERE nombre = 'folio'",
  );
  return `PE-${new Date().getFullYear()}-${String(insertId).padStart(4, '0')}`;
}

module.exports = {
  DIVISION,
  COLUMNAS_USUARIO,
  usuarioPorId,
  llavesDe,
  abrirSesion,
  sesionValida,
  partePorFolio,
  partesDonde,
  guardarParte,
  nuevoFolio,
};

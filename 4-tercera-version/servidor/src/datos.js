// Lo que las rutas leen y escriben en MySQL.

'use strict';

const crypto = require('node:crypto');

const db = require('./db');
const { sha256 } = require('./firma');

const DIVISION = 'División Estructural';

// El renglón completo, con contrasena_hash y llave_publica. No sale del servidor.
function usuarioCompleto(id) {
  return db.fila('SELECT * FROM usuario WHERE id = ?', [String(id ?? '')]);
}

// Lo que la app sabe de un usuario: lo de siempre, más su firma en trazo y si
// ya tiene registrada la llave de su celular.
function usuarioPublico(u) {
  return {
    id: u.id,
    nombre: u.nombre,
    matricula: u.matricula,
    rango: u.rango,
    rol: u.rol,
    division: u.division,
    estacion: u.estacion,
    trazo: u.trazo,
    tiene_llave: Boolean(u.llave_publica),
  };
}

async function usuarioPorId(id) {
  const u = await usuarioCompleto(id);
  return u ? usuarioPublico(u) : null;
}

async function abrirSesion(usuarioId) {
  const token = crypto.randomBytes(24).toString('hex');
  await db.ejecutar('INSERT INTO sesion (token_hash, usuario_id) VALUES (?, ?)', [sha256(token), usuarioId]);
  return token;
}

// Filtro de Express para las rutas que son «de mi cuenta»: deja en
// req.usuario el renglón completo de quien trae el token.
async function exigirSesion(req, res, siguiente) {
  const token = (/^Bearer (.+)$/.exec(req.get('authorization') || '') || [])[1];
  const sesion = token ? await db.fila('SELECT usuario_id FROM sesion WHERE token_hash = ?', [sha256(token)]) : null;
  req.usuario = sesion ? await usuarioCompleto(sesion.usuario_id) : null;
  if (!req.usuario) return res.status(401).json({ error: 'sin_sesion' });
  siguiente();
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

function guardarFirma(conexion, { folio, usuarioId, rol, reto, confirmacion, firma, trazo }) {
  return conexion.ejecutar(
    'INSERT INTO firma_parte (folio, usuario_id, rol, reto, metodo, firma, simulada, trazo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      folio,
      usuarioId,
      rol,
      reto,
      confirmacion.metodo,
      confirmacion.metodo === 'biometria' ? firma : null,
      confirmacion.simulada ? 1 : 0,
      trazo,
    ],
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
  usuarioCompleto,
  usuarioPublico,
  usuarioPorId,
  abrirSesion,
  exigirSesion,
  partePorFolio,
  partesDonde,
  guardarParte,
  guardarFirma,
  nuevoFolio,
};

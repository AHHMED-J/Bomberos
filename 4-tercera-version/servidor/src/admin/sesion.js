// Sesiones del navegador para Administración.
//
// El token va en una cookie HttpOnly (JavaScript no la puede leer, así que un
// script inyectado no se la puede robar) y SameSite=Strict (otra página no la
// puede mandar). En MySQL sólo queda su SHA-256.
//
// Una sesión tiene dos niveles:
//   contrasena  dio su número de empleado y contraseña. Sólo le sirve para
//               confirmar con su llave de acceso, durante 5 minutos.
//   completa    ya confirmó con su llave. Abre la página.

'use strict';

const crypto = require('node:crypto');

const db = require('../db');
const { sha256 } = require('../firma');
const config = require('./config');

function leerCookies(req) {
  const cookies = {};
  for (const parte of (req.get('cookie') || '').split(';')) {
    const i = parte.indexOf('=');
    if (i > 0) cookies[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim());
  }
  return cookies;
}

function ponerCookie(res, nombre, valor, minutos) {
  res.cookie(nombre, valor, {
    httpOnly: true,
    secure: config.COOKIE_SEGURA,
    sameSite: 'strict',
    path: '/',
    maxAge: minutos * 60 * 1000,
  });
}

function borrarCookie(res, nombre) {
  res.clearCookie(nombre, { httpOnly: true, secure: config.COOKIE_SEGURA, sameSite: 'strict', path: '/' });
}

const ipDe = (req) => String(req.ip || req.socket?.remoteAddress || '').slice(0, 45);

async function abrir(req, res, usuarioId, nivel) {
  const token = crypto.randomBytes(32).toString('base64url');
  await db.ejecutar('INSERT INTO sesion_web (token_hash, usuario_id, nivel, ip, agente) VALUES (?, ?, ?, ?, ?)', [
    sha256(token),
    usuarioId,
    nivel,
    ipDe(req),
    String(req.get('user-agent') || '').slice(0, 255),
  ]);
  ponerCookie(res, config.COOKIE_SESION, token, config.SESION_MAXIMA);
  return sha256(token);
}

// La sesión de quien hace la petición, si sigue vigente. Las vigencias se
// comparan en MySQL con NOW() (ver src/db.js).
async function actual(req) {
  const token = leerCookies(req)[config.COOKIE_SESION];
  if (!token) return null;
  const fila = await db.fila(
    `SELECT s.token_hash, s.nivel, s.reto, u.*
       FROM sesion_web s JOIN usuario u ON u.id = s.usuario_id
      WHERE s.token_hash = ?
        AND u.activo = 1 AND u.rol = 'administracion'
        AND s.creada_en > DATE_SUB(NOW(), INTERVAL ? MINUTE)
        AND s.ultimo_uso > DATE_SUB(NOW(), INTERVAL ? MINUTE)
        AND (s.nivel = 'completa' OR s.creada_en > DATE_SUB(NOW(), INTERVAL ? MINUTE))`,
    [sha256(token), config.SESION_MAXIMA, config.SESION_INACTIVA, config.PASO_CONTRASENA],
  );
  if (!fila) return null;
  const { token_hash: tokenHash, nivel, reto, ...usuario } = fila;
  return { tokenHash, nivel, reto, usuario };
}

// Filtro de Express. nivel = 'completa' para casi todo; 'contrasena' acepta
// también la sesión a medias (para registrar o usar la llave de acceso).
function exigir(nivel = 'completa') {
  return async (req, res, siguiente) => {
    const s = await actual(req);
    if (!s) return res.status(401).json({ error: 'sin_sesion' });
    if (nivel === 'completa' && s.nivel !== 'completa') return res.status(401).json({ error: 'falta_llave' });
    // Con una contraseña que le dieron, lo único que puede hacer es cambiarla.
    const libre = req.baseUrl + req.path;
    if (
      s.nivel === 'completa' &&
      s.usuario.debe_cambiar &&
      !/\/acceso\/(contrasena|yo|salir)$/.test(libre)
    ) {
      return res.status(403).json({ error: 'debe_cambiar_contrasena' });
    }
    await db.ejecutar('UPDATE sesion_web SET ultimo_uso = NOW() WHERE token_hash = ?', [s.tokenHash]);
    req.sesion = s;
    req.usuario = s.usuario;
    siguiente();
  };
}

const subirANivelCompleto = (tokenHash) =>
  db.ejecutar("UPDATE sesion_web SET nivel = 'completa', reto = NULL, ultimo_uso = NOW() WHERE token_hash = ?", [tokenHash]);

// Al cambiar de nivel se cambia también el token: el que se vio antes de la
// llave de acceso ya no sirve para nada (evita que alguien fije la sesión).
async function renovar(req, res, s) {
  await db.ejecutar('DELETE FROM sesion_web WHERE token_hash = ?', [s.tokenHash]);
  return abrir(req, res, s.usuario.id, 'completa');
}

async function cerrar(req, res) {
  const token = leerCookies(req)[config.COOKIE_SESION];
  if (token) await db.ejecutar('DELETE FROM sesion_web WHERE token_hash = ?', [sha256(token)]);
  borrarCookie(res, config.COOKIE_SESION);
}

// Cierra todas las sesiones de un usuario (web y app), menos la indicada.
async function cerrarTodas(usuarioId, exceptoTokenHash = '') {
  await db.ejecutar('DELETE FROM sesion_web WHERE usuario_id = ? AND token_hash <> ?', [usuarioId, exceptoTokenHash]);
  await db.ejecutar('DELETE FROM sesion WHERE usuario_id = ?', [usuarioId]);
}

module.exports = {
  leerCookies,
  ponerCookie,
  borrarCookie,
  ipDe,
  abrir,
  actual,
  exigir,
  subirANivelCompleto,
  renovar,
  cerrar,
  cerrarTodas,
};

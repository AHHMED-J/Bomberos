// La API de la página de Administración: /api/admin/…
//
// Defensas, de afuera hacia adentro:
//   1. Encabezados de seguridad (helmet) y nada se guarda en caché.
//   2. Origen: toda petición que cambia algo debe venir de la propia página
//      (encabezado Origin en ADMIN_ORIGENES) y en JSON. Junto con la cookie
//      SameSite=Strict, otra página no puede actuar en nombre de nadie (CSRF).
//   3. Sesión: cookie HttpOnly; contraseña Y llave de acceso (WebAuthn).
//   4. Sólo cuentas con rol «administracion» y activas.
//   5. Límite de intentos al entrar y bitácora de todo lo que se hace.

'use strict';

const express = require('express');
const helmet = require('helmet');

const config = require('./config');
const sesion = require('./sesion');

const CAMBIAN = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function mismoOrigen(req, res, siguiente) {
  if (!CAMBIAN.has(req.method)) return siguiente();
  const origen = req.get('origin');
  if (!origen || !config.ORIGENES.includes(origen)) return res.status(403).json({ error: 'origen_no_permitido' });
  // Si trae cuerpo, debe ser JSON: un formulario de otro sitio no puede mandar
  // JSON sin que el navegador pregunte antes (CORS), y aquí no se le permite.
  const sinCuerpo = req.get('content-length') === '0' || req.is('application/json') === null;
  if (!sinCuerpo && !req.is('application/json')) return res.status(415).json({ error: 'solo_json' });
  siguiente();
}

function crearApi() {
  const api = express.Router();
  api.use(express.json({ limit: '100kb' }));
  api.use((req, _res, siguiente) => {
    req.body ??= {};
    siguiente();
  });
  api.use(helmet());
  api.use((_req, res, siguiente) => {
    res.set('Cache-Control', 'no-store');
    siguiente();
  });
  api.use(mismoOrigen);

  api.use('/acceso', require('./rutas/acceso'));
  api.use('/partes', sesion.exigir(), require('./rutas/partes'));
  api.use('/usuarios', sesion.exigir(), require('./rutas/usuarios'));
  api.use('/bitacora', sesion.exigir(), require('./rutas/bitacora'));
  return api;
}

// Encabezados para la página ya construida (administracion/dist). La política
// de contenido sólo deja cargar lo que viene del mismo servidor: ni scripts de
// otros sitios ni scripts escritos dentro del HTML.
const encabezadosPagina = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      ...(config.COOKIE_SEGURA ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  // HSTS sólo tiene sentido con HTTPS.
  strictTransportSecurity: config.COOKIE_SEGURA,
});

module.exports = { crearApi, encabezadosPagina };

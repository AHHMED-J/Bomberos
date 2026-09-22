// Quién está usando el prototipo.
//
// SIMULADO: /acceso es un selector de usuario de prueba y lo elegido va en
// una cookie. Lo real es que cada parte queda ligado a parte.elaboro_id y
// que la bandeja filtra por la división de quien revisa.

'use strict';

const { fila } = require('./db');

const COOKIE = 'usuario';

// Menú global por rol y por tarea (sección 2.3).
const MENUS = {
  bombero: [
    { texto: 'Inicio', ruta: '/partes', icono: 'inicio' },
    { texto: 'Nuevo parte', ruta: '/partes/nuevo', icono: 'parte' },
    { texto: 'Consulta', ruta: '/consulta', icono: 'lupa' },
  ],
  revisor: [
    { texto: 'Bandeja', ruta: '/revision', icono: 'bandeja' },
    { texto: 'Consulta', ruta: '/consulta', icono: 'lupa' },
  ],
  direccion: [
    { texto: 'Partes', ruta: '/direccion/partes', icono: 'parte' },
    { texto: 'Archivo', ruta: '/direccion/archivo', icono: 'archivo' },
    { texto: 'Personal', ruta: '/direccion/personal', icono: 'persona' },
  ],
};

async function cargar(req, res, siguiente) {
  const id = Number(req.cookies[COOKIE]);
  req.usuario = id
    ? await fila(
        `SELECT u.*, d.nombre AS division, e.nombre AS estacion
           FROM usuario u
           LEFT JOIN division d ON d.id = u.division_id
           LEFT JOIN estacion e ON e.id = u.estacion_id
          WHERE u.id = ?`,
        [id],
      )
    : null;

  res.locals.usuario = req.usuario;
  res.locals.menu = req.usuario ? MENUS[req.usuario.rol] : [];
  res.locals.rutaActual = req.path;
  siguiente();
}

function exigirSesion(req, res, siguiente) {
  if (!req.usuario) return res.redirect('/acceso');
  siguiente();
}

// Devuelve un filtro para poner en las rutas. Se usa asi:
//
//     router.get('/revision', exigirRol('revisor'), ...)
//
// Express corre ese filtro ANTES del manejador de la ruta: si el rol no
// coincide, corta ahi y el manejador nunca se ejecuta.
function exigirRol(rolA, rolB) {
  const permitidos = rolB ? [rolA, rolB] : [rolA];

  return function filtro(req, res, siguiente) {
    if (!req.usuario) return res.redirect('/acceso');

    if (!permitidos.includes(req.usuario.rol)) {
      return res.status(403).render('sin-permiso', {
        titulo: 'Esta pantalla no es de tu rol',
        roles: permitidos,
      });
    }
    siguiente();
  };
}

function inicioDe(usuario) {
  if (usuario.rol === 'revisor') return '/revision';
  if (usuario.rol === 'direccion') return '/direccion/partes';
  return '/partes';
}

module.exports = { COOKIE, MENUS, cargar, exigirSesion, exigirRol, inicioDe };

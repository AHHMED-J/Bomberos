// Ajustes de la página de Administración. Todos salen de servidor/.env; los
// valores de fábrica sirven para probar en esta Mac (http://localhost).
//
//   ADMIN_RP_ID         el dominio de la página. WebAuthn NO acepta una IP:
//                       en la Mac es «localhost»; en la red de la estación,
//                       un nombre como «admin.bomberos.local» con HTTPS.
//   ADMIN_ORIGENES      de dónde puede venir la página, separados por coma:
//                       el servidor de Vite (5180) y el propio servidor (3100).
//   ADMIN_COOKIE_SEGURA 1 = la cookie sólo viaja por HTTPS (obligatorio fuera
//                       de esta Mac). 0 = también por http://localhost.

'use strict';

require('../entorno');

const RP_ID = process.env.ADMIN_RP_ID || 'localhost';
const ORIGENES = (process.env.ADMIN_ORIGENES || 'http://localhost:5180,http://localhost:3100')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const COOKIE_SEGURA = process.env.ADMIN_COOKIE_SEGURA === '1';

module.exports = {
  RP_ID,
  RP_NOMBRE: 'Bomberos de Ensenada · Administración',
  ORIGENES,
  COOKIE_SEGURA,
  // Con HTTPS la cookie lleva el prefijo __Host-: el navegador exige Secure,
  // Path=/ y que no tenga Domain, así que ningún subdominio la puede pisar.
  COOKIE_SESION: COOKIE_SEGURA ? '__Host-bomberos_admin' : 'bomberos_admin',
  COOKIE_RETO: COOKIE_SEGURA ? '__Host-bomberos_reto' : 'bomberos_reto',

  // Tiempos (minutos)
  SESION_INACTIVA: 30, // sin usarla, se cierra
  SESION_MAXIMA: 8 * 60, // un turno; después hay que volver a entrar
  PASO_CONTRASENA: 5, // entre la contraseña y la llave de acceso
  VIGENCIA_RETO: 5,

  // Intentos fallidos antes de esperar
  INTENTOS: 5,
  VENTANA_INTENTOS: 15,

  LARGO_MINIMO_CONTRASENA: 12,
};

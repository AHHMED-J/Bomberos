// Límite de intentos fallidos al entrar: 5 en 15 minutos por número de
// empleado y 20 por dirección IP. Pasado eso, hay que esperar.
//
// Vive en la memoria del servidor: si se reinicia, el conteo vuelve a cero.
// Para una sola Mac basta; con varios servidores iría en MySQL o Redis.

'use strict';

const config = require('./config');

const fallos = new Map(); // llave -> [tiempos en ms]

function recientes(llave) {
  const desde = Date.now() - config.VENTANA_INTENTOS * 60 * 1000;
  const lista = (fallos.get(llave) || []).filter((t) => t > desde);
  if (lista.length) fallos.set(llave, lista);
  else fallos.delete(llave);
  return lista;
}

const llaves = (ip, matricula) => [`ip:${ip}`, `no:${matricula}`];
const tope = (llave) => (llave.startsWith('ip:') ? config.INTENTOS * 4 : config.INTENTOS);

// Segundos que hay que esperar, o 0 si puede intentar.
function espera(ip, matricula) {
  let segundos = 0;
  for (const llave of llaves(ip, matricula)) {
    const lista = recientes(llave);
    if (lista.length >= tope(llave)) {
      const libre = lista[lista.length - tope(llave)] + config.VENTANA_INTENTOS * 60 * 1000;
      segundos = Math.max(segundos, Math.ceil((libre - Date.now()) / 1000));
    }
  }
  return segundos;
}

function fallo(ip, matricula) {
  for (const llave of llaves(ip, matricula)) fallos.set(llave, [...recientes(llave), Date.now()]);
}

function exito(ip, matricula) {
  fallos.delete(`no:${matricula}`);
}

function limpiar() {
  fallos.clear();
}

module.exports = { espera, fallo, exito, limpiar };

// almacen.js — lectura y escritura en localStorage. Puede fallar (modo
// privado, cuota llena), por eso todo va envuelto en try/catch.

'use strict';

function leer(clave, porDefecto) {
  try {
    const v = localStorage.getItem(clave);
    return v ? JSON.parse(v) : porDefecto;
  } catch {
    return porDefecto;
  }
}
function escribir(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}
function borrar(clave) {
  try { localStorage.removeItem(clave); } catch { /* nada que hacer */ }
}

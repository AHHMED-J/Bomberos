// cronometro.js — un cronómetro de tiempo activo por fase (en el lugar / en
// la estación).
//
// Se suma el tiempo entre una interacción con el parte y la siguiente,
// pero un hueco de más de PAUSA_MAX segundos (teléfono guardado, pantalla
// bloqueada, atendiendo la emergencia) cuenta sólo PAUSA_MAX. Así se mide
// lo que cuesta capturar el parte, no lo que dura el incidente. Tomar una
// foto, que abre la cámara, cabe en ese margen.

'use strict';

const PAUSA_MAX = 30;

function faseCronometrada() {
  return estado.fase === 'lugar' || estado.fase === 'estacion' ? estado.fase : null;
}
function hueco() {
  return estado.ultimo === null ? 0 : Math.min((Date.now() - estado.ultimo) / 1000, PAUSA_MAX);
}
function actividad() {
  const f = faseCronometrada();
  if (!f) return;
  estado.seg[f] += hueco();
  estado.ultimo = Date.now();
}
function detener() {
  const f = faseCronometrada();
  if (f) estado.seg[f] += hueco();
  estado.ultimo = null;
}
function segundos(f) {
  return estado.seg[f] + (faseCronometrada() === f ? hueco() : 0);
}
function mmss(s) {
  const t = Math.floor(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}
function pintarCronos() {
  const l = segundos('lugar');
  const e = segundos('estacion');
  $('#t-lugar').textContent = mmss(l);
  $('#t-estacion').textContent = mmss(e);
  $('#t-total').textContent = mmss(l + e);
}

// Cuenta desde el primer toque o tecla dentro del parte, no desde que se
// abre: leer el escenario no cuenta.
for (const ev of ['pointerdown', 'keydown', 'input', 'change']) form.addEventListener(ev, actividad);

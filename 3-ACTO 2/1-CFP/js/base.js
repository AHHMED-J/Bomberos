// base.js — Critical Function Prototype: ¿se puede levantar y enviar un
// parte con los campos mínimos y 1 foto en ≤ 60 s?
//
// Dos fases, como pasa en la realidad:
//   1. En el lugar: se abre el parte, se registra ubicación + hora y se
//      guarda para continuar después (o se envía ahí mismo).
//   2. En la estación: se retoma el borrador y se termina.
// Cada fase tiene su propio cronómetro de tiempo activo. El borrador se
// guarda solo en localStorage con cada cambio; los intentos también, y se
// exportan a CSV.
//
// Los js/ son scripts clásicos (no módulos) para que el CFP abra con
// doble clic desde file://; comparten variables globales y por eso el
// orden de los <script> en index.html importa: almacen → base →
// cronometro → parte → evidencia → intentos → app.

'use strict';

// Perfil simulado: el usuario 1 del seed de 1-primera-version/app/db.
const PERFIL = {
  unidad: 'Unidad 12',
  turno: 'A',
  estacion: 'Estación Central',
  personal: [
    { nombre: 'Jalife Burgueño, Ahhmed', empleado: '376285' },
    { nombre: 'Acevedo Carrillo, Verónica', empleado: '380207' },
  ],
};
const ESCENARIO = 'pastizal-01';
const LS_PARTE = 'cfp-parte';
const LS_INTENTOS = 'cfp-intentos';
const LS_PARTICIPANTE = 'cfp-participante';
const GRUPOS_FILAS = ['personal', 'apoyo', 'instituciones'];

const $ = (sel) => document.querySelector(sel);
const form = $('#parte');

let estado = estadoNuevo();
let fotos = [];
let fotosEnProceso = 0;          // fotos que se están comprimiendo

function estadoNuevo() {
  return {
    fase: 'inicio',              // inicio | lugar | guardado | estacion | enviado
    seg: { lugar: 0, estacion: 0 },
    ultimo: null,                // Date.now() de la última interacción en la fase actual
    participante: '',
    inicio: null,
    guardadoEn: null,
    regreso: null,               // ISO de cuando se presionó «Regreso»
    ubicacion: null,             // «Llegada»: { hora, lat, lng, precision, direccion, pendiente, error }
    auto: {},                    // "nombre#índice" → valor que se llenó solo
  };
}

// --- Fechas y horas -------------------------------------------------------

const dos = (n) => String(n).padStart(2, '0');
const fechaISO = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
const horaHHMM = (d) => `${dos(d.getHours())}:${dos(d.getMinutes())}`;
const fechaHora = (d) => `${fechaISO(d)} ${horaHHMM(d)}:${dos(d.getSeconds())}`; // hora local, no UTC

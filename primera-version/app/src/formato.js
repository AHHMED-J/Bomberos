// Cómo se ven fechas, horas y estados en pantalla. Va en app.locals.f.

'use strict';

const ESTADOS = {
  borrador: { texto: 'Borrador',    clase: 'status--pending' },
  enviado:  { texto: 'En revisión', clase: 'status--pending' },
  devuelto: { texto: 'Devuelto',    clase: 'status--returned' },
  validado: { texto: 'Validado',    clase: '' },
};

const dos = (n) => String(n).padStart(2, '0');

function fecha(valor) {
  if (!valor) return '—';
  const texto = typeof valor === 'string' ? valor : valor.toISOString().slice(0, 10);
  const [anio, mes, dia] = texto.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

function fechaCorta(valor) {
  const completa = fecha(valor);
  return completa === '—' ? completa : completa.slice(0, 5);
}

function hora(valor) {
  return valor ? String(valor).slice(0, 5) : '—';
}

function momento(valor) {
  if (!valor) return '—';
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} · ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

function estado(clave) {
  return ESTADOS[clave] || { texto: clave, clase: '' };
}

function texto(valor, sustituto = '—') {
  return valor === null || valor === undefined || String(valor).trim() === ''
    ? sustituto
    : String(valor);
}

// Para los value= de <input type="date"> y <input type="time">.
const valorFecha = (v) => (v ? (typeof v === 'string' ? v.slice(0, 10) : v.toISOString().slice(0, 10)) : '');
const valorHora = (v) => (v ? String(v).slice(0, 5) : '');

/* --- Listas para las vistas --------------------------------------------
   Sin esto, el HTML tendria que llevar .map() y .join() adentro. Aqui se
   escriben una vez con un ciclo normal y la vista queda leyendose sola. */

// Pega los textos de una lista. Si no hay nada, devuelve una raya.
function unir(textos, separador) {
  if (!textos.length) return '—';
  return textos.join(separador || ' · ');
}

// "Jalife Burgueño, Ahhmed (No. 376285) · Acevedo Carrillo, Verónica (No. 380207)"
function listaPersonal(personal, separador) {
  const textos = [];
  for (const p of personal || []) {
    textos.push(p.nombre + ' (No. ' + p.no_empleado + ')');
  }
  return unir(textos, separador);
}

// Sólo los nombres, para voluntarios y testigos.
function listaNombres(personas, separador) {
  const textos = [];
  for (const p of personas || []) {
    textos.push(p.nombre);
  }
  return unir(textos, separador);
}

// "Cruz Roja — a cargo de Dr. X · U-12". Con conCargo en falso se omite
// quién venía a cargo, que es como lo enseña la pantalla de firma.
function listaApoyos(apoyos, separador, conCargo) {
  const textos = [];
  for (const a of apoyos || []) {
    let texto = a.institucion || a.no_unidad;
    if (conCargo && a.a_cargo_de) texto += ' — ' + a.a_cargo_de;
    textos.push(texto);
  }
  return unir(textos, separador);
}

// "Rivera Chávez, Josselyn Alexa (Comandante) · ..."
function listaRevisores(revisores, separador) {
  const textos = [];
  for (const r of revisores || []) {
    textos.push(r.nombre + ' (' + r.cargo + ')');
  }
  return unir(textos, separador);
}

module.exports = {
  fecha, fechaCorta, hora, momento, estado, texto, valorFecha, valorHora,
  unir, listaPersonal, listaNombres, listaApoyos, listaRevisores,
};

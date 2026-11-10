// parte.js — los campos del parte: filas dinámicas, autollenado, guardar y
// restaurar valores, conteo de campos y validación de los mínimos.

'use strict';

function camposConNombre() {
  return [...form.elements].filter((el) => el.name && el.type !== 'file');
}
function clave(el) {
  const iguales = camposConNombre().filter((e) => e.name === el.name);
  return `${el.name}#${iguales.indexOf(el)}`;
}
function autollenar(el, valor) {
  el.value = valor;
  estado.auto[clave(el)] = valor;
}

function agregarFila(grupo) {
  const fila = $(`#fila-${grupo}`).content.firstElementChild.cloneNode(true);
  const cont = $(`[data-filas="${grupo}"]`);
  const n = cont.children.length + 1;
  for (const inp of fila.querySelectorAll('input')) {
    inp.setAttribute('aria-label', `${inp.dataset.etiqueta}, renglón ${n}`);
  }
  cont.append(fila);
  return fila;
}
for (const btn of document.querySelectorAll('[data-agregar]')) {
  btn.addEventListener('click', () => agregarFila(btn.dataset.agregar).querySelector('input').focus());
}

function valores() {
  const v = {};
  for (const el of camposConNombre()) {
    if (el.type === 'radio') {
      if (el.checked) v[el.name] = el.value;
      continue;
    }
    (v[el.name] ??= []).push(el.value);
  }
  return v;
}

function restaurar(v) {
  // Primero tantas filas como se guardaron, luego cada valor en su lugar.
  for (const grupo of GRUPOS_FILAS) {
    $(`[data-filas="${grupo}"]`).replaceChildren();
    const nombres = [...$(`#fila-${grupo}`).content.querySelectorAll('input')].map((i) => i.name);
    const n = Math.max(1, ...nombres.map((nm) => (v[nm] || []).length));
    for (let i = 0; i < n; i++) agregarFila(grupo);
  }
  const indice = {};
  for (const el of camposConNombre()) {
    if (el.type === 'radio') {
      if (v[el.name] !== undefined) el.checked = v[el.name] === el.value;
      continue;
    }
    const i = (indice[el.name] = (indice[el.name] ?? -1) + 1);
    el.value = (v[el.name] || [])[i] ?? '';
  }
}

function conteo() {
  let total = 0, llenos = 0, auto = 0;
  const indice = {};
  for (const el of camposConNombre()) {
    if (el.type === 'radio') continue;
    const i = (indice[el.name] = (indice[el.name] ?? -1) + 1);
    total++;
    if (!el.value.trim()) continue;
    llenos++;
    if (estado.auto[`${el.name}#${i}`] === el.value) auto++;
  }
  return { total, llenos, auto, escritos: llenos - auto };
}

// --- Horas hh:mm (24 h) ---------------------------------------------------
// Se teclean sólo los dígitos: con "02" el campo pone los dos puntos y
// pasa a los minutos; con "30" pasa solo al siguiente campo
// (data-siguiente). Un primer dígito de 3 a 9 se toma como 03…09.

const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

function marcarHora(inp) {
  const invalida = inp.value !== '' && !HORA_VALIDA.test(inp.value);
  if (invalida) inp.setAttribute('aria-invalid', 'true');
  else inp.removeAttribute('aria-invalid');
}

for (const inp of document.querySelectorAll('input.hora')) {
  inp.addEventListener('input', (e) => {
    let d = inp.value.replace(/\D/g, '').slice(0, 4);
    if (d.length === 1 && d > '2') d = `0${d}`;
    const borrando = (e.inputType || '').startsWith('delete');
    if (d.length > 2) inp.value = `${d.slice(0, 2)}:${d.slice(2)}`;
    else inp.value = d.length === 2 && !borrando ? `${d}:` : d;
    if (d.length < 4) {
      inp.removeAttribute('aria-invalid');
      return;
    }
    marcarHora(inp);
    if (HORA_VALIDA.test(inp.value)) $(`#${inp.dataset.siguiente}`).focus();
  });
  // Si al salir sólo se escribió la hora, se completa: "7" → 07:00. Con
  // minutos a medias ("23:0") no se adivina: se marca para corregir.
  inp.addEventListener('blur', () => {
    const d = inp.value.replace(/\D/g, '');
    if (d.length === 1 || d.length === 2) inp.value = `${d.padStart(2, '0')}:00`;
    marcarHora(inp);
  });
}

// --- Validación de los campos mínimos ------------------------------------

function faltantes() {
  const f = [];
  if (!$('#c5').value.trim()) f.push(['c5', 'No. de incidente de C-5']);
  if (!$('#tipo').value) f.push(['tipo', 'Tipo de servicio']);
  if (!$('#lugar').value.trim()) f.push(['lugar', 'Lugar del servicio (escríbelo o usa el botón «Llegada»)']);
  if (!$('#descripcion').value.trim()) f.push(['descripcion', 'Descripción del incidente']);
  if (!fotos.length) f.push(['foto-input', 'Al menos 1 foto']);
  for (const [id, nombre] of [['salida', 'Hora de salida'], ['llegada', 'Hora de llegada'], ['regreso', 'Hora de regreso']]) {
    const v = $(`#${id}`).value;
    if (v && !HORA_VALIDA.test(v)) f.push([id, `${nombre} (usa hh:mm, de 00:00 a 23:59)`]);
  }
  return f;
}

// Mientras se comprime una foto, o se busca la ubicación sin que haya un
// lugar escrito, «Enviar» espera: si no, marcaría como faltante algo que
// está por llegar.
function actualizarEnviar() {
  const ocupado = fotosEnProceso > 0 || Boolean(estado.ubicacion?.pendiente && !$('#lugar').value.trim());
  const btn = $('#enviar');
  btn.disabled = ocupado;
  btn.textContent = ocupado ? 'Procesando…' : 'Enviar hoja de incidente';
}

function limpiarErrores() {
  $('#errores').hidden = true;
  for (const el of form.querySelectorAll('[aria-invalid]')) el.removeAttribute('aria-invalid');
}

function mostrarErrores(lista) {
  limpiarErrores();
  const caja = $('#errores');
  const titulo = document.createElement('p');
  titulo.textContent = 'Revisa estos campos:';
  const ul = document.createElement('ul');
  for (const [id, texto] of lista) {
    if (id !== 'foto-input') $(`#${id}`).setAttribute('aria-invalid', 'true');
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = texto;
    btn.addEventListener('click', () => {
      const destino = id === 'foto-input' ? $('.agregar-foto') : $(`#${id}`);
      destino.scrollIntoView({ block: 'center' });
      destino.focus();
    });
    li.append(btn);
    ul.append(li);
  }
  caja.replaceChildren(titulo, ul);
  caja.hidden = false;
}

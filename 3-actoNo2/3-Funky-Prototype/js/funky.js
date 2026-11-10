// funky.js — Funky Prototype: el CFP (captura rápida del parte) + la idea
// rescatada del Dark Horse (parte multijugador).
//
// Tres teléfonos en la misma página comparten un solo parte: lo que se
// escribe en uno aparece en los otros al momento. Cada teléfono muestra
// dónde está cada quien: la sección (con todos los colores si hay varias
// personas) y el campo exacto (borde e inicial de su color). Nadie bloquea
// a nadie. Sólo el jefe de turno crea el parte, registra llegada y
// regreso, y lo envía.

'use strict';

const USUARIOS = [
  { id: 'jefe', rol: 'Jefe de turno', inicial: 'J', color: '#B3261E' },
  { id: 'maquinista', rol: 'Maquinista', inicial: 'M', color: '#1F5FAD' },
  { id: 'bombero', rol: 'Bombero', inicial: 'B', color: '#2E7D4F' },
];
const OBLIGATORIOS = [
  ['c5', 'C-5'],
  ['tipo', 'tipo de servicio'],
  ['lugar', 'lugar'],
  ['descripcion', 'descripción'],
];

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const usuario = (id) => USUARIOS.find((u) => u.id === id);
const dos = (n) => String(n).padStart(2, '0');
const horaHHMM = (d) => `${dos(d.getHours())}:${dos(d.getMinutes())}`;

let estado = estadoNuevo();
const dispositivos = []; // { u, raiz, form }

function estadoNuevo() {
  return {
    abierto: false,   // el jefe ya creó el parte
    enviado: false,
    unidos: [],       // ids de usuario, en el orden en que se unieron
    valores: {},      // data-campo → valor
    fotos: [],        // data URL
    presencia: {},    // id de usuario → { seccion, campo } donde está ahora
    llegada: null,    // ISO
    regreso: null,    // ISO
    faltan: [],
  };
}

// --- Construcción de los tres teléfonos ----------------------------------

function clonar(id) {
  return $(`#${id}`).content.firstElementChild.cloneNode(true);
}

for (const u of USUARIOS) {
  const raiz = clonar('tpl-dispositivo');
  raiz.dataset.usuario = u.id;
  raiz.style.setProperty('--color', u.color);
  $('.rol', raiz).textContent = u.rol;

  const form = clonar('tpl-parte');
  // Los id se repetirían entre teléfonos: se generan por usuario.
  for (const el of $$('[data-campo]:not([type="radio"])', form)) el.id = `${u.id}-${el.dataset.campo}`;
  for (const l of $$('label[data-para]', form)) l.htmlFor = `${u.id}-${l.dataset.para}`;
  $('[data-foto]', form).id = `${u.id}-foto`;
  $('.v-parte', raiz).append(form);

  for (const el of $$(u.id === 'jefe' ? '.solo-otros' : '.solo-jefe', raiz)) el.remove();
  $('#telefonos').append(raiz);

  const d = { u, raiz, form };
  dispositivos.push(d);
  conectar(d);
}

// --- Eventos de cada teléfono --------------------------------------------

function conectar(d) {
  const { u, raiz, form } = d;

  const alEscribir = (e) => {
    const campo = e.target.dataset?.campo;
    if (!campo) return;
    estado.valores[campo] = e.target.value;
    for (const otro of dispositivos) if (otro !== d) ponerValor(otro, campo);
    if (estado.faltan.length) {
      estado.faltan = [];
      pintar();
    }
  };
  form.addEventListener('input', alEscribir);
  form.addEventListener('change', alEscribir);

  // Tocar o enfocar algo dice dónde está esta persona: sección y campo.
  const ubicar = (e) => {
    const seccion = e.target.closest('[data-seccion]')?.dataset.seccion;
    if (!seccion || seccion === 'personal') return;
    const campo = e.target.closest('[data-campo]')?.dataset.campo ??
      (e.target.closest('.fotos') ? 'fotos' : null);
    const antes = estado.presencia[u.id];
    if (antes?.seccion === seccion && antes.campo === campo) return;
    estado.presencia[u.id] = { seccion, campo };
    pintarPresencia();
  };
  form.addEventListener('pointerdown', ubicar);
  form.addEventListener('focusin', ubicar);

  raiz.addEventListener('click', (e) => {
    const accion = e.target.closest('[data-accion]')?.dataset.accion;
    if (accion) ACCIONES[accion](u.id);
  });

  $('[data-foto]', form).addEventListener('change', async (e) => {
    for (const archivo of e.target.files) {
      try {
        estado.fotos.push(await comprimir(archivo));
      } catch {
        alert('No se pudo leer esa imagen.');
      }
    }
    e.target.value = '';
    estado.faltan = [];
    pintar();
  });
}

const ACCIONES = {
  nuevo() {
    estado.abierto = true;
    estado.unidos = ['jefe'];
    pintar();
  },
  unirse(id) {
    if (!estado.unidos.includes(id)) estado.unidos.push(id);
    pintar();
  },
  // Sólo los que se unieron pueden salir; el jefe es dueño del parte.
  salir(id) {
    estado.unidos = estado.unidos.filter((u) => u !== id);
    delete estado.presencia[id];
    pintar();
  },
  llegada: registrarLlegada,
  regreso() {
    estado.regreso = new Date().toISOString();
    fijar('regreso', horaHHMM(new Date(estado.regreso)));
    pintar();
  },
  enviar() {
    estado.faltan = OBLIGATORIOS.filter(([c]) => !(estado.valores[c] || '').trim()).map(([, n]) => n);
    if (!estado.fotos.length) estado.faltan.push('1 foto');
    if (!estado.faltan.length) estado.enviado = true;
    pintar();
  },
};

// --- Valores compartidos -------------------------------------------------

function ponerValor(d, campo) {
  const valor = estado.valores[campo] ?? '';
  for (const el of $$(`[data-campo="${campo}"]`, d.form)) {
    if (el.type === 'radio') el.checked = el.value === valor;
    else el.value = valor;
  }
}
function fijar(campo, valor) {
  estado.valores[campo] = valor;
  for (const d of dispositivos) ponerValor(d, campo);
}


// --- Llegada: hora + ubicación (la misma lógica del CFP) ------------------

async function direccionDe(lat, lng) {
  const ctrl = new AbortController();
  const limite = setTimeout(() => ctrl.abort(), 8000);
  try {
    const url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1' +
      `&accept-language=es&lat=${lat}&lon=${lng}`;
    const resp = await fetch(url, { signal: ctrl.signal });
    if (!resp.ok) return null;
    const a = (await resp.json()).address || {};
    const calle = [a.road, a.house_number].filter(Boolean).join(' ');
    let colonia = a.neighbourhood || a.suburb || a.quarter || '';
    if (colonia && !/^col/i.test(colonia)) colonia = `Col. ${colonia}`;
    const partes = [calle, colonia, a.city || a.town || a.village].filter(Boolean);
    return partes.length ? partes.join(', ') : null;
  } catch {
    return null;
  } finally {
    clearTimeout(limite);
  }
}

function registrarLlegada() {
  const ahora = new Date();
  const marca = ahora.toISOString();
  estado.llegada = marca;
  fijar('llegada', horaHHMM(ahora));
  pintar();
  if (!('geolocation' in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      if (estado.llegada !== marca) return;
      const { latitude: lat, longitude: lng } = pos.coords;
      const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      if (!(estado.valores.lugar || '').trim()) fijar('lugar', coords);
      const direccion = await direccionDe(lat, lng);
      // Sólo si nadie escribió otro lugar mientras tanto.
      if (direccion && estado.llegada === marca && estado.valores.lugar === coords) fijar('lugar', direccion);
    },
    () => {},
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  );
}

// --- Fotos -----------------------------------------------------------------

function cargarImagen(src) {
  return new Promise((ok, mal) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = mal;
    img.src = src;
  });
}
async function comprimir(archivo) {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await cargarImagen(url);
    const escala = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(img.naturalWidth * escala);
    lienzo.height = Math.round(img.naturalHeight * escala);
    lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
    return lienzo.toDataURL('image/jpeg', 0.7);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// --- Pintar ----------------------------------------------------------------

function pintar() {
  for (const d of dispositivos) {
    const { u, raiz, form } = d;
    const unido = estado.unidos.includes(u.id);
    let vista = 'invitacion';
    if (!estado.abierto) vista = 'sin-parte';
    else if (unido) vista = estado.enviado ? 'enviado' : 'parte';
    for (const v of ['sin-parte', 'invitacion', 'parte', 'enviado']) $(`.v-${v}`, raiz).hidden = v !== vista;
    const salir = $('.salir', raiz);
    if (salir) salir.hidden = vista !== 'parte';

    // Quiénes están en el parte.
    $('.unidos', raiz).replaceChildren(...estado.unidos.map((id) => {
      const a = document.createElement('span');
      a.className = 'avatar';
      a.style.setProperty('--c', usuario(id).color);
      a.textContent = usuario(id).inicial;
      a.title = usuario(id).rol;
      return a;
    }));

    $('.personas', form).replaceChildren(...estado.unidos.map((id) => {
      const p = document.createElement('div');
      p.className = 'persona';
      p.style.setProperty('--c', usuario(id).color);
      p.innerHTML = '<span class="punto"></span>';
      p.append(usuario(id).rol);
      return p;
    }));

    pintarFotos(d);

    for (const [campo, iso] of [['llegada', estado.llegada], ['regreso', estado.regreso]]) {
      const marca = $(`[data-marca="${campo}"]`, form);
      if (!marca) continue;
      marca.textContent = iso ? `✓ ${horaHHMM(new Date(iso))}` : marca.dataset.vacio;
      marca.closest('.btn-registro').classList.toggle('hecho', Boolean(iso));
    }

    const faltan = $('.faltan', form);
    if (faltan) {
      faltan.hidden = !estado.faltan.length;
      faltan.textContent = `Falta: ${estado.faltan.join(', ')}`;
    }
  }
  pintarPresencia();
}

function pintarFotos(d) {
  const cont = $('.fotos', d.form);
  cont.replaceChildren();
  estado.fotos.forEach((src, i) => {
    const caja = document.createElement('div');
    caja.className = 'foto';
    const img = document.createElement('img');
    img.src = src;
    img.alt = `Foto ${i + 1}`;
    const quitar = document.createElement('button');
    quitar.type = 'button';
    quitar.textContent = 'Quitar';
    quitar.addEventListener('click', () => {
      estado.fotos.splice(i, 1);
      pintar();
    });
    caja.append(img, quitar);
    cont.append(caja);
  });
  const agregar = document.createElement('label');
  agregar.className = 'agregar-foto';
  agregar.htmlFor = `${d.u.id}-foto`;
  agregar.tabIndex = 0;
  agregar.innerHTML = '<span aria-hidden="true">+</span><span>Agregar</span>';
  cont.append(agregar);
}

// Dónde está cada quien. En la sección: una etiqueta por persona y una
// barra lateral con todos sus colores. En el campo: un borde por persona
// (anillos concéntricos si son varias) y sus iniciales. En el teléfono
// propio la etiqueta dice «Tú» y el campo no se marca: ya tiene el foco.
function pintarPresencia() {
  const ubicados = USUARIOS.filter((u) => estado.presencia[u.id]);
  for (const d of dispositivos) {
    for (const sec of $$('[data-seccion]', d.form)) {
      const aqui = ubicados.filter((u) => estado.presencia[u.id].seccion === sec.dataset.seccion);
      const presentes = $('.presentes', sec);
      if (presentes) {
        presentes.replaceChildren(...aqui.map((u) => {
          const p = document.createElement('span');
          p.className = 'presente';
          p.style.setProperty('--c', u.color);
          p.textContent = u.id === d.u.id ? 'Tú' : u.rol;
          return p;
        }));
      }
      sec.classList.toggle('con-gente', aqui.length > 0);
      const n = aqui.length;
      sec.style.setProperty('--barra', `linear-gradient(${aqui.map((u, i) =>
        `${u.color} ${(i / n) * 100}% ${((i + 1) / n) * 100}%`).join(', ') || 'transparent, transparent'})`);
    }

    for (const el of $$('.en-campo', d.form)) {
      el.classList.remove('en-campo');
      el.style.removeProperty('--anillos');
      $('.iniciales', el)?.remove();
    }
    const porCampo = {};
    for (const u of ubicados) {
      const { campo } = estado.presencia[u.id];
      if (campo && u.id !== d.u.id) (porCampo[campo] ??= []).push(u);
    }
    for (const [campo, quienes] of Object.entries(porCampo)) {
      const caja = campo === 'fotos' ? $('.fotos', d.form)
        : campo === 'zona' ? $('.segmentado', d.form)
        : $(`[data-campo="${campo}"]`, d.form);
      if (!caja) continue;
      caja.classList.add('en-campo');
      caja.style.setProperty('--anillos', quienes.map((u, i) => `0 0 0 ${2 + i * 3}px ${u.color}`).join(', '));
      // Las iniciales van en la etiqueta del campo (o junto a la caja si no tiene).
      const ancla = campo === 'fotos' ? $('.etiqueta', caja.closest('.seccion'))
        : caja.closest('.campo')?.querySelector('label, legend') ?? caja.closest('.fila');
      const iniciales = document.createElement('span');
      iniciales.className = 'iniciales';
      for (const u of quienes) {
        const i = document.createElement('span');
        i.style.setProperty('--c', u.color);
        i.textContent = u.inicial;
        i.title = u.rol;
        iniciales.append(i);
      }
      ancla.classList.add('en-campo');
      ancla.append(iniciales);
    }
  }
}

// --- Reiniciar ---------------------------------------------------------------

$('#reiniciar').addEventListener('click', () => {
  estado = estadoNuevo();
  for (const d of dispositivos) d.form.reset();
  pintar();
});

pintar();

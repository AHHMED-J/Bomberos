// evidencia.js — lo que se registra con un toque: hora de llegada +
// ubicación, hora de regreso, y las fotos.

'use strict';

const ERRORES_GEO = {
  1: 'no se dio permiso de ubicación',
  2: 'el dispositivo no pudo obtener la ubicación',
  3: 'se tardó demasiado en obtener la ubicación',
};

// Las horas las escribe el botón siempre (para eso se presiona). La fecha y
// el lugar, sólo si están vacíos o si todavía tienen lo que puso el botón:
// nunca se pisa una dirección escrita a mano.
function llenarSiLibre(el, valor) {
  if (!el.value.trim() || el.value === estado.auto[clave(el)]) autollenar(el, valor);
}

const coordenadas = (u) => `${u.lat.toFixed(5)}, ${u.lng.toFixed(5)}`;

// Dirección a partir de las coordenadas (OpenStreetMap). Si no hay red o
// tarda más de 8 s, el lugar se queda con las coordenadas.
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

// Botón «Regreso»: la hora de regreso a la estación.
function registrarRegreso() {
  estado.regreso = new Date().toISOString();
  autollenar($('#regreso'), horaHHMM(new Date(estado.regreso)));
  pintarRegistro();
}
$('#btn-regreso').addEventListener('click', registrarRegreso);

// Botón «Llegada»: la hora de llegada y la ubicación, que va al lugar del
// servicio como dirección o, si no se encuentra, como coordenadas.
function registrarLlegada() {
  const ahora = new Date();
  const marca = ahora.toISOString();
  const vigente = () => estado.ubicacion?.hora === marca; // no se volvió a registrar mientras tanto
  estado.ubicacion = { hora: marca, pendiente: true };
  autollenar($('#llegada'), horaHHMM(ahora));
  llenarSiLibre($('#fecha'), fechaISO(ahora));
  pintarRegistro();

  if (!('geolocation' in navigator)) {
    Object.assign(estado.ubicacion, { pendiente: false, error: 'este navegador no da la ubicación' });
    pintarRegistro();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      if (!vigente()) return;
      const u = estado.ubicacion;
      Object.assign(u, {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        precision: Math.round(pos.coords.accuracy),
      });
      const lugar = $('#lugar');
      llenarSiLibre(lugar, coordenadas(u));
      pintarRegistro();
      const direccion = await direccionDe(u.lat, u.lng);
      if (!vigente()) return;
      u.pendiente = false;
      if (direccion) {
        u.direccion = direccion;
        llenarSiLibre(lugar, direccion);
      }
      pintarRegistro();
    },
    (err) => {
      if (!vigente()) return;
      Object.assign(estado.ubicacion, { pendiente: false, error: ERRORES_GEO[err.code] || err.message });
      pintarRegistro();
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  );
}
$('#btn-llegada').addEventListener('click', registrarLlegada);

function pintarBoton(id, iso, textoVacio) {
  const btn = $(`#btn-${id}`);
  btn.classList.toggle('hecho', Boolean(iso));
  $(`#${id}-marca`).textContent = iso ? `✓ ${horaHHMM(new Date(iso))}` : textoVacio;
}

function pintarRegistro() {
  const u = estado.ubicacion;
  pintarBoton('llegada', u?.hora, 'Hora y ubicación');
  pintarBoton('regreso', estado.regreso, 'Registrar hora');

  // En pantalla sólo se avisa mientras busca o si algo falló; cuando sale
  // bien, el resultado ya se ve en la hora de llegada y el lugar.
  const aviso = $('#ubicacion-estado');
  let texto = '';
  if (u?.error) texto = `Sin ubicación: ${u.error}. Escribe el lugar.`;
  else if (u?.pendiente) texto = u.lat === undefined ? 'Obteniendo ubicación…' : 'Buscando la dirección…';
  else if (u && u.lat === undefined) texto = 'No se obtuvo la ubicación. Escribe el lugar.';
  aviso.textContent = texto;
  aviso.hidden = !texto;
  actualizarEnviar();
  programarGuardado();
}

// --- Fotos ----------------------------------------------------------------
// Se reducen a 800 px para que quepan en el borrador de localStorage.

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

$('#foto-input').addEventListener('change', async (e) => {
  const archivos = [...e.target.files];
  fotosEnProceso += archivos.length;
  actualizarEnviar();
  for (const archivo of archivos) {
    try {
      fotos.push(await comprimir(archivo));
    } catch {
      alert('No se pudo leer esa imagen.');
    } finally {
      fotosEnProceso--;
    }
  }
  e.target.value = '';
  pintarFotos();
});

function pintarFotos() {
  const cont = $('#fotos');
  cont.replaceChildren();
  fotos.forEach((src, i) => {
    const caja = document.createElement('div');
    caja.className = 'foto';
    const img = document.createElement('img');
    img.src = src;
    img.alt = `Foto ${i + 1}`;
    const quitar = document.createElement('button');
    quitar.type = 'button';
    quitar.textContent = 'Quitar';
    quitar.setAttribute('aria-label', `Quitar foto ${i + 1}`);
    quitar.addEventListener('click', () => {
      fotos.splice(i, 1);
      pintarFotos();
    });
    caja.append(img, quitar);
    cont.append(caja);
  });
  const agregar = document.createElement('label');
  agregar.className = 'agregar-foto';
  agregar.htmlFor = 'foto-input';
  agregar.tabIndex = 0;
  agregar.innerHTML = '<span aria-hidden="true">+</span><span>Agregar</span>';
  agregar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      $('#foto-input').click();
    }
  });
  cont.append(agregar);
  actualizarEnviar();
  programarGuardado();
}

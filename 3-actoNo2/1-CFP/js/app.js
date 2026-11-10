// app.js — el flujo del parte: nuevo → en el lugar → guardado → en la
// estación → enviado. Se carga al último porque arranca la página.

'use strict';

// --- Vistas ---------------------------------------------------------------

function mostrar(fase) {
  estado.fase = fase;
  $('#vista-inicio').hidden = fase !== 'inicio';
  $('#vista-guardado').hidden = fase !== 'guardado';
  $('#vista-enviado').hidden = fase !== 'enviado';
  form.hidden = !faseCronometrada();
  // La fase en curso se marca en el panel de prueba, no en la pantalla.
  $('#fila-lugar').classList.toggle('activa', fase === 'lugar');
  $('#fila-estacion').classList.toggle('activa', fase === 'estacion');
  window.scrollTo(0, 0);
  pintarCronos();
}

// --- Borrador automático -------------------------------------------------
// Se guarda solo con cada cambio y al salir de la página (recargar sin
// querer, «atrás», cerrar la pestaña). Al volver se continúa en la misma
// fase. El tiempo con la página cerrada no cuenta.

const FASES_CON_BORRADOR = ['lugar', 'estacion', 'guardado'];
let temporizadorGuardado = null;

function guardarBorrador() {
  clearTimeout(temporizadorGuardado);
  if (!FASES_CON_BORRADOR.includes(estado.fase)) return true;
  const foto = { ...estado, seg: { lugar: segundos('lugar'), estacion: segundos('estacion') }, ultimo: null };
  return escribir(LS_PARTE, { estado: foto, valores: valores(), fotos });
}
function programarGuardado() {
  clearTimeout(temporizadorGuardado);
  temporizadorGuardado = setTimeout(guardarBorrador, 400);
}
form.addEventListener('input', () => {
  actualizarEnviar();
  programarGuardado();
});
form.addEventListener('change', programarGuardado);
window.addEventListener('pagehide', guardarBorrador);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) guardarBorrador();
});

// --- Flujo ----------------------------------------------------------------

function nuevoParte() {
  const participante = $('#participante').value.trim();
  if (!participante) {
    $('#aviso-participante').hidden = false;
    $('#participante').focus();
    return;
  }
  $('#aviso-participante').hidden = true;
  estado = estadoNuevo();
  estado.participante = participante;
  estado.inicio = fechaHora(new Date());
  fotos = [];
  form.reset();
  restaurar({});
  limpiarErrores();

  // Lo que el sistema ya sabe por la sesión del usuario se llena solo.
  autollenar($('#fecha'), fechaISO(new Date()));
  autollenar($('#unidad'), PERFIL.unidad);
  autollenar($('#turno'), PERFIL.turno);
  autollenar($('#estacion'), PERFIL.estacion);
  $('[data-filas="personal"]').replaceChildren();
  for (const p of PERFIL.personal) {
    const [nombre, empleado] = agregarFila('personal').querySelectorAll('input');
    autollenar(nombre, p.nombre);
    autollenar(empleado, p.empleado);
  }

  pintarFotos();
  pintarRegistro();
  mostrar('lugar');
  guardarBorrador();
}
$('#nuevo-parte').addEventListener('click', nuevoParte);
$('#otro-parte').addEventListener('click', () => mostrar('inicio'));

function guardar() {
  detener();
  const fase = estado.fase;
  estado.fase = 'guardado';
  estado.guardadoEn = new Date().toISOString();
  if (!guardarBorrador()) {
    estado.fase = fase;
    alert('No se pudo guardar el borrador: la memoria del navegador está llena o bloqueada. Quita alguna foto e inténtalo de nuevo.');
    return;
  }
  pintarGuardado();
  mostrar('guardado');
}
$('#guardar').addEventListener('click', guardar);

function pintarGuardado() {
  $('#guardado-texto').textContent =
    `Se guardó a las ${horaHHMM(new Date(estado.guardadoEn))}. ` +
    `C-5: ${$('#c5').value.trim() || 'sin capturar'}.`;
  const pendientes = faltantes();
  const cont = $('#guardado-pendientes');
  cont.replaceChildren();
  if (pendientes.length) {
    const p = document.createElement('p');
    p.textContent = 'Falta para poder enviarlo:';
    const ul = document.createElement('ul');
    for (const [, texto] of pendientes) {
      const li = document.createElement('li');
      li.textContent = texto;
      ul.append(li);
    }
    cont.append(p, ul);
  }
}

$('#continuar').addEventListener('click', () => {
  mostrar('estacion');
  actividad(); // la fase 2 cuenta desde que se retoma el parte
  guardarBorrador();
});

$('#descartar').addEventListener('click', () => {
  if (!confirm('¿Descartar este parte? No se guarda como intento.')) return;
  estado = estadoNuevo();
  borrar(LS_PARTE);
  mostrar('inicio');
});

function enviar() {
  const lista = faltantes();
  if (lista.length) {
    mostrarErrores(lista); // el cronómetro sigue: corregir también cuesta tiempo
    return;
  }
  limpiarErrores();
  const desde = estado.fase;
  detener();
  const c = conteo();
  const u = estado.ubicacion;
  const r1 = (s) => Math.round(s * 10) / 10;
  const intento = {
    id: intentos.reduce((max, i) => Math.max(max, i.id), 0) + 1,
    participante: estado.participante,
    escenario: ESCENARIO,
    inicio: estado.inicio,
    seg_lugar: r1(estado.seg.lugar),
    seg_estacion: r1(estado.seg.estacion),
    seg_total: r1(estado.seg.lugar + estado.seg.estacion),
    enviado_desde: desde,
    boton_llegada: u ? horaHHMM(new Date(u.hora)) : '',
    boton_regreso: estado.regreso ? horaHHMM(new Date(estado.regreso)) : '',
    ubicacion_registrada: u?.lat !== undefined ? 'sí' : 'no',
    precision_m: u?.precision ?? '',
    fotos: fotos.length,
    campos_totales: c.total,
    campos_llenos: c.llenos,
    campos_autollenados: c.auto,
    campos_escritos: c.escritos,
  };
  intentos.push(intento);
  escribir(LS_INTENTOS, intentos);
  mostrar('enviado'); // antes de borrar: con esta fase ya no se vuelve a guardar el borrador
  borrar(LS_PARTE);
  pintarIntentos();
  pintarEnviado(intento);
}
$('#enviar').addEventListener('click', enviar);

function pintarEnviado(i) {
  const filas = [
    ['Fase 1 · En el lugar', mmss(i.seg_lugar)],
    ['Fase 2 · En la estación', mmss(i.seg_estacion)],
    ['Total', mmss(i.seg_total)],
    ['Campos escritos a mano', i.campos_escritos],
    ['Campos que se llenaron solos', i.campos_autollenados],
    ['Fotos', i.fotos],
    ['Ubicación registrada', i.ubicacion_registrada],
  ];
  $('#enviado-resumen').replaceChildren(...filas.map(([dt, dd]) => {
    const div = document.createElement('div');
    const t = document.createElement('dt');
    t.textContent = dt;
    const d = document.createElement('dd');
    d.textContent = dd;
    div.append(t, d);
    return div;
  }));
}

// --- Arranque -------------------------------------------------------------

const participante = $('#participante');
participante.value = leer(LS_PARTICIPANTE, '');
participante.addEventListener('input', () => {
  escribir(LS_PARTICIPANTE, participante.value);
  $('#aviso-participante').hidden = true;
});

pintarIntentos();
const borrador = leer(LS_PARTE, null);
if (borrador) {
  estado = { ...estadoNuevo(), ...borrador.estado, ultimo: null };
  // Si se guardó mientras buscaba la ubicación, esa búsqueda ya no va a volver.
  if (estado.ubicacion) estado.ubicacion.pendiente = false;
  fotos = borrador.fotos || [];
  restaurar(borrador.valores || {});
  pintarFotos();
  pintarRegistro();
  // Si la página se cerró a media fase, se sigue en esa fase.
  if (faseCronometrada()) {
    mostrar(estado.fase);
  } else {
    pintarGuardado();
    mostrar('guardado');
  }
} else {
  restaurar({});
  mostrar('inicio');
}
setInterval(pintarCronos, 250);

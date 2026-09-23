// Recorre el prototipo de principio a fin y comprueba 29 cosas.
//
// Es el Flujo 3 combinado con el 1 (figuras 3 y 5) más los permisos: crear
// el borrador, los cuatro pasos, firmar, la bandeja del revisor por
// división, devolver con nota, corregir, validar, sellar y las pantallas de
// la Dirección.
//
// No usa navegador: habla con el servidor por HTTP, igual que lo haría una
// persona haciendo clic. Sirve para tres cosas: comprobar que un cambio no
// rompió nada, demostrar el sistema sin hacer clics, y dejar escrito cuál
// es el recorrido completo.
//
// Antes de correrlo hace falta:  npm run db:crear  y luego  npm start
// Después:  npm run probar

'use strict';

const BASE = process.env.URL_PRUEBA || 'http://localhost:3000';

let fallos = 0;

// Imprime el resultado de una comprobación y lleva la cuenta.
function ok(paso, titulo, detalle) {
  console.log((paso ? '  ok   ' : ' FALLA ') + titulo + (detalle ? ' · ' + detalle : ''));
  if (!paso) fallos += 1;
}

// Una sesión es un navegador de mentiras: guarda la cookie que le dio el
// servidor y la vuelve a mandar en cada petición.
function sesionNueva() {
  let cookie = '';

  async function pide(ruta, opciones) {
    const config = opciones || {};
    const cabeceras = { cookie: cookie };

    if (config.body) {
      cabeceras['content-type'] = 'application/x-www-form-urlencoded';
    }

    const respuesta = await fetch(BASE + ruta, {
      method: config.method || 'GET',
      body: config.body,
      headers: cabeceras,
      redirect: 'manual',            // no seguir el redirect: queremos verlo
    });

    const nueva = respuesta.headers.get('set-cookie');
    if (nueva) cookie = nueva.split(';')[0];

    return {
      estado: respuesta.status,
      destino: respuesta.headers.get('location'),
      texto: await respuesta.text(),
    };
  }

  function post(ruta, datos) {
    return pide(ruta, { method: 'POST', body: new URLSearchParams(datos) });
  }

  return { pide: pide, post: post };
}

// Entra al prototipo como el usuario de prueba que se le indique.
async function entrar(usuarioId) {
  const sesion = sesionNueva();
  await sesion.post('/acceso', { usuario_id: usuarioId });
  return sesion;
}

// Saca el id del parte de una URL como /partes/11/datos
function idDeLaRuta(ruta) {
  const encontrado = String(ruta || '').match(/\/partes\/(\d+)\//);
  if (!encontrado) return 0;
  return Number(encontrado[1]);
}

// Los datos del paso 1. Ojo: zona y turno son ENUM en la base, así que sólo
// aceptan los valores que declara schema.sql.
const DATOS_DEL_SERVICIO = {
  no_incidente_c5: 'C5-2026-99001',
  fecha: '2026-09-22',
  hora_salida: '08:10',
  hora_regreso: '09:40',
  unidad_id: '1',
  turno: 'A',
  estacion_id: '1',
  tipo_servicio_id: '1',
  zona: 'urbana',
  despacho: 'C-5 Ensenada',
  lugar_servicio: 'Calle de prueba 100',
};

async function probar() {
  let r;

  // Se comprueba que las pantallas de acceso se dibujan.
  console.log('\n— Las pantallas de acceso —');
  const anonimo = sesionNueva();
  // Devuelve 200 OK y la página de acceso, no un redirect a /registro.
  for (const ruta of ['/acceso', '/acceso/estacion', '/registro']) {
    r = await anonimo.pide(ruta);
    ok(r.estado === 200, 'GET ' + ruta, String(r.estado));
  }

  // Se comprueba que el QR de la estación se dibuja completo desde el parcial.
  r = await anonimo.pide('/acceso/estacion');
  const cuadros = (r.texto.match(/<rect/g) || []).length;
  ok(cuadros === 285, 'el QR se dibuja completo desde el parcial', cuadros + ' rect');

  console.log('\n— Flujo 3 + 1: del borrador al sellado —');
  // Se entra como bombero y se recorre el flujo completo, paso a paso.
  const bombero = await entrar(1);

  // Se comprueba que la Johnson Box de Mis partes se dibuja.
  r = await bombero.pide('/partes');
  ok(r.estado === 200 && r.texto.includes('Mis partes'), '1 · Johnson Box del bombero');

  // Se crea un nuevo parte y se comprueba que devuelve el id del borrador.
  r = await bombero.pide('/partes/nuevo');
  const id = idDeLaRuta(r.destino);
  ok(id > 0, '2 · Nuevo parte crea el borrador', 'id ' + id);

  
  r = await bombero.pide('/partes/' + id + '/firma');
  ok(r.destino === '/partes/' + id + '/datos?incompleto=1',
    '3 · la puerta de la Figura 3 manda al primer paso que falta', String(r.destino));

  r = await bombero.post('/partes/' + id + '/datos', DATOS_DEL_SERVICIO);
  ok(r.destino === '/partes/' + id + '/personas',
    '4 · paso 1 guarda y pasa al 2', String(r.destino));

  r = await bombero.post('/partes/' + id + '/personal', { usuario_id: '2' });
  ok(r.destino === '/partes/' + id + '/personas', '5 · agregar personal de turno');

  r = await bombero.post('/partes/' + id + '/personas', {
    propietario_nombre: 'Propietario de prueba',
    propietario_telefono: '646-000-0000',
  });
  ok(r.destino === '/partes/' + id + '/croquis',
    '6 · paso 2 guarda y pasa al 3', String(r.destino));

  // El paso 3 es el croquis. Se genera con Gemini y se dibuja en SVG.
  const descripcion = 'Incendio en una casa de dos pisos; la unidad quedo sobre la calle.';

  // Se simula la llamada a Gemini, que devuelve un JSON con los elementos del croquis.
  r = await bombero.post('/partes/' + id + '/croquis/generar', { descripcion: descripcion });
  ok(r.destino === '/partes/' + id + '/croquis',
    '7 · generar croquis (simulado)', String(r.destino));

  // Se pide la página del croquis y se comprueba que el SVG se dibujó.
  r = await bombero.pide('/partes/' + id + '/croquis');
  ok(r.texto.includes('<svg'), '8 · el croquis quedo dibujado');

  // Se guarda la descripción del croquis y se pasa al paso 4.
  r = await bombero.post('/partes/' + id + '/croquis', { descripcion: descripcion });
  ok(r.destino === '/partes/' + id + '/firma', '9 · paso 3 pasa al 4', String(r.destino));


  // El paso 4 es la firma. Se puede firmar sin decidir el peritaje, pero no se
  //puede cerrar el parte hasta que se decida. Se simula la firma y el cierre.
  r = await bombero.post('/partes/' + id + '/firma', {});
  ok(r.destino === '/partes/' + id + '/firma?falta_peritaje=1',
    '10 · firmar sin decidir el peritaje no pasa', String(r.destino));

  
  r = await bombero.post('/partes/' + id + '/cierre', { requiere_peritaje: '1' });
  ok(r.destino === '/partes/' + id + '/firma', '11 · el cierre guarda el peritaje');

  r = await bombero.post('/partes/' + id + '/firma', {});
  ok(r.destino === '/partes/' + id + '/enviado', '12 · firmar y enviar', String(r.destino));

  r = await bombero.pide('/partes/' + id + '/enviado');
  ok(r.estado === 200 && /PE-\d{4}-\d{4}/.test(r.texto), '13 · comprobante con folio');

  console.log('\n— El revisor —');
  const revisor = await entrar(3);          // Rivera Chávez · Estructural

  r = await revisor.pide('/revision');
  ok(r.texto.includes('Calle de prueba 100'),
    '14 · el parte cayó en la bandeja de su división');

  const otroRevisor = await entrar(4);      // Tamayo Salcedo · Rescate urbano

  r = await otroRevisor.pide('/revision/' + id);
  ok(r.estado === 403, '15 · un revisor de otra división no lo abre ni por URL', String(r.estado));

  r = await otroRevisor.post('/revision/' + id, { decision: 'validar' });
  ok(r.estado === 403, '16 · tampoco lo valida por POST directo', String(r.estado));

  r = await revisor.post('/revision/' + id, { decision: 'devolver', nota: '' });
  ok(r.destino === '/revision/' + id + '?falta_nota=1',
    '17 · devolver sin nota no procede', String(r.destino));

  r = await revisor.post('/revision/' + id, {
    decision: 'devolver',
    nota: 'Falta el numero de NUC',
    paso: 'datos',
  });
  ok(r.destino === '/revision?ver=devueltos', '18 · devuelto con nota', String(r.destino));

  r = await bombero.pide('/partes');
  ok(r.texto.includes('Falta el numero de NUC'), '19 · la nota aparece en la Johnson Box');

  // El bombero corrige lo que le pidieron y vuelve a firmar.
  const corregido = Object.assign({}, DATOS_DEL_SERVICIO);
  corregido.nuc = 'NUC-99001';

  await bombero.post('/partes/' + id + '/datos', corregido);
  await bombero.post('/partes/' + id + '/firma', {});

  r = await bombero.pide('/partes/' + id + '/enviado');
  ok(r.estado === 200, '20 · corregido y vuelto a enviar');

  r = await revisor.post('/revision/' + id, { decision: 'validar' });
  ok(r.destino === '/revision/' + id, '21 · validado', String(r.destino));

  r = await revisor.post('/revision/' + id, { decision: 'devolver', nota: 'ya no' });
  ok(r.destino === '/revision/' + id,
    '22 · ya validado: no se puede devolver ni volver a decidir');

  console.log('\n— Las dos salidas de Consulta —');
  r = await bombero.pide('/consulta');
  ok(r.texto.includes('/partes/' + id + '/enviado'), '23 · el bombero entra a su comprobante');

  r = await revisor.pide('/consulta');
  ok(r.texto.includes('/revision/' + id), '24 · el revisor entra a la revisión');

  console.log('\n— La Dirección —');
  const direccion = await entrar(5);

  const pantallas = [
    '/direccion/partes',
    '/direccion/partes/' + id,
    '/direccion/archivo',
    '/direccion/personal',
  ];
  for (const ruta of pantallas) {
    r = await direccion.pide(ruta);
    ok(r.estado === 200, '25 · GET ' + ruta, String(r.estado));
  }

  r = await direccion.pide('/direccion/partes/' + id + '/sellado');
  ok(r.estado === 200 && r.texto.includes('SHA-256'), '26 · el documento sellado se abre');

  console.log('\n— Permisos cruzados —');
  r = await revisor.pide('/partes/' + id + '/datos');
  ok(r.estado === 403, '27 · el revisor no entra a la captura', String(r.estado));

  const otroBombero = await entrar(2);
  r = await otroBombero.pide('/partes/' + id + '/datos');
  ok(r.estado === 403, '28 · un parte ajeno no se edita', String(r.estado));

  r = await otroBombero.pide('/partes/99999/datos');
  ok(r.estado === 404, '29 · un parte que no existe da 404', String(r.estado));
}

probar()
  .then(function () {
    console.log(fallos === 0 ? '\nTODO VERDE\n' : '\n' + fallos + ' FALLAS\n');
    process.exit(fallos === 0 ? 0 : 1);
  })
  .catch(function (error) {
    console.error('\nNo se pudo terminar la prueba:', error.message);
    console.error('¿Está corriendo el servidor? Levántalo con  npm start\n');
    process.exit(1);
  });

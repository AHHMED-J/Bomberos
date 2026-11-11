// Prueba de punta a punta contra la base de DB_NAME: hace las mismas
// llamadas que la app (app-bomberos/movil/lib/datos/repositorio_remoto.dart).
// El celular se simula con una llave P-256 hecha con node:crypto, que entrega
// la llave en PEM y la firma en base64, igual que biometric_signature.
//
//   npm run probar
//
// Crea usuarios y partes de prueba nuevos en cada corrida. Úsalo solo con la
// base de desarrollo.

'use strict';

require('dotenv').config({ quiet: true });

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');

const { crearBase } = require('./cargar-bd');
const { darDeAlta, restablecer } = require('./usuario');
const db = require('../src/db');
const { crearApp } = require('../src/server');
const { contenidoParaFirmar, sha256 } = require('../src/de-la-app').validacion;

const ejemplos = require(path.join(__dirname, '..', '..', '..', 'app-bomberos', 'servidor', 'src', 'datos')).partes;

// Trazos como los serializa la app (LienzoFirma): puntos «x,y» separados por espacios.
const TRAZO_AUTOR = '10,40 30,12 55,48 80,20';
const TRAZO_REVISOR = '8,30 40,8 70,44|20,50 90,50';

let base;
let total = 0;

async function pedir(metodo, ruta, cuerpo, token) {
  const respuesta = await fetch(base + ruta, {
    method: metodo,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { ...(await respuesta.json()), http: respuesta.status };
}
const get = (ruta) => pedir('GET', ruta);
const post = (ruta, cuerpo = {}, token = null) => pedir('POST', ruta, cuerpo, token);

async function paso(nombre, prueba) {
  await prueba();
  total++;
  console.log(`  ok  ${nombre}`);
}

function celular() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return {
    llavePublica: publicKey.export({ type: 'spki', format: 'pem' }),
    firmar: (reto) => crypto.sign('sha256', Buffer.from(reto, 'utf8'), privateKey).toString('base64'),
  };
}

function esError(respuesta, estado, codigo) {
  assert.equal(respuesta.http, estado, JSON.stringify(respuesta));
  assert.equal(respuesta.error, codigo, JSON.stringify(respuesta));
}

function esOk(respuesta) {
  assert.equal(respuesta.http, 200, JSON.stringify(respuesta));
}

async function probar() {
  const sufijo = String(crypto.randomInt(100000, 999999));
  const division = `División de prueba ${sufijo}`;
  const matAutor = `9${sufijo}`;
  const matCapitan = `8${sufijo}`;
  const autor = await darDeAlta({ matricula: matAutor, nombre: 'Autor de prueba', division });
  const capitan = await darDeAlta({ matricula: matCapitan, nombre: 'Cap. de prueba', capitan: true, division });
  const celAutor = celular();
  let tokenAutor;
  let tokenCapitan;
  let claveCapitan = capitan.contrasena;

  // --- Entrar con el usuario y la contraseña que entrega Dirección -----------

  await paso('salud', async () => {
    const r = await get('/api/salud');
    esOk(r);
    assert.equal(r.ok, true);
  });

  await paso('número de empleado o contraseña equivocados', async () => {
    esError(await post('/api/acceso/entrar', { no_empleado: matAutor, contrasena: 'no-es' }), 401, 'credenciales_incorrectas');
    esError(await post('/api/acceso/entrar', { no_empleado: 'nadie', contrasena: 'x' }), 401, 'credenciales_incorrectas');
    esError(await post('/api/acceso/entrar', { no_empleado: matAutor }), 401, 'credenciales_incorrectas');
  });

  await paso('entra con su número de empleado y su contraseña', async () => {
    const r = await post('/api/acceso/entrar', { no_empleado: matAutor, contrasena: autor.contrasena });
    esOk(r);
    assert.deepEqual(r.usuario, {
      id: autor.id,
      nombre: 'Autor de prueba',
      matricula: matAutor,
      rango: 'Bombero',
      rol: 'editor',
      division,
      estacion: 'Central',
      trazo: null,
      tiene_llave: false,
    });
    tokenAutor = r.token;
    const c = await post('/api/acceso/entrar', { no_empleado: matCapitan, contrasena: capitan.contrasena });
    assert.equal(c.usuario.rol, 'capitan');
    tokenCapitan = c.token;
  });

  await paso('las rutas de la cuenta piden sesión', async () => {
    esError(await post('/api/acceso/trazo', { trazo: TRAZO_AUTOR }), 401, 'sin_sesion');
    esError(await post('/api/acceso/llave', { llave_publica: celAutor.llavePublica }, 'inventado'), 401, 'sin_sesion');
  });

  // --- Cambiar la contraseña ----------------------------------------------------

  await paso('el usuario cambia su contraseña', async () => {
    const nueva = `nueva-${sufijo}`;
    esError(await post('/api/acceso/contrasena', { actual: 'no-es', nueva }, tokenCapitan), 401, 'contrasena_incorrecta');
    esError(await post('/api/acceso/contrasena', { actual: claveCapitan, nueva: 'corta' }, tokenCapitan), 400, 'contrasena_corta');
    esOk(await post('/api/acceso/contrasena', { actual: claveCapitan, nueva }, tokenCapitan));
    esError(await post('/api/acceso/entrar', { no_empleado: matCapitan, contrasena: claveCapitan }), 401, 'credenciales_incorrectas');
    esOk(await post('/api/acceso/entrar', { no_empleado: matCapitan, contrasena: nueva }));
    claveCapitan = nueva;
  });

  // --- La biometría del celular (un celular por usuario) -----------------------

  await paso('registra la llave de su celular, y solo una', async () => {
    esError(await post('/api/acceso/llave', {}, tokenAutor), 400, 'falta_llave_publica');
    esOk(await post('/api/acceso/llave', { llave_publica: celAutor.llavePublica }, tokenAutor));
    esError(await post('/api/acceso/llave', { llave_publica: celular().llavePublica }, tokenAutor), 409, 'ya_tiene_celular');
  });

  await paso('entra con la biometría: firma el reto con la llave del celular', async () => {
    const { reto } = await post('/api/acceso/reto', { usuario_id: autor.id });
    assert.match(reto, /^[0-9a-f]{32}:acceso$/);
    const cuerpo = { usuario_id: autor.id, reto, firma: celAutor.firmar(reto) };
    const r = await post('/api/acceso/verificar', cuerpo);
    esOk(r);
    assert.equal(r.simulada, false);
    assert.equal(r.usuario.tiene_llave, true);
    assert.equal(typeof r.token, 'string');
    esError(await post('/api/acceso/verificar', cuerpo), 401, 'reto_usado');
  });

  await paso('la firma de otra llave, o sin llave registrada, no entra', async () => {
    let reto = (await post('/api/acceso/reto', { usuario_id: autor.id })).reto;
    esError(await post('/api/acceso/verificar', { usuario_id: autor.id, reto, firma: celular().firmar(reto) }), 401, 'firma_invalida');
    reto = (await post('/api/acceso/reto', { usuario_id: capitan.id })).reto;
    esError(await post('/api/acceso/verificar', { usuario_id: capitan.id, reto, firma: celAutor.firmar(reto) }), 401, 'sin_llave_publica');
  });

  await paso('retos desconocidos y vencidos', async () => {
    esError(await post('/api/acceso/reto', { usuario_id: 'u-nadie' }), 404, 'usuario_desconocido');
    esError(await post('/api/acceso/verificar', { usuario_id: autor.id, reto: 'inventado:acceso', firma: 'x' }), 401, 'reto_desconocido');
    const { reto } = await post('/api/acceso/reto', { usuario_id: autor.id });
    await db.ejecutar('UPDATE reto SET creado_en = DATE_SUB(NOW(), INTERVAL 6 MINUTE) WHERE reto = ?', [reto]);
    esError(await post('/api/acceso/verificar', { usuario_id: autor.id, reto, firma: celAutor.firmar(reto) }), 401, 'reto_vencido');
  });

  // --- El autor llena y envía -----------------------------------------------------

  let parte;
  const retoDe = async (p) => (await post(`/api/partes/${p.folio}/reto`, { contenido: contenidoParaFirmar(p) })).reto;
  const enviar = (p, confirmacion) => post(`/api/partes/${p.folio}/enviar`, { parte: p, ...confirmacion });

  await paso('los folios nuevos no se repiten', async () => {
    const uno = await post('/api/partes/folio');
    const dos = await post('/api/partes/folio');
    assert.match(uno.folio, /^PE-\d{4}-\d{4,}$/);
    assert.notEqual(uno.folio, dos.folio);
    // Un parte como los que arma la app, con ese folio y con croquis.
    parte = {
      ...structuredClone(ejemplos.get('PE-2026-0150')),
      id: `loc-${sufijo}`,
      folio: uno.folio,
      estado: 'enProgreso',
      elaboro_id: autor.id,
      elaboro_nombre: 'Autor de prueba',
      division,
      croquis_png: `croquis/loc-${sufijo}.png`,
      enviado_en: null,
    };
  });

  await paso('sin su firma en trazo no puede enviar', async () => {
    const reto = await retoDe(parte);
    esError(await enviar(parte, { reto, firma: celAutor.firmar(reto) }), 409, 'falta_trazo');
  });

  await paso('sube su firma en trazo', async () => {
    esError(await post('/api/acceso/trazo', {}, tokenAutor), 400, 'falta_trazo');
    const r = await post('/api/acceso/trazo', { trazo: TRAZO_AUTOR }, tokenAutor);
    esOk(r);
    assert.equal(r.usuario.trazo, TRAZO_AUTOR);
    esOk(await post('/api/acceso/trazo', { trazo: TRAZO_REVISOR }, tokenCapitan));
  });

  await paso('no se envía con pendientes ni con el contenido cambiado', async () => {
    const incompleto = structuredClone(parte);
    incompleto.campos.descripcion.valor = '';
    let reto = await retoDe(incompleto);
    const r = await enviar(incompleto, { reto, firma: celAutor.firmar(reto) });
    esError(r, 422, 'pendientes');
    assert.deepEqual(r.pendientes, ['Descripción del incidente']);

    reto = await retoDe(parte);
    const cambiado = structuredClone(parte);
    cambiado.campos.lugar_servicio.valor = 'Otra calle';
    esError(await enviar(cambiado, { reto, firma: celAutor.firmar(reto) }), 409, 'contenido_cambio');
  });

  await paso('no se envía con la firma de otro celular ni con otra contraseña', async () => {
    let reto = await retoDe(parte);
    esError(await enviar(parte, { reto, firma: celular().firmar(reto) }), 401, 'firma_invalida');
    reto = await retoDe(parte);
    esError(await enviar(parte, { reto, contrasena: 'no-es' }), 401, 'contrasena_incorrecta');
    // La confirmación fallida gastó el reto: no se puede seguir probando con él.
    esError(await enviar(parte, { reto, contrasena: autor.contrasena }), 401, 'reto_usado');
  });

  await paso('el autor confirma con la biometría y el parte pasa a revisión con su trazo', async () => {
    const reto = await retoDe(parte);
    const firma = celAutor.firmar(reto);
    const r = await enviar(parte, { reto, firma });
    esOk(r);
    assert.equal(r.parte.estado, 'enviado');
    assert.equal(r.parte.nota, null);
    assert.equal(r.parte.firmas.elaboro, firma);
    assert.equal(r.parte.firmas.elaboro_trazo, TRAZO_AUTOR);
    assert.equal(r.firma_simulada, false);
  });

  await paso('ya enviado, no se puede volver a enviar', async () => {
    const reto = await retoDe(parte);
    esError(await enviar(parte, { reto, firma: celAutor.firmar(reto) }), 409, 'ya_enviado');
  });

  await paso('el parte sale en "mis partes" y en la bandeja de su división', async () => {
    const mios = await get(`/api/partes?usuario=${autor.id}`);
    assert.deepEqual(mios.partes.map((p) => p.folio), [parte.folio]);
    const bandeja = await get(`/api/revision/bandeja?division=${encodeURIComponent(division)}`);
    assert.deepEqual(bandeja.partes.map((p) => `${p.folio}:${p.estado}`), [`${parte.folio}:enviado`]);
    assert.deepEqual(bandeja.partes[0].campos, parte.campos);
    assert.equal(bandeja.partes[0].croquis_png, parte.croquis_png);
  });

  // --- El revisor devuelve y luego valida -----------------------------------------

  const validar = (confirmacion, revisorId = capitan.id) =>
    post(`/api/revision/${parte.folio}/validar`, { revisor_id: revisorId, ...confirmacion });

  await paso('el revisor lo devuelve con una nota y no queda sellado', async () => {
    esError(await post(`/api/revision/${parte.folio}/devolver`, { nota: ' ', revisor_id: capitan.id }), 400, 'falta_nota');
    esError(await post('/api/revision/PE-0000-0000/devolver', { nota: 'x' }), 404, 'no_existe');
    const r = await post(`/api/revision/${parte.folio}/devolver`, {
      nota: 'Falta la hora de control.',
      seccion: 'Datos del servicio',
      revisor_id: capitan.id,
    });
    esOk(r);
    assert.equal(r.parte.estado, 'devuelto');
    assert.equal(r.parte.nota.revisor, 'Cap. de prueba');
    assert.equal(r.parte.sello ?? null, null);
    esError(await get(`/api/partes/${parte.folio}/sello`), 409, 'sin_sello');
  });

  await paso('devuelto no se puede validar', async () => {
    const reto = await retoDe(parte);
    esError(await validar({ reto, contrasena: claveCapitan }), 409, 'no_espera_revision');
  });

  await paso('el autor actualiza su trazo, corrige y vuelve a firmar, ahora con su contraseña', async () => {
    const trazoNuevo = '5,5 60,40 95,10';
    esOk(await post('/api/acceso/trazo', { trazo: trazoNuevo }, tokenAutor));
    // La app manda el parte como lo tiene: con lo que el servidor le agregó.
    parte = (await get(`/api/partes?usuario=${autor.id}`)).partes[0];
    parte.campos.descripcion.valor += ' Fuego controlado a las 15:10.';
    const reto = await retoDe(parte);
    const r = await enviar(parte, { reto, contrasena: autor.contrasena });
    esOk(r);
    assert.equal(r.parte.estado, 'enviado');
    assert.equal(r.parte.firmas.elaboro, 'contrasena');
    assert.equal(r.parte.firmas.elaboro_trazo, trazoNuevo);
    parte = r.parte;
  });

  await paso('solo valida un revisor de la división, y nunca quien llenó el parte', async () => {
    const reto = await retoDe(parte);
    const comoAutor = { reto, contrasena: autor.contrasena };
    esError(await validar(comoAutor, autor.id), 403, 'no_es_revisor');
    await db.ejecutar("UPDATE usuario SET rol = 'capitan' WHERE id = ?", [autor.id]);
    esError(await validar(comoAutor, autor.id), 403, 'es_su_parte');
    await db.ejecutar("UPDATE usuario SET rol = 'editor' WHERE id = ?", [autor.id]);

    const ajeno = await darDeAlta({ matricula: `7${sufijo}`, nombre: 'Cap. de otra división', capitan: true, division: 'Otra' });
    esError(await validar({ reto, contrasena: ajeno.contrasena }, ajeno.id), 403, 'otra_division');
  });

  await paso('el revisor no valida con una contraseña equivocada', async () => {
    const reto = await retoDe(parte);
    esError(await validar({ reto, contrasena: 'no-es' }), 401, 'contrasena_incorrecta');
  });

  let sello;

  await paso('el revisor confirma con su contraseña: queda validado, con su trazo y sellado', async () => {
    const reto = await retoDe(parte);
    const r = await validar({ reto, contrasena: claveCapitan });
    esOk(r);
    assert.equal(r.parte.estado, 'validado');
    assert.equal(r.parte.firmas.revisor_id, capitan.id);
    assert.equal(r.parte.firmas.revisor_trazo, TRAZO_REVISOR);
    assert.match(r.parte.sello, /^[0-9a-f]{64}$/);
    sello = r.parte.sello;
    const otraVez = await retoDe(parte);
    esError(await validar({ reto: otraVez, contrasena: claveCapitan }), 409, 'no_espera_revision');
  });

  await paso('quedan guardadas las firmas, con la copia del trazo de ese momento', async () => {
    const firmas = await db.filas('SELECT rol, usuario_id, metodo, trazo FROM firma_parte WHERE folio = ? ORDER BY id', [parte.folio]);
    assert.deepEqual(
      firmas.map((f) => `${f.rol}:${f.usuario_id}:${f.metodo}:${f.trazo}`),
      [
        `autor:${autor.id}:biometria:${TRAZO_AUTOR}`,
        `autor:${autor.id}:contrasena:5,5 60,40 95,10`,
        `revisor:${capitan.id}:contrasena:${TRAZO_REVISOR}`,
      ],
    );
  });

  // --- Verificar sello ------------------------------------------------------------

  await paso('verificar sello: coincide', async () => {
    const r = await get(`/api/partes/${parte.folio}/sello`);
    esOk(r);
    assert.equal(r.sello, sello);
    assert.equal(r.coincide, true);
  });

  await paso('si el usuario cambia su trazo después, el sello sigue coincidiendo', async () => {
    esOk(await post('/api/acceso/trazo', { trazo: '1,1 2,2' }, tokenCapitan));
    assert.equal((await get(`/api/partes/${parte.folio}/sello`)).coincide, true);
  });

  await paso('si alguien cambia un dato, una firma o el croquis, el sello ya no coincide', async () => {
    const cambios = [
      "JSON_SET(datos, '$.campos.lugar_servicio.valor', 'Otra calle')",
      "JSON_SET(datos, '$.firmas.revisor_trazo', '9,9 1,1')",
      "JSON_SET(datos, '$.firmas.elaboro_trazo', '9,9 1,1')",
      "JSON_SET(datos, '$.croquis_png', 'croquis/otro.png')",
      "JSON_SET(datos, '$.fotos', 9)",
    ];
    const original = (await db.fila('SELECT CAST(datos AS CHAR) AS texto FROM parte WHERE folio = ?', [parte.folio])).texto;
    for (const cambio of cambios) {
      await db.ejecutar(`UPDATE parte SET datos = ${cambio} WHERE folio = ?`, [parte.folio]);
      assert.equal((await get(`/api/partes/${parte.folio}/sello`)).coincide, false, cambio);
      await db.ejecutar('UPDATE parte SET datos = ? WHERE folio = ?', [original, parte.folio]);
    }
    assert.equal((await get(`/api/partes/${parte.folio}/sello`)).coincide, true);
  });

  // --- Dirección restablece el acceso ---------------------------------------------

  await paso('restablecer: contraseña nueva y el celular se puede registrar otra vez', async () => {
    const { contrasena } = await restablecer(matAutor);
    esError(await post('/api/acceso/entrar', { no_empleado: matAutor, contrasena: autor.contrasena }), 401, 'credenciales_incorrectas');
    const r = await post('/api/acceso/entrar', { no_empleado: matAutor, contrasena });
    esOk(r);
    assert.equal(r.usuario.tiene_llave, false);
    esOk(await post('/api/acceso/llave', { llave_publica: celular().llavePublica }, r.token));
  });

  // --- IA (las rutas de app-bomberos/servidor, tal cual) -----------------------------

  await paso('las rutas de la IA contestan', async () => {
    const r = await post('/api/ia/resumen', { campos: { tipo_servicio: 'Incendio', lugar_servicio: 'Calle 1' } });
    if (r.http === 401) return; // IA_MODO=local sin clave: la ruta existe y pide autorización
    esOk(r);
    assert.equal(typeof r.texto, 'string');
  });
}

async function main() {
  await crearBase();
  const servidor = crearApp().listen(0);
  await new Promise((listo) => servidor.once('listening', listo));
  base = `http://127.0.0.1:${servidor.address().port}`;

  try {
    await probar();
    console.log(`\n${total} pruebas pasaron.`);
  } finally {
    servidor.close();
    await db.cerrar();
  }
}

main().catch((error) => {
  console.error('\nFALLÓ:', error.message);
  process.exitCode = 1;
});

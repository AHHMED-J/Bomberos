// Prueba de punta a punta contra la base de DB_NAME: hace las mismas
// llamadas que la app (4-tercera-version/app/lib/datos/repositorio_remoto.dart).
// El celular se simula con una llave P-256 hecha con node:crypto, que entrega
// la llave en PEM y la firma en base64, igual que biometric_signature.
//
//   npm run probar
//
// Crea usuarios y partes de prueba nuevos en cada corrida. Úsalo solo con la
// base de desarrollo.

'use strict';

require('../src/entorno');

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { crearBase } = require('./cargar-bd');
const { darDeAlta, restablecer } = require('./usuario');
const db = require('../src/db');
const { crearApp } = require('../servidor');
const { contenidoParaFirmar, sha256 } = require('../src/validacion');

const ejemplos = require('../src/datos-ejemplo').partes;

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
const get = (ruta, token = null) => pedir('GET', ruta, undefined, token);
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
  const retoDe = async (p, token = tokenAutor) =>
    (await post(`/api/partes/${p.folio}/reto`, { contenido: contenidoParaFirmar(p) }, token)).reto;
  const enviar = (p, confirmacion, token = tokenAutor) => post(`/api/partes/${p.folio}/enviar`, { parte: p, ...confirmacion }, token);

  await paso('los folios nuevos no se repiten', async () => {
    const uno = await post('/api/partes/folio', {}, tokenAutor);
    const dos = await post('/api/partes/folio', {}, tokenAutor);
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
    // Sin la contraseña, con otra o con algo que no es una firma, no se guarda.
    esError(await post('/api/acceso/trazo', { trazo: TRAZO_AUTOR }, tokenAutor), 401, 'contrasena_incorrecta');
    esError(await post('/api/acceso/trazo', { trazo: TRAZO_AUTOR, contrasena: 'no-es' }, tokenAutor), 401, 'contrasena_incorrecta');
    esError(await post('/api/acceso/trazo', { trazo: '<script>alert(1)</script>', contrasena: autor.contrasena }, tokenAutor), 400, 'trazo_invalido');
    esError(await post('/api/acceso/trazo', { trazo: '1,1 '.repeat(20000), contrasena: autor.contrasena }, tokenAutor), 400, 'trazo_invalido');
    const r = await post('/api/acceso/trazo', { trazo: TRAZO_AUTOR, contrasena: autor.contrasena }, tokenAutor);
    esOk(r);
    assert.equal(r.usuario.trazo, TRAZO_AUTOR);
    esOk(await post('/api/acceso/trazo', { trazo: TRAZO_REVISOR, contrasena: claveCapitan }, tokenCapitan));
  });

  await paso('la firma se guarda cifrada, ligada a su dueño, y queda en la bitácora', async () => {
    const { trazo } = await db.fila('SELECT trazo FROM usuario WHERE id = ?', [autor.id]);
    assert.match(trazo, /^v1\./);
    assert.ok(!trazo.includes(TRAZO_AUTOR));
    // Copiada a otra cuenta no descifra.
    const boveda = require('../src/boveda');
    assert.equal(boveda.descifrar(trazo, autor.id), TRAZO_AUTOR);
    assert.equal(boveda.descifrar(trazo, capitan.id), null);
    assert.equal(boveda.descifrar(trazo.slice(0, -2) + 'AA', autor.id), null);
    const b = await db.filas('SELECT accion FROM bitacora WHERE usuario_id = ? AND accion LIKE ?', [autor.id, 'firma_%']);
    assert.deepEqual(b.map((x) => x.accion), ['firma_creada']);
    // Entrar de nuevo la devuelve en claro a su dueño.
    const e = await post('/api/acceso/entrar', { no_empleado: matAutor, contrasena: autor.contrasena });
    assert.equal(e.usuario.trazo, TRAZO_AUTOR);
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
    const mios = await get(`/api/partes?usuario=${autor.id}`, tokenAutor);
    assert.deepEqual(mios.partes.map((p) => p.folio), [parte.folio]);
    const bandeja = await get(`/api/revision/bandeja?division=${encodeURIComponent(division)}`, tokenCapitan);
    assert.deepEqual(bandeja.partes.map((p) => `${p.folio}:${p.estado}`), [`${parte.folio}:enviado`]);
    assert.deepEqual(bandeja.partes[0].campos, parte.campos);
    assert.equal(bandeja.partes[0].croquis_png, parte.croquis_png);
  });

  // --- Avisos -------------------------------------------------------------------

  const avisos = (token) => pedir('GET', '/api/notificaciones', undefined, token);

  await paso('al enviar, el capitán recibe un aviso y quien lo envió, no', async () => {
    esError(await get('/api/notificaciones'), 401, 'sin_sesion');
    const cap = await avisos(tokenCapitan);
    const por = cap.notificaciones.filter((n) => n.tipo === 'parte_por_revisar');
    assert.equal(por.length, 1);
    assert.equal(por[0].folio, parte.folio);
    assert.equal(por[0].leida, false);
    const yo = await avisos(tokenAutor);
    assert.equal(yo.notificaciones.filter((n) => n.tipo === 'parte_por_revisar').length, 0);
  });

  await paso('cada quien lee y marca sólo los suyos', async () => {
    const cap = await avisos(tokenCapitan);
    const mio = cap.notificaciones.find((n) => n.tipo === 'parte_por_revisar');
    // Un aviso ajeno no se marca.
    await post(`/api/notificaciones/${mio.id}/leida`, {}, tokenAutor);
    assert.equal((await avisos(tokenCapitan)).notificaciones.find((n) => n.id === mio.id).leida, false);
    esError(await post('/api/notificaciones/x/leida', {}, tokenCapitan), 400, 'id_invalido');
    esOk(await post(`/api/notificaciones/${mio.id}/leida`, {}, tokenCapitan));
    const despues = await avisos(tokenCapitan);
    assert.equal(despues.notificaciones.find((n) => n.id === mio.id).leida, true);
    assert.equal(despues.sin_leer, cap.sin_leer - 1);
  });

  // --- El revisor devuelve y luego valida -----------------------------------------

  const validar = (confirmacion, token = tokenCapitan) => post(`/api/revision/${parte.folio}/validar`, { ...confirmacion }, token);

  await paso('el revisor lo devuelve con una nota y no queda sellado', async () => {
    esError(await post(`/api/revision/${parte.folio}/devolver`, { nota: ' ' }, tokenCapitan), 400, 'falta_nota');
    esError(await post('/api/revision/PE-0000-0000/devolver', { nota: 'x' }, tokenCapitan), 404, 'no_existe');
    const r = await post(
      `/api/revision/${parte.folio}/devolver`,
      { nota: 'Falta la hora de control.', seccion: 'Datos del servicio', revisor_id: capitan.id },
      tokenCapitan,
    );
    esOk(r);
    assert.equal(r.parte.estado, 'devuelto');
    assert.equal(r.parte.nota.revisor, 'Cap. de prueba');
    assert.equal(r.parte.sello ?? null, null);
    esError(await get(`/api/partes/${parte.folio}/sello`, tokenAutor), 409, 'sin_sello');
  });

  await paso('al devolverlo, quien lo elaboró recibe el aviso con la nota', async () => {
    const yo = await avisos(tokenAutor);
    const d = yo.notificaciones.find((n) => n.tipo === 'parte_devuelto');
    assert.equal(d.folio, parte.folio);
    assert.match(d.texto, /Falta la hora de control/);
    esOk(await post('/api/notificaciones/leidas', {}, tokenAutor));
    assert.equal((await avisos(tokenAutor)).sin_leer, 0);
  });

  await paso('devuelto no se puede validar', async () => {
    const reto = await retoDe(parte);
    esError(await validar({ reto, contrasena: claveCapitan }), 409, 'no_espera_revision');
  });

  await paso('el autor actualiza su trazo, corrige y vuelve a firmar, ahora con su contraseña', async () => {
    const trazoNuevo = '5,5 60,40 95,10';
    esOk(await post('/api/acceso/trazo', { trazo: trazoNuevo, contrasena: autor.contrasena }, tokenAutor));
    // La app manda el parte como lo tiene: con lo que el servidor le agregó.
    parte = (await get(`/api/partes?usuario=${autor.id}`, tokenAutor)).partes[0];
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
    esError(await validar(comoAutor, tokenAutor), 403, 'no_es_revisor');
    await db.ejecutar("UPDATE usuario SET rol = 'capitan' WHERE id = ?", [autor.id]);
    esError(await validar(comoAutor, tokenAutor), 403, 'es_su_parte');
    await db.ejecutar("UPDATE usuario SET rol = 'editor' WHERE id = ?", [autor.id]);

    const ajeno = await darDeAlta({ matricula: `7${sufijo}`, nombre: 'Cap. de otra división', capitan: true, division: 'Otra' });
    const tokenAjeno = (await post('/api/acceso/entrar', { no_empleado: ajeno.matricula ?? `7${sufijo}`, contrasena: ajeno.contrasena })).token;
    esError(await validar({ reto, contrasena: ajeno.contrasena }, tokenAjeno), 403, 'otra_division');
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

  await paso('al validarlo, quien lo elaboró y Administración reciben el aviso; el corregido le llegó al capitán', async () => {
    const yo = await avisos(tokenAutor);
    assert.equal(yo.notificaciones.filter((n) => n.tipo === 'parte_validado' && n.folio === parte.folio).length, 1);
    // Sin leer: el aviso de la validación y el de haber cambiado su firma.
    assert.deepEqual(yo.notificaciones.filter((n) => !n.leida).map((n) => n.tipo).sort(), ['firma_cambiada', 'parte_validado']);
    const cap = await avisos(tokenCapitan);
    assert.ok(cap.notificaciones.some((n) => n.titulo === 'Parte corregido por revisar' && n.folio === parte.folio));
    const hay = await db.fila(
      "SELECT COUNT(*) AS n FROM notificacion n JOIN usuario u ON u.id = n.usuario_id WHERE u.rol = 'administracion' AND n.folio = ?",
      [parte.folio],
    );
    assert.ok(hay.n >= 1);
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
    const r = await get(`/api/partes/${parte.folio}/sello`, tokenAutor);
    esOk(r);
    assert.equal(r.sello, sello);
    assert.equal(r.coincide, true);
  });

  await paso('si el usuario cambia su trazo después, el sello sigue coincidiendo', async () => {
    esOk(await post('/api/acceso/trazo', { trazo: '1,1 2,2 3,3', contrasena: claveCapitan }, tokenCapitan));
    assert.equal((await get(`/api/partes/${parte.folio}/sello`, tokenAutor)).coincide, true);
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
      assert.equal((await get(`/api/partes/${parte.folio}/sello`, tokenAutor)).coincide, false, cambio);
      await db.ejecutar('UPDATE parte SET datos = ? WHERE folio = ?', [original, parte.folio]);
    }
    assert.equal((await get(`/api/partes/${parte.folio}/sello`, tokenAutor)).coincide, true);
  });

  // --- Dirección restablece el acceso ---------------------------------------------

  // --- Todas las rutas de partes y revisión piden sesión ----------------------------

  await paso('sin sesión no se entra a partes ni a revisión; y cada quien sólo ve lo suyo', async () => {
    const f = parte.folio;
    esError(await post('/api/partes/folio'), 401, 'sin_sesion');
    esError(await get(`/api/partes?usuario=${autor.id}`), 401, 'sin_sesion');
    esError(await get('/api/partes'), 401, 'sin_sesion');
    esError(await post(`/api/partes/${f}/reto`, { contenido: {} }), 401, 'sin_sesion');
    esError(await post(`/api/partes/${f}/enviar`, { parte }), 401, 'sin_sesion');
    esError(await post(`/api/partes/${f}/adjuntos`, {}), 401, 'sin_sesion');
    esError(await get(`/api/partes/${f}/adjuntos/${'a'.repeat(64)}`), 401, 'sin_sesion');
    esError(await get(`/api/partes/${f}/sello`), 401, 'sin_sesion');
    esError(await get('/api/revision/bandeja'), 401, 'sin_sesion');
    esError(await post(`/api/revision/${f}/devolver`, { nota: 'x' }), 401, 'sin_sesion');
    esError(await post(`/api/revision/${f}/validar`, {}), 401, 'sin_sesion');
    // Un token inventado tampoco.
    esError(await get('/api/partes', 'inventado'), 401, 'sin_sesion');

    // Un bombero no revisa; un capitán no pide los partes de otro; nadie manda partes a nombre de otro.
    esError(await get('/api/revision/bandeja', tokenAutor), 403, 'no_es_revisor');
    esError(await post(`/api/revision/${f}/devolver`, { nota: 'x' }, tokenAutor), 403, 'no_es_revisor');
    esError(await get(`/api/partes?usuario=${autor.id}`, tokenCapitan), 403, 'no_es_tu_cuenta');
    esError(await post(`/api/revision/${f}/devolver`, { nota: 'x', revisor_id: autor.id }, tokenCapitan), 403, 'no_es_tu_cuenta');
    esError(await enviar({ ...parte, elaboro_id: capitan.id }, { reto: 'x:y', contrasena: 'x' }), 403, 'no_es_su_parte');
    // La bandeja es la de la división de quien pide, aunque pida otra.
    const otra = await get(`/api/revision/bandeja?division=${encodeURIComponent('Otra')}`, tokenCapitan);
    assert.ok(otra.partes.every((p) => p.division === division));
  });

  // --- Fotos y croquis ------------------------------------------------------------

  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
    'base64',
  );
  const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), crypto.randomBytes(64)]);
  const hashDe = (b) => crypto.createHash('sha256').update(b).digest('hex');
  const subir = (folio, tipo, bytes, token = tokenAutor, hash = hashDe(bytes)) =>
    post(`/api/partes/${folio}/adjuntos`, { tipo, sha256: hash, datos: bytes.toString('base64') }, token);

  let conImagenes;
  let tokenOtroCapitan;
  let tokenOtroBombero;

  await paso('sube el croquis y una foto: sólo PNG o JPEG, con su hash, y sólo quien elabora', async () => {
    const { folio } = await post('/api/partes/folio', {}, tokenAutor);
    conImagenes = {
      ...structuredClone(ejemplos.get('PE-2026-0150')),
      id: `loc-img-${sufijo}`,
      folio,
      estado: 'enProgreso',
      elaboro_id: autor.id,
      division,
      fotos: 1,
      enviado_en: null,
    };
    esOk(await subir(folio, 'croquis', PNG));
    esOk(await subir(folio, 'croquis', PNG)); // subir lo mismo otra vez no estorba
    esOk(await subir(folio, 'foto', JPG));
    esError(await subir(folio, 'foto', Buffer.from('<script>alert(1)</script>')), 400, 'formato_no_valido');
    esError(await subir(folio, 'foto', JPG, tokenAutor, hashDe(PNG)), 400, 'hash_no_coincide');
    esError(await subir(folio, 'foto', JPG, tokenAutor, 'xyz'), 400, 'hash_invalido');
    esError(await subir(folio, 'video', JPG), 400, 'tipo_invalido');
    esError(await post(`/api/partes/${folio}/adjuntos`, { tipo: 'foto', sha256: hashDe(JPG), datos: '' }, tokenAutor), 400, 'imagen_vacia');
    esError(await post(`/api/partes/${folio}/adjuntos`, { tipo: 'foto', sha256: hashDe(JPG), datos: 'A'.repeat(11 * 1024 * 1024) }, tokenAutor), 400, 'imagen_muy_grande');
  });

  await paso('quién ve las imágenes: quien elabora y los capitanes de su división, nadie más', async () => {
    const otroCap = await darDeAlta({ matricula: `6${sufijo}`, nombre: 'Cap. de otra división B', capitan: true, division: 'Otra B' });
    tokenOtroCapitan = (await post('/api/acceso/entrar', { no_empleado: `6${sufijo}`, contrasena: otroCap.contrasena })).token;
    const otroBombero = await darDeAlta({ matricula: `5${sufijo}`, nombre: 'Otro bombero', division });
    tokenOtroBombero = (await post('/api/acceso/entrar', { no_empleado: `5${sufijo}`, contrasena: otroBombero.contrasena })).token;

    const ruta = `/api/partes/${conImagenes.folio}/adjuntos/${hashDe(PNG)}`;
    const mia = await fetch(base + ruta, { headers: { authorization: `Bearer ${tokenAutor}` } });
    assert.equal(mia.status, 200);
    assert.equal(mia.headers.get('content-type'), 'image/png');
    assert.equal(mia.headers.get('x-content-type-options'), 'nosniff');
    assert.match(mia.headers.get('cache-control'), /no-store/);
    assert.deepEqual(Buffer.from(await mia.arrayBuffer()), PNG);
    esError(await get(ruta, tokenOtroBombero), 403, 'sin_permiso');
    esError(await get(ruta, tokenOtroCapitan), 403, 'sin_permiso');
    esError(await get(`/api/partes/${conImagenes.folio}/adjuntos/${'0'.repeat(64)}`, tokenAutor), 404, 'no_existe');
    esError(await get(`/api/partes/${conImagenes.folio}/adjuntos/no-es-hash`, tokenAutor), 404, 'no_existe');
    // Otro bombero puede subir lo mismo al folio, pero no le sirve a quien firma ni lo estorba.
    esOk(await subir(conImagenes.folio, 'foto', JPG, tokenOtroBombero));
  });

  await paso('el parte firma las imágenes: sin ellas o con otras no se envía; con ellas llega a revisión', async () => {
    const adj = [
      { tipo: 'croquis', sha256: hashDe(PNG) },
      { tipo: 'foto', sha256: hashDe(JPG) },
    ];
    // Imagen que nadie subió.
    let p = { ...conImagenes, adjuntos: [...adj, { tipo: 'foto', sha256: hashDe(Buffer.from('otra')) }], fotos: 2 };
    let reto = await retoDe(p);
    esError(await enviar(p, { reto, contrasena: autor.contrasena }), 422, 'adjunto_faltante');
    // Dice 3 fotos y sólo hay una.
    p = { ...conImagenes, adjuntos: adj, fotos: 3 };
    reto = await retoDe(p);
    esError(await enviar(p, { reto, contrasena: autor.contrasena }), 422, 'fotos_no_coinciden');
    // Las imágenes las subió otra persona: no valen.
    esError(await enviar({ ...p, fotos: 1 }, { reto: await retoDe({ ...p, fotos: 1 }, tokenOtroBombero), contrasena: 'x' }, tokenOtroBombero), 403, 'no_es_su_parte');
    // Si cambia una imagen después de firmar, el contenido ya no es el firmado.
    p = { ...conImagenes, adjuntos: adj, fotos: 1 };
    reto = await retoDe(p);
    esError(await enviar({ ...p, adjuntos: [adj[0]] }, { reto, contrasena: autor.contrasena }), 409, 'contenido_cambio');

    reto = await retoDe(p);
    const r = await enviar(p, { reto, contrasena: autor.contrasena });
    esOk(r);
    assert.equal(r.parte.estado, 'enviado');
    assert.deepEqual(r.parte.adjuntos.map((a) => `${a.tipo}:${a.sha256}:${a.bytes}`).sort(), [`croquis:${hashDe(PNG)}:${PNG.length}`, `foto:${hashDe(JPG)}:${JPG.length}`].sort());
    conImagenes = r.parte;
    // Ya enviado: no se agregan más imágenes.
    esError(await subir(conImagenes.folio, 'foto', crypto.randomBytes(8)), 409, 'ya_enviado');
  });

  await paso('el capitán de la división ve las imágenes y valida; el sello cubre las imágenes', async () => {
    const ruta = `/api/partes/${conImagenes.folio}/adjuntos/${hashDe(JPG)}`;
    const cap = await fetch(base + ruta, { headers: { authorization: `Bearer ${tokenCapitan}` } });
    assert.equal(cap.status, 200);
    assert.equal(cap.headers.get('content-type'), 'image/jpeg');

    const reto = await retoDe(conImagenes);
    const v = await post(`/api/revision/${conImagenes.folio}/validar`, { reto, contrasena: claveCapitan }, tokenCapitan);
    esOk(v);
    assert.equal(v.parte.estado, 'validado');
    const sello = await get(`/api/partes/${conImagenes.folio}/sello`, tokenAutor);
    assert.equal(sello.coincide, true);
    assert.equal(sello.imagenes_integras, true);
  });

  await paso('si alguien cambia una imagen en la base, el sello ya no coincide', async () => {
    const original = (await db.fila('SELECT contenido FROM adjunto WHERE folio = ? AND tipo = ?', [conImagenes.folio, 'foto'])).contenido;
    const alterada = Buffer.from(original);
    alterada[alterada.length - 1] ^= 0xff;
    await db.ejecutar('UPDATE adjunto SET contenido = ? WHERE folio = ? AND tipo = ?', [alterada, conImagenes.folio, 'foto']);
    const r = await get(`/api/partes/${conImagenes.folio}/sello`, tokenAutor);
    assert.equal(r.imagenes_integras, false);
    assert.equal(r.coincide, false);
    await db.ejecutar('UPDATE adjunto SET contenido = ? WHERE folio = ? AND tipo = ?', [original, conImagenes.folio, 'foto']);
    assert.equal((await get(`/api/partes/${conImagenes.folio}/sello`, tokenAutor)).coincide, true);
  });

  await paso('restablecer: contraseña nueva y el celular se puede registrar otra vez', async () => {
    const { contrasena } = await restablecer(matAutor);
    esError(await post('/api/acceso/entrar', { no_empleado: matAutor, contrasena: autor.contrasena }), 401, 'credenciales_incorrectas');
    const r = await post('/api/acceso/entrar', { no_empleado: matAutor, contrasena });
    esOk(r);
    assert.equal(r.usuario.tiene_llave, false);
    esOk(await post('/api/acceso/llave', { llave_publica: celular().llavePublica }, r.token));
  });

  // --- IA ---------------------------------------------------------------------------

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

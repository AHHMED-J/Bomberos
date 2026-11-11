// Prueba de punta a punta contra la base de DB_NAME: hace las mismas
// llamadas que la app (app-bomberos/movil/lib/datos/repositorio_remoto.dart).
// Los celulares se simulan con llaves P-256 hechas con node:crypto, que
// entregan la llave en PEM y la firma en base64, igual que biometric_signature.
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
const { darDeAlta, codigoNuevo } = require('./usuario');
const db = require('../src/db');
const { crearApp } = require('../src/server');
const { contenidoParaFirmar, sha256 } = require('../src/de-la-app').validacion;

const ejemplos = require(path.join(__dirname, '..', '..', '..', 'app-bomberos', 'servidor', 'src', 'datos')).partes;

const TRAZO = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

let base;
let total = 0;

async function pedir(metodo, ruta, cuerpo) {
  const respuesta = await fetch(base + ruta, {
    method: metodo,
    headers: { 'content-type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { ...(await respuesta.json()), http: respuesta.status };
}
const get = (ruta) => pedir('GET', ruta);
const post = (ruta, cuerpo = {}) => pedir('POST', ruta, cuerpo);

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

async function entrar(usuarioId, cel) {
  const { reto } = await post('/api/acceso/reto', { usuario_id: usuarioId });
  return post('/api/acceso/verificar', { usuario_id: usuarioId, reto, firma: cel.firmar(reto) });
}

async function probar() {
  const sufijo = String(crypto.randomInt(100000, 999999));
  const division = `División de prueba ${sufijo}`;
  const matAutor = `9${sufijo}`;
  const matCapitan = `8${sufijo}`;
  const autor = await darDeAlta({ matricula: matAutor, nombre: 'Autor de prueba', division });
  const capitan = await darDeAlta({ matricula: matCapitan, nombre: 'Cap. de prueba', capitan: true, division });
  const celAutor = celular();
  const celCapitan = celular();

  // --- Alta del celular con el código de un solo uso --------------------------

  await paso('salud', async () => {
    const r = await get('/api/salud');
    esOk(r);
    assert.equal(r.ok, true);
  });

  await paso('un código que no existe no sirve', async () => {
    esError(await get('/api/acceso/codigo/NOEXISTE'), 404, 'codigo_invalido');
  });

  await paso('el código dice de quién es, con la forma que espera la app', async () => {
    const r = await get(`/api/acceso/codigo/${autor.codigo.toLowerCase()}`);
    esOk(r);
    assert.deepEqual(r.usuario, {
      id: autor.id,
      nombre: 'Autor de prueba',
      matricula: matAutor,
      rango: 'Bombero',
      rol: 'editor',
      division,
      estacion: 'Central',
    });
  });

  await paso('alta: registra la llave pública y gasta el código', async () => {
    esError(await post('/api/acceso/alta', { codigo: autor.codigo }), 400, 'falta_llave_publica');
    const r = await post('/api/acceso/alta', { codigo: autor.codigo, llave_publica: celAutor.llavePublica });
    esOk(r);
    assert.equal(r.usuario.id, autor.id);
    esError(await post('/api/acceso/alta', { codigo: autor.codigo, llave_publica: celAutor.llavePublica }), 404, 'codigo_invalido');
    esOk(await post('/api/acceso/alta', { codigo: capitan.codigo, llave_publica: celCapitan.llavePublica }));
  });

  // --- Entrar con la biometría o el PIN del celular ---------------------------

  await paso('entra firmando el reto con la llave del celular', async () => {
    const { reto } = await post('/api/acceso/reto', { usuario_id: autor.id });
    assert.match(reto, /^[0-9a-f]{32}:acceso$/);
    const cuerpo = { usuario_id: autor.id, reto, firma: celAutor.firmar(reto) };
    const r = await post('/api/acceso/verificar', cuerpo);
    esOk(r);
    assert.equal(r.ok, true);
    assert.equal(r.simulada, false);
    assert.equal(typeof r.token, 'string');
    assert.equal(r.usuario.id, autor.id);
    esError(await post('/api/acceso/verificar', cuerpo), 401, 'reto_usado');
  });

  await paso('la firma de otra llave no entra', async () => {
    esError(await entrar(autor.id, celular()), 401, 'firma_invalida');
  });

  await paso('usuario o reto desconocidos', async () => {
    esError(await post('/api/acceso/reto', { usuario_id: 'u-nadie' }), 404, 'usuario_desconocido');
    const r = await post('/api/acceso/verificar', { usuario_id: autor.id, reto: 'inventado:acceso', firma: 'x' });
    esError(r, 401, 'reto_desconocido');
  });

  await paso('un reto de más de 5 minutos no sirve', async () => {
    const { reto } = await post('/api/acceso/reto', { usuario_id: autor.id });
    await db.ejecutar('UPDATE reto SET creado_en = DATE_SUB(NOW(), INTERVAL 6 MINUTE) WHERE reto = ?', [reto]);
    const r = await post('/api/acceso/verificar', { usuario_id: autor.id, reto, firma: celAutor.firmar(reto) });
    esError(r, 401, 'reto_vencido');
  });

  await paso('acepta la firma simulada de la app (modo prueba)', async () => {
    const { reto } = await post('/api/acceso/reto', { usuario_id: autor.id });
    const r = await post('/api/acceso/verificar', { usuario_id: autor.id, reto, firma: `SIMULADA:${sha256(reto)}` });
    esOk(r);
    assert.equal(r.simulada, true);
  });

  await paso('dar de alta otro celular no desactiva el primero', async () => {
    const otro = celular();
    esOk(await post('/api/acceso/alta', { codigo: await codigoNuevo(autor.id), llave_publica: otro.llavePublica }));
    esOk(await entrar(autor.id, otro));
    esOk(await entrar(autor.id, celAutor));
  });

  // --- Entrada manual ----------------------------------------------------------

  await paso('entrada manual con número de empleado y contraseña', async () => {
    esError(await post('/api/acceso/entrar', { no_empleado: matAutor, contrasena: 'no-es' }), 401, 'credenciales_incorrectas');
    esError(await post('/api/acceso/entrar', { no_empleado: 'nadie', contrasena: 'x' }), 401, 'credenciales_incorrectas');
    const r = await post('/api/acceso/entrar', { no_empleado: matAutor, contrasena: autor.contrasena });
    esOk(r);
    assert.equal(r.usuario.id, autor.id);
    assert.equal(typeof r.token, 'string');
  });

  // --- El autor llena y envía ---------------------------------------------------

  let parte;

  await paso('los folios nuevos no se repiten', async () => {
    const uno = await post('/api/partes/folio');
    const dos = await post('/api/partes/folio');
    assert.match(uno.folio, /^PE-\d{4}-\d{4,}$/);
    assert.notEqual(uno.folio, dos.folio);
    // Un parte como los que arma la app, con ese folio.
    parte = {
      ...structuredClone(ejemplos.get('PE-2026-0150')),
      id: `loc-${sufijo}`,
      folio: uno.folio,
      estado: 'borrador',
      elaboro_id: autor.id,
      elaboro_nombre: 'Autor de prueba',
      division,
      enviado_en: null,
    };
  });

  const retoDe = async (p) => (await post(`/api/partes/${p.folio}/reto`, { contenido: contenidoParaFirmar(p) })).reto;

  await paso('el reto del parte lleva el hash de su contenido', async () => {
    esError(await post(`/api/partes/${parte.folio}/reto`, {}), 400, 'falta_contenido');
    const r = await post(`/api/partes/${parte.folio}/reto`, { contenido: contenidoParaFirmar(parte) });
    assert.equal(r.reto.split(':')[1], sha256(JSON.stringify(contenidoParaFirmar(parte))));
    assert.equal(r.hash, r.reto.split(':')[1]);
  });

  await paso('no se envía con pendientes', async () => {
    const incompleto = structuredClone(parte);
    incompleto.campos.descripcion.valor = '';
    const reto = await retoDe(incompleto);
    const r = await post(`/api/partes/${parte.folio}/enviar`, { parte: incompleto, reto, firma: celAutor.firmar(reto) });
    esError(r, 422, 'pendientes');
    assert.deepEqual(r.pendientes, ['Descripción del incidente']);
  });

  await paso('no se envía si el contenido cambió después de firmar', async () => {
    const reto = await retoDe(parte);
    const cambiado = structuredClone(parte);
    cambiado.campos.lugar_servicio.valor = 'Otra calle';
    const r = await post(`/api/partes/${parte.folio}/enviar`, { parte: cambiado, reto, firma: celAutor.firmar(reto) });
    esError(r, 409, 'contenido_cambio');
  });

  await paso('no se envía con la firma de otra persona', async () => {
    const reto = await retoDe(parte);
    const r = await post(`/api/partes/${parte.folio}/enviar`, { parte, reto, firma: celCapitan.firmar(reto) });
    esError(r, 401, 'firma_invalida');
  });

  await paso('el autor firma y el parte pasa a revisión', async () => {
    const reto = await retoDe(parte);
    const r = await post(`/api/partes/${parte.folio}/enviar`, { parte, reto, firma: celAutor.firmar(reto) });
    esOk(r);
    assert.equal(r.parte.estado, 'enviado');
    assert.equal(r.parte.nota, null);
    assert.equal(r.firma_simulada, false);
    assert.ok(r.parte.enviado_en);
  });

  await paso('ya enviado, no se puede volver a enviar', async () => {
    const reto = await retoDe(parte);
    const r = await post(`/api/partes/${parte.folio}/enviar`, { parte, reto, firma: celAutor.firmar(reto) });
    esError(r, 409, 'ya_enviado');
  });

  await paso('el parte sale en "mis partes" y en la bandeja de su división', async () => {
    const mios = await get(`/api/partes?usuario=${autor.id}`);
    assert.deepEqual(mios.partes.map((p) => p.folio), [parte.folio]);
    const bandeja = await get(`/api/revision/bandeja?division=${encodeURIComponent(division)}`);
    assert.deepEqual(bandeja.partes.map((p) => `${p.folio}:${p.estado}`), [`${parte.folio}:enviado`]);
    assert.deepEqual(bandeja.partes[0].campos, parte.campos);
  });

  // --- El revisor devuelve y luego valida ---------------------------------------

  await paso('el revisor lo devuelve con una nota', async () => {
    esError(await post(`/api/revision/${parte.folio}/devolver`, { nota: ' ', revisor_id: capitan.id }), 400, 'falta_nota');
    esError(await post('/api/revision/PE-0000-0000/devolver', { nota: 'x' }), 404, 'no_existe');
    const r = await post(`/api/revision/${parte.folio}/devolver`, {
      nota: 'Falta la hora de control.',
      seccion: 'Datos del servicio',
      revisor_id: capitan.id,
    });
    esOk(r);
    assert.equal(r.parte.estado, 'devuelto');
    assert.equal(r.parte.nota.texto, 'Falta la hora de control.');
    assert.equal(r.parte.nota.revisor, 'Cap. de prueba');
  });

  await paso('el autor lo corrige y lo vuelve a firmar', async () => {
    parte.campos.descripcion.valor += ' Fuego controlado a las 15:10.';
    const reto = await retoDe(parte);
    const r = await post(`/api/partes/${parte.folio}/enviar`, { parte, reto, firma: celAutor.firmar(reto) });
    esOk(r);
    assert.equal(r.parte.estado, 'enviado');
    parte = r.parte;
  });

  await paso('solo valida un revisor, y nunca quien llenó el parte', async () => {
    const reto = await retoDe(parte);
    const cuerpo = { reto, firma: celAutor.firmar(reto), trazo: TRAZO, revisor_id: autor.id };
    esError(await post(`/api/revision/${parte.folio}/validar`, cuerpo), 403, 'no_es_revisor');
    await db.ejecutar("UPDATE usuario SET rol = 'capitan' WHERE id = ?", [autor.id]);
    esError(await post(`/api/revision/${parte.folio}/validar`, cuerpo), 403, 'es_su_parte');
    await db.ejecutar("UPDATE usuario SET rol = 'editor' WHERE id = ?", [autor.id]);
  });

  await paso('validar pide el trazo y la firma del revisor', async () => {
    const reto = await retoDe(parte);
    const sinTrazo = { reto, firma: celCapitan.firmar(reto), revisor_id: capitan.id };
    esError(await post(`/api/revision/${parte.folio}/validar`, sinTrazo), 400, 'falta_trazo');
    const deOtro = { reto, firma: celAutor.firmar(reto), trazo: TRAZO, revisor_id: capitan.id };
    esError(await post(`/api/revision/${parte.folio}/validar`, deOtro), 401, 'firma_invalida');
  });

  await paso('el revisor firma y el parte queda validado y sellado', async () => {
    const reto = await retoDe(parte);
    const firma = celCapitan.firmar(reto);
    const r = await post(`/api/revision/${parte.folio}/validar`, { reto, firma, trazo: TRAZO, revisor_id: capitan.id });
    esOk(r);
    assert.equal(r.parte.estado, 'validado');
    assert.equal(r.parte.sello, sha256(`${reto.split(':')[1]}|${firma}|${sha256(TRAZO)}`));
  });

  await paso('quedan guardadas las firmas del autor y del revisor', async () => {
    const firmas = await db.filas('SELECT rol, usuario_id, trazo FROM firma_parte WHERE folio = ? ORDER BY id', [parte.folio]);
    assert.deepEqual(
      firmas.map((f) => `${f.rol}:${f.usuario_id}`),
      [`autor:${autor.id}`, `autor:${autor.id}`, `revisor:${capitan.id}`],
    );
    assert.equal(firmas[2].trazo, TRAZO);
  });

  // --- IA (las rutas de app-bomberos/servidor, tal cual) -------------------------

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

// Prueba de punta a punta del acceso y la firma, contra la base de DB_NAME.
// Simula los celulares con llaves P-256 hechas con node:crypto, igual que la
// del chip seguro. En un celular de verdad, firmar pide la huella, la cara o
// el PIN del teléfono.
//
//   npm run probar
//
// Crea usuarios y partes de prueba nuevos en cada corrida. Úsalo solo con la
// base de desarrollo.

'use strict';

require('dotenv').config({ quiet: true });

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { crearBase } = require('./cargar-bd');
const { darDeAlta } = require('./usuario');
const db = require('../src/db');
const c = require('../src/confirmacion');
const { crearApp } = require('../src/server');

const TRAZO = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

let base;
let total = 0;

async function post(ruta, cuerpo = {}, token = null) {
  const respuesta = await fetch(base + ruta, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(cuerpo),
  });
  return { ...(await respuesta.json()), http: respuesta.status };
}

async function paso(nombre, prueba) {
  await prueba();
  total++;
  console.log(`  ok  ${nombre}`);
}

// Un celular de mentira. pem = true entrega la llave en PEM, como lo hace
// biometric_signature en la app.
function celular({ pem = false } = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return {
    llavePublica: pem
      ? publicKey.export({ type: 'spki', format: 'pem' })
      : publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
    firmar: (mensaje) => crypto.sign('sha256', Buffer.from(mensaje, 'utf8'), privateKey).toString('base64'),
  };
}

function esError(respuesta, estado, codigo) {
  assert.equal(respuesta.http, estado, JSON.stringify(respuesta));
  assert.equal(respuesta.error, codigo, JSON.stringify(respuesta));
}

function esOk(respuesta) {
  assert.equal(respuesta.http, 200, JSON.stringify(respuesta));
}

async function crearParte(elaboroId, divisionId, estado = 'borrador') {
  const folio = `P-${crypto.randomBytes(6).toString('hex')}`;
  const { insertId } = await db.ejecutar(
    'INSERT INTO parte (folio, division_id, datos, elaboro_id, estado) VALUES (?, ?, ?, ?, ?)',
    [folio, divisionId, JSON.stringify({ lugar: 'Calle 1', tipo: 'Incendio', unidades: ['DB-02'] }), elaboroId, estado],
  );
  return insertId;
}

// Entra con contraseña y registra la llave del celular. Devuelve la clave
// del celular.
async function registrarCelular(noEmpleado, contrasena, cel, plataforma = 'android') {
  const entrada = await post('/api/acceso/entrar', { noEmpleado, contrasena });
  esOk(entrada);
  const r = await post('/api/acceso/dispositivo', { plataforma, llavePublica: cel.llavePublica }, entrada.token);
  esOk(r);
  return r.claveDispositivo;
}

// Abre la app con la llave del celular. Devuelve el token de la sesión.
async function entrarConCelular(clave, cel) {
  const reto = await post('/api/acceso/reto', { claveDispositivo: clave });
  esOk(reto);
  const r = await post('/api/acceso/desbloquear', {
    claveDispositivo: clave,
    retoId: reto.retoId,
    firma: cel.firmar(reto.mensaje),
  });
  esOk(r);
  return r.token;
}

async function firmarParte(parteId, accion, token, cel) {
  const reto = await post(`/api/partes/${parteId}/reto`, { accion }, token);
  esOk(reto);
  return post(`/api/partes/${parteId}/firmar`, { accion, retoId: reto.retoId, firma: cel.firmar(reto.mensaje) }, token);
}

async function probarPiezasSueltas() {
  console.log('Piezas sueltas');

  await paso('canonico ordena las llaves', () => {
    assert.equal(
      c.canonico({ b: 1, a: { d: [2, { y: 1, x: 0 }], c: null } }),
      '{"a":{"c":null,"d":[2,{"x":0,"y":1}]},"b":1}',
    );
  });

  await paso('firmaValida acepta la firma buena y rechaza las demás', () => {
    const uno = celular();
    const otro = celular();
    assert.equal(c.firmaValida(uno.llavePublica, 'hola', uno.firmar('hola')), true);
    assert.equal(c.firmaValida(uno.llavePublica, 'hola!', uno.firmar('hola')), false);
    assert.equal(c.firmaValida(uno.llavePublica, 'hola', otro.firmar('hola')), false);
    assert.equal(c.firmaValida(uno.llavePublica, 'hola', 'basura'), false);
  });

  await paso('solo acepta llaves EC P-256, en base64 o en PEM', () => {
    const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey;
    const p384 = crypto.generateKeyPairSync('ec', { namedCurve: 'P-384' }).publicKey;
    assert.equal(c.leerLlavePublica(rsa.export({ type: 'spki', format: 'pem' })), null);
    assert.equal(c.leerLlavePublica(p384.export({ type: 'spki', format: 'der' }).toString('base64')), null);
    assert.notEqual(c.leerLlavePublica(celular().llavePublica), null);
    const enPem = celular({ pem: true });
    assert.equal(c.firmaValida(c.normalizarLlavePublica(enPem.llavePublica), 'hola', enPem.firmar('hola')), true);
  });
}

async function probarFlujo() {
  console.log('Flujo completo');

  const sufijo = crypto.randomBytes(3).toString('hex');
  const division = `Prueba ${sufijo}`;
  const noAutor = `A-${sufijo}`;
  const noRevisor = `R-${sufijo}`;
  const autor = await darDeAlta({ noEmpleado: noAutor, nombre: 'Autor de prueba', division });
  const revisor = await darDeAlta({ noEmpleado: noRevisor, nombre: 'Revisor de prueba', revisor: true, division });
  await db.ejecutar('UPDATE usuario SET firma_trazo = ? WHERE id IN (?, ?)', [TRAZO, autor.id, revisor.id]);
  const { division_id: divisionId } = await db.fila('SELECT division_id FROM usuario WHERE id = ?', [autor.id]);
  const parteId = await crearParte(autor.id, divisionId);

  const celAutor = celular({ pem: true });
  const celRevisor = celular();
  let tokenAlta;
  let claveAutor;
  let tokenAutor;
  let tokenRevisor;

  // --- Entrada manual: número de empleado y contraseña ----------------------

  await paso('contraseña equivocada', async () => {
    esError(await post('/api/acceso/entrar', { noEmpleado: noAutor, contrasena: 'no-es' }), 401, 'CREDENCIALES');
  });

  await paso('entra con número de empleado y contraseña', async () => {
    const r = await post('/api/acceso/entrar', { noEmpleado: noAutor, contrasena: autor.contrasena });
    esOk(r);
    assert.equal(r.usuario.noEmpleado, noAutor);
    tokenAlta = r.token;
  });

  await paso('muchas contraseñas equivocadas no bloquean el acceso', async () => {
    for (let i = 0; i < 12; i++) {
      esError(await post('/api/acceso/entrar', { noEmpleado: noAutor, contrasena: `mala-${i}` }), 401, 'CREDENCIALES');
    }
    esOk(await post('/api/acceso/entrar', { noEmpleado: noAutor, contrasena: autor.contrasena }));
  });

  await paso('esa sesión no puede firmar hasta registrar la llave', async () => {
    esError(await post(`/api/partes/${parteId}/reto`, { accion: 'enviar' }, tokenAlta), 403, 'SIN_CELULAR');
  });

  await paso('rechaza una llave que no es EC P-256', async () => {
    const r = await post('/api/acceso/dispositivo', { plataforma: 'android', llavePublica: 'AAAA' }, tokenAlta);
    esError(r, 400, 'LLAVE_NO_SIRVE');
  });

  await paso('registra la llave pública del celular (en PEM)', async () => {
    const r = await post('/api/acceso/dispositivo', { plataforma: 'ios', llavePublica: celAutor.llavePublica }, tokenAlta);
    esOk(r);
    claveAutor = r.claveDispositivo;
  });

  // --- Entrar con la biometría o el PIN del celular -------------------------

  await paso('entra firmando el reto con la llave del celular', async () => {
    const reto = await post('/api/acceso/reto', { claveDispositivo: claveAutor });
    assert.match(reto.mensaje, /^BomberosApp\|accion=entrar\|usuario=A-[0-9a-f]+\|dispositivo=\d+\|nonce=/);
    const cuerpo = { claveDispositivo: claveAutor, retoId: reto.retoId, firma: celAutor.firmar(reto.mensaje) };
    const r = await post('/api/acceso/desbloquear', cuerpo);
    esOk(r);
    tokenAutor = r.token;
    esError(await post('/api/acceso/desbloquear', cuerpo), 409, 'RETO_USADO');
  });

  await paso('una firma de otra llave no entra y gasta el reto', async () => {
    const reto = await post('/api/acceso/reto', { claveDispositivo: claveAutor });
    const cuerpo = { claveDispositivo: claveAutor, retoId: reto.retoId, firma: celular().firmar(reto.mensaje) };
    esError(await post('/api/acceso/desbloquear', cuerpo), 401, 'FIRMA_INVALIDA');
    cuerpo.firma = celAutor.firmar(reto.mensaje);
    esError(await post('/api/acceso/desbloquear', cuerpo), 409, 'RETO_USADO');
  });

  await paso('sin firma no entra', async () => {
    const reto = await post('/api/acceso/reto', { claveDispositivo: claveAutor });
    const r = await post('/api/acceso/desbloquear', { claveDispositivo: claveAutor, retoId: reto.retoId });
    esError(r, 400, 'SIN_FIRMA');
  });

  await paso('sin la clave del celular no hay reto', async () => {
    esError(await post('/api/acceso/reto', { claveDispositivo: 'inventada' }), 401, 'CELULAR_NO_REGISTRADO');
  });

  await paso('un reto vencido no sirve', async () => {
    const reto = await post('/api/acceso/reto', { claveDispositivo: claveAutor });
    await db.ejecutar('UPDATE reto SET expira_en = DATE_SUB(NOW(), INTERVAL 1 SECOND) WHERE id = ?', [reto.retoId]);
    const cuerpo = { claveDispositivo: claveAutor, retoId: reto.retoId, firma: celAutor.firmar(reto.mensaje) };
    esError(await post('/api/acceso/desbloquear', cuerpo), 410, 'RETO_VENCIDO');
  });

  // --- Firma del autor (Enviar) ---------------------------------------------

  await paso('el autor no puede validar', async () => {
    esError(await post(`/api/partes/${parteId}/reto`, { accion: 'validar' }, tokenAutor), 403, 'NO_REVISA');
  });

  await paso('el reto del parte lleva el folio y el hash del contenido', async () => {
    const reto = await post(`/api/partes/${parteId}/reto`, { accion: 'enviar' }, tokenAutor);
    assert.match(reto.mensaje, new RegExp(`\\|parte=${parteId}\\|folio=P-[0-9a-f]+\\|hash=[0-9a-f]{64}\\|`));
  });

  await paso('el autor firma y el parte pasa a revisión', async () => {
    const r = await firmarParte(parteId, 'enviar', tokenAutor, celAutor);
    esOk(r);
    assert.equal(r.estado, 'enviado');
    assert.equal((await db.fila('SELECT estado FROM parte WHERE id = ?', [parteId])).estado, 'enviado');
  });

  await paso('ya enviado, el autor no lo puede volver a enviar', async () => {
    esError(await post(`/api/partes/${parteId}/reto`, { accion: 'enviar' }, tokenAutor), 409, 'YA_ENVIADO');
  });

  // --- Firma del revisor (Validar) ------------------------------------------

  await paso('el revisor registra su celular y entra con él', async () => {
    const clave = await registrarCelular(noRevisor, revisor.contrasena, celRevisor);
    tokenRevisor = await entrarConCelular(clave, celRevisor);
  });

  await paso('si el parte cambia entre el reto y la firma, no entra', async () => {
    const reto = await post(`/api/partes/${parteId}/reto`, { accion: 'validar' }, tokenRevisor);
    await db.ejecutar("UPDATE parte SET datos = JSON_SET(datos, '$.lugar', 'Otra calle') WHERE id = ?", [parteId]);
    const r = await post(
      `/api/partes/${parteId}/firmar`,
      { accion: 'validar', retoId: reto.retoId, firma: celRevisor.firmar(reto.mensaje) },
      tokenRevisor,
    );
    esError(r, 409, 'PARTE_CAMBIO');
  });

  await paso('el revisor firma y el parte queda validado', async () => {
    const r = await firmarParte(parteId, 'validar', tokenRevisor, celRevisor);
    esOk(r);
    assert.equal(r.estado, 'validado');
    const parte = await db.fila('SELECT estado, revisor_id FROM parte WHERE id = ?', [parteId]);
    assert.equal(parte.estado, 'validado');
    assert.equal(parte.revisor_id, revisor.id);
  });

  await paso('las dos firmas se pueden volver a comprobar después', async () => {
    const firmas = await db.filas(
      `SELECT f.rol, f.firma_cripto, f.trazo, r.mensaje, d.llave_publica
         FROM firma_parte f
         JOIN reto r ON r.id = f.reto_id
         JOIN dispositivo d ON d.id = f.dispositivo_id
        WHERE f.parte_id = ? AND f.anulada_en IS NULL
        ORDER BY f.id`,
      [parteId],
    );
    assert.deepEqual(
      firmas.map((f) => f.rol),
      ['autor', 'revisor'],
    );
    for (const f of firmas) {
      assert.equal(c.firmaValida(f.llave_publica, f.mensaje, f.firma_cripto), true);
      assert.equal(f.trazo, TRAZO);
    }
  });

  await paso('nadie revisa su propio parte', async () => {
    const propio = await crearParte(revisor.id, divisionId, 'enviado');
    esError(await post(`/api/partes/${propio}/reto`, { accion: 'validar' }, tokenRevisor), 403, 'ES_SU_PARTE');
  });

  // --- Varios celulares y cerrar sesión ---------------------------------------

  await paso('registrar otro celular no desactiva el primero', async () => {
    const otro = celular();
    const claveOtro = await registrarCelular(noAutor, autor.contrasena, otro);
    await entrarConCelular(claveOtro, otro);
    await entrarConCelular(claveAutor, celAutor);
  });

  await paso('salir cierra la sesión', async () => {
    esOk(await post('/api/acceso/salir', {}, tokenAutor));
    esError(await post('/api/acceso/salir', {}, tokenAutor), 401, 'SIN_SESION');
  });
}

async function main() {
  await crearBase();
  const servidor = crearApp().listen(0);
  await new Promise((listo) => servidor.once('listening', listo));
  base = `http://127.0.0.1:${servidor.address().port}`;

  try {
    await probarPiezasSueltas();
    await probarFlujo();
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

// Prueba de punta a punta de la API de Administración, contra la base de
// DB_NAME. Hace las mismas llamadas que la página (administracion/src/api.ts).
//
// La llave de acceso (Touch ID, Face ID…) se simula con un «autenticador de
// software»: una llave P-256 hecha con node:crypto que arma respuestas
// WebAuthn reales. El servidor las verifica con @simplewebauthn/server igual
// que las de un navegador.
//
//   npm run probar-admin
//
// Crea usuarios de prueba nuevos en cada corrida. Úsalo sólo con la base de
// desarrollo.

'use strict';

require('../src/entorno');

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { crearBase } = require('./cargar-bd');
const { darDeAlta } = require('./usuario');
const db = require('../src/db');
const limite = require('../src/admin/limite');
const config = require('../src/admin/config');
const { crearApp } = require('../servidor');

const ORIGEN = 'http://localhost:3100';
let base;
let total = 0;

async function paso(nombre, prueba) {
  await prueba();
  total++;
  console.log(`  ok  ${nombre}`);
}

// --- Un navegador mínimo: guarda cookies y manda Origin ---------------------

function navegador() {
  const cookies = new Map();
  async function pedir(metodo, ruta, cuerpo, { origen = ORIGEN, tipo = 'application/json' } = {}) {
    const cabeceras = {};
    if (cookies.size) cabeceras.cookie = [...cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    if (origen) cabeceras.origin = origen;
    if (cuerpo !== undefined) cabeceras['content-type'] = tipo;
    const r = await fetch(base + ruta, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
    });
    for (const linea of r.headers.getSetCookie()) {
      const [par, ...atributos] = linea.split(';');
      const [nombre, ...valor] = par.split('=');
      const borrar = atributos.some((a) => /max-age=0|expires=thu, 01 jan 1970/i.test(a.trim()));
      if (borrar) cookies.delete(nombre.trim());
      else cookies.set(nombre.trim(), valor.join('='));
    }
    const texto = await r.text();
    let json = {};
    try {
      json = JSON.parse(texto);
    } catch {
      json = { texto };
    }
    return { ...json, http: r.status, cabeceras: r.headers };
  }
  return { pedir, cookies };
}

// --- CBOR mínimo (lo que usa WebAuthn) -----------------------------------------

function cbor(valor) {
  const cabeza = (mayor, n) => {
    if (n < 24) return Buffer.from([(mayor << 5) | n]);
    if (n < 256) return Buffer.from([(mayor << 5) | 24, n]);
    if (n < 65536) return Buffer.from([(mayor << 5) | 25, n >> 8, n & 255]);
    const b = Buffer.alloc(5);
    b[0] = (mayor << 5) | 26;
    b.writeUInt32BE(n, 1);
    return b;
  };
  if (typeof valor === 'number') return valor >= 0 ? cabeza(0, valor) : cabeza(1, -1 - valor);
  if (Buffer.isBuffer(valor)) return Buffer.concat([cabeza(2, valor.length), valor]);
  if (typeof valor === 'string') {
    const b = Buffer.from(valor, 'utf8');
    return Buffer.concat([cabeza(3, b.length), b]);
  }
  const pares = valor instanceof Map ? [...valor] : Object.entries(valor);
  return Buffer.concat([cabeza(5, pares.length), ...pares.flatMap(([k, v]) => [cbor(k), cbor(v)])]);
}

const b64u = (b) => Buffer.from(b).toString('base64url');
const sha = (b) => crypto.createHash('sha256').update(b).digest();

// --- El autenticador de software -----------------------------------------------

function autenticador({ origen = ORIGEN, rpId = config.RP_ID } = {}) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const credId = crypto.randomBytes(16);
  let contador = 0;
  let userHandle = null;
  const jwk = publicKey.export({ format: 'jwk' });
  const cose = new Map([
    [1, 2], // kty: EC2
    [3, -7], // alg: ES256
    [-1, 1], // crv: P-256
    [-2, Buffer.from(jwk.x, 'base64url')],
    [-3, Buffer.from(jwk.y, 'base64url')],
  ]);

  function clientData(tipo, reto) {
    return Buffer.from(JSON.stringify({ type: tipo, challenge: reto, origin: origen, crossOrigin: false }));
  }

  return {
    id: b64u(credId),
    crear(opciones) {
      userHandle = opciones.user.id;
      const contadorB = Buffer.alloc(4);
      const authData = Buffer.concat([
        sha(opciones.rp.id),
        Buffer.from([0x45]), // UP + UV + datos de la credencial
        contadorB,
        Buffer.alloc(16), // aaguid
        Buffer.from([0, credId.length]),
        credId,
        cbor(cose),
      ]);
      return {
        id: b64u(credId),
        rawId: b64u(credId),
        type: 'public-key',
        response: {
          clientDataJSON: b64u(clientData('webauthn.create', opciones.challenge)),
          attestationObject: b64u(cbor({ fmt: 'none', attStmt: {}, authData })),
          transports: ['internal'],
        },
        clientExtensionResults: {},
      };
    },
    // banderas: 0x05 = presencia + verificación del usuario (huella/cara)
    firmar(opciones, { banderas = 0x05, rp = rpId } = {}) {
      contador++;
      const contadorB = Buffer.alloc(4);
      contadorB.writeUInt32BE(contador);
      const authData = Buffer.concat([sha(rp), Buffer.from([banderas]), contadorB]);
      const cd = clientData('webauthn.get', opciones.challenge);
      const firma = crypto.sign('sha256', Buffer.concat([authData, sha(cd)]), privateKey);
      return {
        id: b64u(credId),
        rawId: b64u(credId),
        type: 'public-key',
        response: {
          clientDataJSON: b64u(cd),
          authenticatorData: b64u(authData),
          signature: b64u(firma),
          userHandle,
        },
        clientExtensionResults: {},
      };
    },
  };
}

// -----------------------------------------------------------------------------

async function main() {
  await crearBase();
  const servidor = crearApp().listen(0, '127.0.0.1');
  await new Promise((listo) => servidor.once('listening', listo));
  base = `http://127.0.0.1:${servidor.address().port}`;

  const sufijo = String(Date.now()).slice(-6);
  const matAdmin = `9${sufijo}`;
  const matOtroAdmin = `8${sufijo}`;
  const { contrasena: temporal } = await darDeAlta({ matricula: matAdmin, nombre: 'Admin de prueba', rol: 'administracion' });
  const { contrasena: temporalOtro } = await darDeAlta({ matricula: matOtroAdmin, nombre: 'Otro admin', rol: 'administracion' });
  const nueva = `Bomberos-${crypto.randomBytes(6).toString('hex')}`;
  const llave = autenticador();
  const nav = navegador();
  const { pedir } = nav;

  try {
    // --- Entrar --------------------------------------------------------------
    await paso('contraseña equivocada: 401 con el mismo mensaje que un número inexistente', async () => {
      const a = await pedir('POST', '/api/admin/acceso/entrar', { no_empleado: matAdmin, contrasena: 'no-es' });
      const b = await pedir('POST', '/api/admin/acceso/entrar', { no_empleado: '000000', contrasena: 'no-es' });
      assert.equal(a.http, 401);
      assert.equal(b.http, 401);
      assert.equal(a.error, b.error);
    });

    await paso('5 intentos fallidos: hay que esperar (429 con Retry-After)', async () => {
      limite.limpiar();
      for (let i = 0; i < 5; i++) await pedir('POST', '/api/admin/acceso/entrar', { no_empleado: '111111', contrasena: 'x' });
      const r = await pedir('POST', '/api/admin/acceso/entrar', { no_empleado: '111111', contrasena: 'x' });
      assert.equal(r.http, 429);
      assert.ok(Number(r.cabeceras.get('retry-after')) > 0);
      limite.limpiar();
    });

    await paso('un bombero o un capitán no entra a Administración', async () => {
      const r = await pedir('POST', '/api/admin/acceso/entrar', { no_empleado: '300112', contrasena: 'prueba300112' });
      assert.equal(r.http, 401);
    });

    await paso('sin Origin, o desde otro sitio, no se acepta nada que cambie algo (CSRF)', async () => {
      const otro = navegador();
      const sin = await otro.pedir('POST', '/api/admin/acceso/entrar', { no_empleado: matAdmin, contrasena: temporal }, { origen: null });
      const ajeno = await otro.pedir('POST', '/api/admin/acceso/entrar', { no_empleado: matAdmin, contrasena: temporal }, {
        origen: 'https://malicioso.example',
      });
      const formulario = await otro.pedir('POST', '/api/admin/acceso/entrar', `no_empleado=${matAdmin}`, {
        tipo: 'application/x-www-form-urlencoded',
      });
      assert.equal(sin.http, 403);
      assert.equal(ajeno.http, 403);
      assert.equal(formulario.http, 415);
    });

    let cookieAMedias;
    await paso('contraseña correcta: sesión a medias que todavía no abre nada', async () => {
      const r = await pedir('POST', '/api/admin/acceso/entrar', { no_empleado: matAdmin, contrasena: temporal });
      assert.equal(r.http, 200);
      assert.equal(r.paso, 'registrar_llave');
      cookieAMedias = nav.cookies.get(config.COOKIE_SESION);
      assert.ok(cookieAMedias);
      const partes = await pedir('GET', '/api/admin/partes');
      assert.equal(partes.http, 401);
      assert.equal(partes.error, 'falta_llave');
    });

    await paso('la cookie es HttpOnly y SameSite=Strict; la API manda encabezados de seguridad', async () => {
      const r = await fetch(`${base}/api/admin/acceso/entrar`, {
        method: 'POST',
        headers: { origin: ORIGEN, 'content-type': 'application/json' },
        body: JSON.stringify({ no_empleado: matAdmin, contrasena: temporal }),
      });
      const cookie = r.headers.getSetCookie().find((c) => c.startsWith(config.COOKIE_SESION));
      assert.match(cookie, /HttpOnly/i);
      assert.match(cookie, /SameSite=Strict/i);
      assert.equal(r.headers.get('cache-control'), 'no-store');
      assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(r.headers.get('x-powered-by'), null);
    });

    await paso('registrar la llave de acceso: la sesión sube a completa y el token cambia', async () => {
      const opciones = await pedir('POST', '/api/admin/acceso/llave/opciones-registro');
      assert.equal(opciones.http, 200);
      assert.equal(opciones.rp.id, config.RP_ID);
      assert.equal(opciones.authenticatorSelection.userVerification, 'required');
      const r = await pedir('POST', '/api/admin/acceso/llave/registrar', { respuesta: llave.crear(opciones), nombre: 'Touch ID de prueba' });
      assert.equal(r.http, 200, JSON.stringify(r));
      assert.notEqual(nav.cookies.get(config.COOKIE_SESION), cookieAMedias);
    });

    await paso('el token de antes de la llave ya no sirve (fijación de sesión)', async () => {
      const viejo = navegador();
      viejo.cookies.set(config.COOKIE_SESION, cookieAMedias);
      assert.equal((await viejo.pedir('GET', '/api/admin/acceso/yo')).http, 401);
    });

    await paso('con la contraseña que le dieron, sólo puede cambiarla', async () => {
      const partes = await pedir('GET', '/api/admin/partes');
      assert.equal(partes.http, 403);
      assert.equal(partes.error, 'debe_cambiar_contrasena');
      const corta = await pedir('POST', '/api/admin/acceso/contrasena', { actual: temporal, nueva: 'corta' });
      assert.equal(corta.error, 'contrasena_corta');
      const conMatricula = await pedir('POST', '/api/admin/acceso/contrasena', { actual: temporal, nueva: `abc-${matAdmin}-xyz` });
      assert.equal(conMatricula.error, 'contrasena_debil');
      const ok = await pedir('POST', '/api/admin/acceso/contrasena', { actual: temporal, nueva });
      assert.equal(ok.http, 200);
      assert.equal((await pedir('GET', '/api/admin/partes')).http, 200);
    });

    await paso('salir cierra la sesión', async () => {
      await pedir('POST', '/api/admin/acceso/salir');
      assert.equal((await pedir('GET', '/api/admin/acceso/yo')).http, 401);
    });

    let aserto;
    await paso('volver a entrar: contraseña y después la llave', async () => {
      const r = await pedir('POST', '/api/admin/acceso/entrar', { no_empleado: matAdmin, contrasena: nueva });
      assert.equal(r.paso, 'usar_llave');
      const otraLlave = await pedir('POST', '/api/admin/acceso/llave/opciones-registro');
      assert.equal(otraLlave.http, 403, 'con la contraseña sola no se registra una segunda llave');
      const opciones = await pedir('POST', '/api/admin/acceso/llave/opciones-acceso');
      assert.equal(opciones.allowCredentials[0].id, llave.id);
      aserto = llave.firmar(opciones);
      const v = await pedir('POST', '/api/admin/acceso/llave/verificar', { respuesta: aserto });
      assert.equal(v.http, 200, JSON.stringify(v));
      assert.equal((await pedir('GET', '/api/admin/partes')).http, 200);
    });

    await paso('una respuesta de la llave ya usada no sirve otra vez (repetición)', async () => {
      const otro = navegador();
      await otro.pedir('POST', '/api/admin/acceso/entrar', { no_empleado: matAdmin, contrasena: nueva });
      await otro.pedir('POST', '/api/admin/acceso/llave/opciones-acceso');
      const r = await otro.pedir('POST', '/api/admin/acceso/llave/verificar', { respuesta: aserto });
      assert.equal(r.http, 401);
    });

    await paso('sin verificar al usuario (sin huella ni cara) la llave no basta', async () => {
      const otro = navegador();
      await otro.pedir('POST', '/api/admin/acceso/entrar', { no_empleado: matAdmin, contrasena: nueva });
      const opciones = await otro.pedir('POST', '/api/admin/acceso/llave/opciones-acceso');
      const r = await otro.pedir('POST', '/api/admin/acceso/llave/verificar', { respuesta: llave.firmar(opciones, { banderas: 0x01 }) });
      assert.equal(r.http, 401);
    });

    await paso('una llave hecha para otro sitio (phishing) no sirve aquí', async () => {
      const otro = navegador();
      await otro.pedir('POST', '/api/admin/acceso/entrar', { no_empleado: matAdmin, contrasena: nueva });
      const opciones = await otro.pedir('POST', '/api/admin/acceso/llave/opciones-acceso');
      const falsa = autenticador({ origen: 'https://bomberos-falso.example', rpId: 'bomberos-falso.example' });
      const r = await otro.pedir('POST', '/api/admin/acceso/llave/verificar', { respuesta: { ...falsa.firmar(opciones), id: llave.id, rawId: llave.id } });
      assert.equal(r.http, 401);
    });

    await paso('la llave de otro administrador no sirve para esta cuenta', async () => {
      const otro = navegador();
      await otro.pedir('POST', '/api/admin/acceso/entrar', { no_empleado: matOtroAdmin, contrasena: temporalOtro });
      const opReg = await otro.pedir('POST', '/api/admin/acceso/llave/opciones-registro');
      const llaveOtro = autenticador();
      await otro.pedir('POST', '/api/admin/acceso/llave/registrar', { respuesta: llaveOtro.crear(opReg) });
      // Con la sesión a medias del primero, intenta usar la llave del segundo.
      const tercero = navegador();
      await tercero.pedir('POST', '/api/admin/acceso/entrar', { no_empleado: matAdmin, contrasena: nueva });
      const opciones = await tercero.pedir('POST', '/api/admin/acceso/llave/opciones-acceso');
      const r = await tercero.pedir('POST', '/api/admin/acceso/llave/verificar', { respuesta: llaveOtro.firmar(opciones) });
      assert.equal(r.http, 401);
    });

    await paso('entrar sólo con la llave, sin escribir el número de empleado', async () => {
      const otro = navegador();
      const opciones = await otro.pedir('POST', '/api/admin/acceso/llave-sola/opciones');
      assert.equal(opciones.userVerification, 'required');
      const r = await otro.pedir('POST', '/api/admin/acceso/llave-sola/verificar', { respuesta: llave.firmar(opciones) });
      assert.equal(r.http, 200, JSON.stringify(r));
      const yo = await otro.pedir('GET', '/api/admin/acceso/yo');
      assert.equal(yo.usuario.matricula, matAdmin);
      assert.equal(yo.nivel, 'completa');
    });

    await paso('el reto de entrar sólo con la llave se usa una vez', async () => {
      const otro = navegador();
      const opciones = await otro.pedir('POST', '/api/admin/acceso/llave-sola/opciones');
      const cookieReto = otro.cookies.get(config.COOKIE_RETO);
      await otro.pedir('POST', '/api/admin/acceso/llave-sola/verificar', { respuesta: llave.firmar(opciones) });
      const repetido = navegador();
      repetido.cookies.set(config.COOKIE_RETO, cookieReto);
      const r = await repetido.pedir('POST', '/api/admin/acceso/llave-sola/verificar', { respuesta: llave.firmar(opciones) });
      assert.equal(r.http, 401);
    });

    // --- Partes (RF-10, RF-14) ---------------------------------------------------
    await paso('partes: lista, filtros y opciones', async () => {
      const todos = await pedir('GET', '/api/admin/partes?estado=todos');
      assert.equal(todos.http, 200);
      assert.ok(todos.total >= 1);
      const opciones = await pedir('GET', '/api/admin/partes/opciones');
      assert.ok(opciones.tipos.includes('Incendio de pastizal'));
      const pastizal = await pedir('GET', `/api/admin/partes?estado=todos&tipo=${encodeURIComponent('Incendio de pastizal')}`);
      assert.ok(pastizal.partes.length >= 1);
      assert.ok(pastizal.partes.every((p) => p.tipo === 'Incendio de pastizal'));
      const rango = await pedir('GET', '/api/admin/partes?estado=todos&desde=2026-11-01&hasta=2026-11-30');
      assert.ok(rango.partes.every((p) => /\/11\/2026$/.test(p.fecha)));
      const inyeccion = await pedir('GET', `/api/admin/partes?estado=todos&texto=${encodeURIComponent("' OR 1=1 -- %")}`);
      assert.equal(inyeccion.http, 200);
      assert.equal(inyeccion.total, 0);
    });

    await paso('detalle de un parte y la evidencia de sus firmas', async () => {
      const r = await pedir('GET', '/api/admin/partes/PE-2026-0150');
      assert.equal(r.http, 200);
      assert.equal(r.parte.folio, 'PE-2026-0150');
      assert.ok(Array.isArray(r.firmas));
      assert.equal((await pedir('GET', '/api/admin/partes/..%2F..%2Fetc')).http, 404);
    });

    await paso('verificar sello: el de ejemplo (inventado) NO coincide; uno validado de verdad SÍ', async () => {
      const ejemplo = await pedir('GET', '/api/admin/partes/PE-2026-0147/sello');
      assert.equal(ejemplo.coincide, false);
      const validados = await pedir('GET', '/api/admin/partes?estado=validado');
      const real = validados.partes.find((p) => p.folio !== 'PE-2026-0147' && p.sello);
      if (real) {
        const r = await pedir('GET', `/api/admin/partes/${real.folio}/sello`);
        assert.equal(r.coincide, true, `${real.folio}: ${JSON.stringify(r)}`);
      }
    });

    await paso('exportar a CSV (con BOM para Excel)', async () => {
      const r = await fetch(`${base}/api/admin/partes/exportar?estado=todos`, {
        headers: { cookie: `${config.COOKIE_SESION}=${nav.cookies.get(config.COOKIE_SESION)}` },
      });
      assert.equal(r.status, 200);
      assert.match(r.headers.get('content-disposition'), /attachment; filename="partes-/);
      // .text() le quita el BOM al decodificar; se revisan los bytes tal cual.
      const bytes = Buffer.from(await r.arrayBuffer());
      assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
      assert.ok(bytes.subarray(3).toString('utf8').startsWith('Folio,Estado,Fecha'));
    });

    // --- Usuarios (RF-11, RF-12) -----------------------------------------------
    const matBombero = `7${sufijo}`;
    let bombero;
    let contrasenaBombero;
    await paso('alta de un bombero: la contraseña sale una sola vez y sirve en la app', async () => {
      const r = await pedir('POST', '/api/admin/usuarios', { matricula: matBombero, nombre: 'Bombero de prueba', rol: 'editor' });
      assert.equal(r.http, 201, JSON.stringify(r));
      assert.equal(r.contrasena.length, 12);
      bombero = r.usuario;
      contrasenaBombero = r.contrasena;
      const app = await pedir('POST', '/api/acceso/entrar', { no_empleado: matBombero, contrasena: contrasenaBombero });
      assert.equal(app.http, 200);
      const repetido = await pedir('POST', '/api/admin/usuarios', { matricula: matBombero, nombre: 'Otro', rol: 'editor' });
      assert.equal(repetido.error, 'matricula_repetida');
      const mala = await pedir('POST', '/api/admin/usuarios', { matricula: '12a', nombre: 'X Y', rol: 'editor' });
      assert.equal(mala.error, 'matricula_invalida');
    });

    await paso('permiso de revisar: editor ↔ capitán; nunca convertir en Administración', async () => {
      const r = await pedir('PATCH', `/api/admin/usuarios/${bombero.id}`, { rol: 'capitan' });
      assert.equal(r.usuario.rol, 'capitan');
      const admin = await pedir('PATCH', `/api/admin/usuarios/${bombero.id}`, { rol: 'administracion' });
      assert.equal(admin.error, 'rol_no_cambia');
      await pedir('PATCH', `/api/admin/usuarios/${bombero.id}`, { rol: 'editor' });
    });

    await paso('baja: ya no entra a la app y su sesión abierta deja de servir', async () => {
      const app = await pedir('POST', '/api/acceso/entrar', { no_empleado: matBombero, contrasena: contrasenaBombero });
      const r = await pedir('PATCH', `/api/admin/usuarios/${bombero.id}`, { activo: false });
      assert.equal(r.usuario.activo, false);
      const despues = await fetch(`${base}/api/acceso/trazo`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${app.token}` },
        body: JSON.stringify({ trazo: '1,1 2,2 3,3', contrasena: 'x' }),
      });
      assert.equal(despues.status, 401);
      const otraVez = await pedir('POST', '/api/acceso/entrar', { no_empleado: matBombero, contrasena: contrasenaBombero });
      assert.equal(otraVez.http, 401);
      await pedir('PATCH', `/api/admin/usuarios/${bombero.id}`, { activo: true });
    });

    await paso('restablecer: contraseña nueva; la vieja ya no sirve', async () => {
      const r = await pedir('POST', `/api/admin/usuarios/${bombero.id}/restablecer`);
      assert.equal(r.http, 200);
      assert.equal((await pedir('POST', '/api/acceso/entrar', { no_empleado: matBombero, contrasena: contrasenaBombero })).http, 401);
      assert.equal((await pedir('POST', '/api/acceso/entrar', { no_empleado: matBombero, contrasena: r.contrasena })).http, 200);
    });

    await paso('nadie se da de baja ni se restablece a sí mismo', async () => {
      const yo = await pedir('GET', '/api/admin/acceso/yo');
      assert.equal((await pedir('PATCH', `/api/admin/usuarios/${yo.usuario.id}`, { activo: false })).error, 'no_a_ti_mismo');
      assert.equal((await pedir('POST', `/api/admin/usuarios/${yo.usuario.id}/restablecer`)).error, 'no_a_ti_mismo');
    });

    await paso('una cuenta de Administración no entra a la app', async () => {
      const r = await pedir('POST', '/api/acceso/entrar', { no_empleado: matAdmin, contrasena: nueva });
      assert.equal(r.http, 401);
    });

    await paso('no se puede quitar la última llave de acceso', async () => {
      const { llaves } = await pedir('GET', '/api/admin/acceso/llaves');
      assert.equal(llaves.length, 1);
      const r = await pedir('DELETE', `/api/admin/acceso/llaves/${encodeURIComponent(llaves[0].id)}`);
      assert.equal(r.error, 'es_la_ultima');
    });

    await paso('la bitácora registra entradas, intentos fallidos, altas, bajas y exportaciones', async () => {
      const { registros } = await pedir('GET', '/api/admin/bitacora');
      const acciones = new Set(registros.map((x) => x.accion));
      for (const a of ['acceso', 'acceso_fallido', 'usuario_alta', 'usuario_baja', 'usuario_restablecido', 'exportacion', 'sello_verificado']) {
        assert.ok(acciones.has(a), `falta ${a}`);
      }
      assert.ok(!JSON.stringify(registros).includes(nueva), 'la bitácora no guarda contraseñas');
    });

    await paso('los avisos de Administración: sólo los suyos, y se marcan leídos', async () => {
      await db.ejecutar(
        "INSERT INTO notificacion (usuario_id, tipo, folio, titulo, texto) VALUES (?, 'parte_validado', 'PE-2026-0150', 'Parte validado', 'prueba')",
        [(await db.fila('SELECT id FROM usuario WHERE matricula = ?', [matAdmin])).id],
      );
      const r = await pedir('GET', '/api/admin/notificaciones');
      assert.equal(r.http, 200);
      assert.ok(r.notificaciones.some((n) => n.titulo === 'Parte validado' && n.leida === false));
      assert.ok(r.sin_leer >= 1);
      assert.equal((await pedir('POST', '/api/admin/notificaciones/leidas')).http, 200);
      assert.equal((await pedir('GET', '/api/admin/notificaciones')).sin_leer, 0);
    });

    await paso('sin sesión no se ve nada', async () => {
      const anonimo = navegador();
      for (const ruta of ['/api/admin/notificaciones', '/api/admin/partes', '/api/admin/usuarios', '/api/admin/bitacora', '/api/admin/partes/PE-2026-0150']) {
        assert.equal((await anonimo.pedir('GET', ruta)).http, 401, ruta);
      }
    });
  } finally {
    servidor.close();
    await db.cerrar();
  }
  console.log(`\n${total} pruebas pasaron.`);
}

main().catch((error) => {
  console.error('\nFALLÓ:', error.message);
  if (error.stack) console.error(error.stack.split('\n').slice(1, 4).join('\n'));
  process.exitCode = 1;
});

// Lo que hace Dirección con los usuarios, mientras no exista su página web.
//
//   npm run usuario -- alta <matrícula> "<nombre>" [--capitan | --administracion] [--rango "<rango>"] [--division "<división>"] [--estacion "<estación>"]
//   npm run usuario -- restablecer <matrícula>
//
// alta        crea al usuario e imprime la contraseña que se le entrega. Su
//             usuario es su número de empleado (la matrícula). --capitan lo
//             habilita para revisar. --administracion crea una cuenta para la
//             página web de Administración (así se crea la primera).
// restablecer para quien olvidó su contraseña: le da una nueva y borra la
//             llave de su celular y sus llaves de acceso web, para que las
//             registre otra vez al entrar. Cierra todas sus sesiones.
//
// La página de Administración usa estas mismas funciones.

'use strict';

require('../src/entorno');

const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');

const db = require('../src/db');
const { DIVISION } = require('../src/datos');

// Sin letras ni números que se confundan al dictarlos (l, 1, o, 0, i).
const LETRAS = 'abcdefghjkmnpqrstuvwxyz23456789';

function alAzar(largo) {
  let texto = '';
  for (let i = 0; i < largo; i++) texto += LETRAS[crypto.randomInt(LETRAS.length)];
  return texto;
}

const RANGO_DE_FABRICA = { editor: 'Bombero', capitan: 'Capitán', administracion: 'Administración' };

// La contraseña que se entrega: 12 caracteres al azar. Al entrar a la página
// de Administración hay que cambiarla (debe_cambiar = 1).
async function darDeAlta({ matricula, nombre, capitan = false, rol, rango, division, estacion }) {
  const elRol = rol || (capitan ? 'capitan' : 'editor');
  const id = `u-${matricula}`;
  const contrasena = alAzar(12);
  await db.ejecutar(
    `INSERT INTO usuario (id, nombre, matricula, rango, rol, division, estacion, contrasena_hash, debe_cambiar)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      id,
      nombre,
      matricula,
      rango || RANGO_DE_FABRICA[elRol],
      elRol,
      division || DIVISION,
      estacion || 'Central',
      await bcrypt.hash(contrasena, 12),
    ],
  );
  return { id, contrasena };
}

async function restablecer(matricula) {
  const usuario = await db.fila('SELECT id FROM usuario WHERE matricula = ?', [matricula]);
  if (!usuario) throw new Error(`No existe el número de empleado ${matricula}.`);
  const contrasena = alAzar(12);
  await db.transaccion(async (t) => {
    await t.ejecutar('UPDATE usuario SET contrasena_hash = ?, llave_publica = NULL, debe_cambiar = 1 WHERE id = ?', [
      await bcrypt.hash(contrasena, 12),
      usuario.id,
    ]);
    await t.ejecutar('DELETE FROM credencial_web WHERE usuario_id = ?', [usuario.id]);
    await t.ejecutar('DELETE FROM sesion_web WHERE usuario_id = ?', [usuario.id]);
    await t.ejecutar('DELETE FROM sesion WHERE usuario_id = ?', [usuario.id]);
  });
  return { contrasena };
}

function opcion(argumentos, nombre) {
  const posicion = argumentos.indexOf(nombre);
  return posicion >= 0 ? argumentos[posicion + 1] : undefined;
}

async function main(argumentos) {
  const [orden, matricula, nombre] = argumentos;

  if (orden === 'alta' && matricula && nombre) {
    const r = await darDeAlta({
      matricula,
      nombre,
      capitan: argumentos.includes('--capitan'),
      rol: argumentos.includes('--administracion') ? 'administracion' : undefined,
      rango: opcion(argumentos, '--rango'),
      division: opcion(argumentos, '--division'),
      estacion: opcion(argumentos, '--estacion'),
    });
    console.log(`Alta de ${nombre}. Usuario: ${matricula} · Contraseña: ${r.contrasena}`);
  } else if (orden === 'restablecer' && matricula) {
    console.log(`Contraseña nueva de ${matricula}: ${(await restablecer(matricula)).contrasena}`);
  } else {
    console.log('Uso:');
    console.log('  npm run usuario -- alta <matrícula> "<nombre>" [--capitan | --administracion] [--rango "…"] [--division "…"] [--estacion "…"]');
    console.log('  npm run usuario -- restablecer <matrícula>');
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main(process.argv.slice(2))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => db.cerrar());
}

module.exports = { darDeAlta, restablecer };

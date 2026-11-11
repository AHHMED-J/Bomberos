// Lo que hace Dirección con los usuarios, mientras no exista su página web.
//
//   npm run usuario -- alta <matrícula> "<nombre>" [--capitan] [--rango "<rango>"] [--division "<división>"] [--estacion "<estación>"]
//   npm run usuario -- restablecer <matrícula>
//
// alta        crea al usuario e imprime la contraseña que se le entrega. Su
//             usuario es su número de empleado (la matrícula). --capitan lo
//             habilita para revisar.
// restablecer para quien olvidó su contraseña: le da una nueva y borra la
//             llave de su celular, para que la registre otra vez al entrar.

'use strict';

require('dotenv').config({ quiet: true });

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

async function darDeAlta({ matricula, nombre, capitan = false, rango, division = DIVISION, estacion = 'Central' }) {
  const id = `u-${matricula}`;
  const contrasena = alAzar(10);
  await db.ejecutar(
    `INSERT INTO usuario (id, nombre, matricula, rango, rol, division, estacion, contrasena_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      nombre,
      matricula,
      rango || (capitan ? 'Capitán' : 'Bombero'),
      capitan ? 'capitan' : 'editor',
      division,
      estacion,
      await bcrypt.hash(contrasena, 12),
    ],
  );
  return { id, contrasena };
}

async function restablecer(matricula) {
  const usuario = await db.fila('SELECT id FROM usuario WHERE matricula = ?', [matricula]);
  if (!usuario) throw new Error(`No existe el número de empleado ${matricula}.`);
  const contrasena = alAzar(10);
  await db.ejecutar('UPDATE usuario SET contrasena_hash = ?, llave_publica = NULL WHERE id = ?', [
    await bcrypt.hash(contrasena, 12),
    usuario.id,
  ]);
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
      rango: opcion(argumentos, '--rango'),
      division: opcion(argumentos, '--division'),
      estacion: opcion(argumentos, '--estacion'),
    });
    console.log(`Alta de ${nombre}. Usuario: ${matricula} · Contraseña: ${r.contrasena}`);
  } else if (orden === 'restablecer' && matricula) {
    console.log(`Contraseña nueva de ${matricula}: ${(await restablecer(matricula)).contrasena}`);
  } else {
    console.log('Uso:');
    console.log('  npm run usuario -- alta <matrícula> "<nombre>" [--capitan] [--rango "…"] [--division "…"] [--estacion "…"]');
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

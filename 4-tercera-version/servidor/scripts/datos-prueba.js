// Carga en MySQL los usuarios y los partes de ejemplo que la app ya trae
// (los de app-bomberos/servidor/src/datos.js). A cada usuario le pone la
// contraseña prueba<matrícula>.
//
//   npm run datos-prueba
//
// Se puede correr varias veces: lo que ya existe no se toca.

'use strict';

require('dotenv').config({ quiet: true });

const path = require('node:path');
const bcrypt = require('bcryptjs');

const db = require('../src/db');
const datos = require('../src/datos');

const deLaApp = require(path.join(__dirname, '..', '..', '..', 'app-bomberos', 'servidor', 'src', 'datos'));

async function main() {
  for (const u of deLaApp.usuarios) {
    await db.ejecutar(
      `INSERT IGNORE INTO usuario (id, nombre, matricula, rango, rol, division, estacion, contrasena_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.nombre, u.matricula, u.rango, u.rol, u.division, u.estacion, await bcrypt.hash(`prueba${u.matricula}`, 12)],
    );
  }

  let nuevos = 0;
  for (const parte of deLaApp.partes.values()) {
    if (!(await datos.partePorFolio(parte.folio))) {
      await datos.guardarParte(parte);
      nuevos++;
    }
  }

  console.log('Usuarios (número de empleado / contraseña):');
  for (const u of deLaApp.usuarios) console.log(`  ${u.matricula} / prueba${u.matricula}   ${u.nombre} (${u.rol})`);
  console.log(`Partes de ejemplo nuevos: ${nuevos}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.cerrar());

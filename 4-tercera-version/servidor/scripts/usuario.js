// Lo que hace Dirección con los usuarios, mientras no exista su página web.
//
//   npm run usuario -- alta <no_empleado> "<nombre>" [--revisor] [--division "<nombre>"]
//   npm run usuario -- restablecer <no_empleado>
//
// Las dos imprimen una contraseña nueva para entregársela en persona.
// Restablecer es lo que se hace cuando alguien olvida su contraseña.

'use strict';

require('dotenv').config({ quiet: true });

const crypto = require('node:crypto');

const db = require('../src/db');
const c = require('../src/confirmacion');

// Sin letras ni números que se confundan al dictarlos (l, 1, o, 0, i).
const LETRAS = 'abcdefghjkmnpqrstuvwxyz23456789';

function contrasenaNueva() {
  let texto = '';
  for (let i = 0; i < 10; i++) texto += LETRAS[crypto.randomInt(LETRAS.length)];
  return texto;
}

async function idDivision(nombre) {
  if (!nombre) return null;
  await db.ejecutar('INSERT IGNORE INTO division (nombre) VALUES (?)', [nombre]);
  return (await db.fila('SELECT id FROM division WHERE nombre = ?', [nombre])).id;
}

async function darDeAlta({ noEmpleado, nombre, revisor = false, division = null }) {
  const contrasena = contrasenaNueva();
  const { insertId } = await db.ejecutar(
    `INSERT INTO usuario (no_empleado, nombre, puede_revisar, division_id, contrasena_hash)
     VALUES (?, ?, ?, ?, ?)`,
    [noEmpleado, nombre, revisor ? 1 : 0, await idDivision(division), await c.hashContrasena(contrasena)],
  );
  return { id: insertId, contrasena };
}

async function restablecer(noEmpleado) {
  const usuario = await db.fila('SELECT id FROM usuario WHERE no_empleado = ?', [noEmpleado]);
  if (!usuario) throw new Error(`No existe el número de empleado ${noEmpleado}.`);

  const contrasena = contrasenaNueva();
  await db.ejecutar('UPDATE usuario SET contrasena_hash = ? WHERE id = ?', [
    await c.hashContrasena(contrasena),
    usuario.id,
  ]);
  return { contrasena };
}

async function main(argumentos) {
  const [orden, noEmpleado, nombre] = argumentos;
  const posicionDivision = argumentos.indexOf('--division');
  const division = posicionDivision >= 0 ? argumentos[posicionDivision + 1] : null;

  if (orden === 'alta' && noEmpleado && nombre) {
    const { contrasena } = await darDeAlta({ noEmpleado, nombre, revisor: argumentos.includes('--revisor'), division });
    console.log(`Alta de ${noEmpleado} (${nombre}). Contraseña para entregarle: ${contrasena}`);
  } else if (orden === 'restablecer' && noEmpleado) {
    const { contrasena } = await restablecer(noEmpleado);
    console.log(`Contraseña de ${noEmpleado} restablecida. Contraseña nueva: ${contrasena}`);
  } else {
    console.log('Uso:');
    console.log('  npm run usuario -- alta <no_empleado> "<nombre>" [--revisor] [--division "<nombre>"]');
    console.log('  npm run usuario -- restablecer <no_empleado>');
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

module.exports = { darDeAlta, restablecer, idDivision };

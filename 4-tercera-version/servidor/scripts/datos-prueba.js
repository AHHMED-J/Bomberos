// Datos para probar la app en un celular: un elemento, un revisor de la
// misma división y un parte en borrador del elemento. Solo para la base de
// desarrollo.
//
//   npm run datos-prueba
//
// Se puede correr varias veces: los usuarios se crean una sola vez y cada
// corrida agrega un parte nuevo en borrador.

'use strict';

require('dotenv').config({ quiet: true });

const db = require('../src/db');
const c = require('../src/confirmacion');
const { idDivision } = require('./usuario');

// Un PNG de 1×1 en lugar de la firma en trazo, que todavía no se puede subir
// desde la app (RF-13).
const TRAZO_DE_PRUEBA =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const USUARIOS = [
  { noEmpleado: '1001', nombre: 'Elemento de prueba', contrasena: 'prueba1001', revisor: 0 },
  { noEmpleado: '2001', nombre: 'Revisor de prueba', contrasena: 'prueba2001', revisor: 1 },
];

async function main() {
  const division = await idDivision('Prueba');

  for (const u of USUARIOS) {
    await db.ejecutar(
      `INSERT IGNORE INTO usuario (no_empleado, nombre, puede_revisar, division_id, contrasena_hash, firma_trazo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [u.noEmpleado, u.nombre, u.revisor, division, await c.hashContrasena(u.contrasena), TRAZO_DE_PRUEBA],
    );
  }

  const autor = await db.fila("SELECT id FROM usuario WHERE no_empleado = '1001'");
  const { total } = await db.fila('SELECT COUNT(*) AS total FROM parte');
  const folio = `PRUEBA-${String(total + 1).padStart(4, '0')}`;
  const { insertId } = await db.ejecutar(
    'INSERT INTO parte (folio, division_id, datos, elaboro_id) VALUES (?, ?, ?, ?)',
    [folio, division, JSON.stringify({ tipo: 'Incendio de casa habitación', lugar: 'Calle de prueba 123' }), autor.id],
  );

  console.log('Usuarios (número de empleado / contraseña):');
  for (const u of USUARIOS) {
    console.log(`  ${u.noEmpleado} / ${u.contrasena}   ${u.nombre}${u.revisor ? ' (puede revisar)' : ''}`);
  }
  console.log(`Parte en borrador del 1001: id ${insertId}, folio ${folio}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.cerrar());

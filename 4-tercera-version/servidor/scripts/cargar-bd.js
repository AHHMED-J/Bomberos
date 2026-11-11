// Crea la base de DB_NAME (si no existe) y sus tablas (las que falten).
//
//   npm run db:crear

'use strict';

require('dotenv').config({ quiet: true });

const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');

async function crearBase() {
  const nombre = process.env.DB_NAME || 'bomberos_v3';
  if (!/^\w+$/.test(nombre)) throw new Error(`DB_NAME no es válido: ${nombre}`);

  const conexion = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4',
    multipleStatements: true,
  });

  try {
    await conexion.query(
      `CREATE DATABASE IF NOT EXISTS \`${nombre}\` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_0900_ai_ci`,
    );
    await conexion.query(`USE \`${nombre}\``);
    await conexion.query(await fs.readFile(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));
  } finally {
    await conexion.end();
  }
  return nombre;
}

if (require.main === module) {
  crearBase()
    .then((nombre) => console.log(`Listo: la base ${nombre} tiene sus tablas.`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = { crearBase };

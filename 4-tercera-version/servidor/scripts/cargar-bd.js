// Crea la base de DB_NAME (si no existe) y sus tablas (las que falten).
//
//   npm run db:crear

'use strict';

require('../src/entorno');

const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');

// schema.sql no toca las tablas que ya existen. Lo que se agregó después se
// agrega aquí, sólo si falta: se puede correr las veces que sea.
const { cifrar } = require('../src/boveda');

async function ponerAlDia(conexion, nombre) {
  const [columnas] = await conexion.query(
    "SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuario'",
    [nombre],
  );
  const tipo = Object.fromEntries(columnas.map((c) => [c.COLUMN_NAME, c.COLUMN_TYPE]));
  if (!tipo.rol.includes('administracion')) {
    await conexion.query(
      "ALTER TABLE usuario MODIFY rol ENUM('editor','capitan','administracion') NOT NULL DEFAULT 'editor'",
    );
  }
  if (!tipo.activo) await conexion.query('ALTER TABLE usuario ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1 AFTER trazo');
  if (!tipo.debe_cambiar) {
    await conexion.query('ALTER TABLE usuario ADD COLUMN debe_cambiar TINYINT(1) NOT NULL DEFAULT 0 AFTER activo');
  }
  // Las llaves de acceso post-cuánticas (ML-DSA) miden más de 1 KB.
  const [[llave]] = await conexion.query(
    "SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'credencial_web' AND COLUMN_NAME = 'llave'",
    [nombre],
  );
  if (llave && llave.DATA_TYPE === 'varbinary') await conexion.query('ALTER TABLE credencial_web MODIFY llave BLOB NOT NULL');

  // Las firmas guardadas antes de la bóveda estaban en texto: se cifran.
  const [firmas] = await conexion.query("SELECT id, trazo FROM usuario WHERE trazo IS NOT NULL AND trazo NOT LIKE 'v1.%'");
  for (const f of firmas) await conexion.query('UPDATE usuario SET trazo = ? WHERE id = ?', [cifrar(f.trazo, f.id), f.id]);
}

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
    await ponerAlDia(conexion, nombre);
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

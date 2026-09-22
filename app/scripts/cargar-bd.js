#!/usr/bin/env node
/**
 * cargar-bd.js — crea la base y la llena con los datos de ejemplo.
 *
 *   npm run db:crear
 *
 * Corre db/schema.sql y luego db/seed.sql con mysql2, así que no hace falta
 * tener el cliente `mysql` en el PATH (en Windows el instalador no lo pone).
 * Se conecta con lo que diga app/.env.
 *
 * Ojo: schema.sql empieza con DROP DATABASE IF EXISTS parte_digital, así
 * que esto borra y vuelve a crear la base cada vez.
 */

'use strict';

require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const DB = path.resolve(__dirname, '..', 'db');

async function main() {
  const conexion = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  for (const archivo of ['schema.sql', 'seed.sql']) {
    const sql = fs.readFileSync(path.join(DB, archivo), 'utf8');
    process.stdout.write(`${archivo}… `);
    await conexion.query(sql);
    console.log('listo');
  }

  const [tablas] = await conexion.query(
    `SELECT COUNT(*) AS n FROM information_schema.tables
      WHERE table_schema = ?`,
    [process.env.DB_NAME || 'parte_digital'],
  );
  const [partes] = await conexion.query(
    `SELECT COUNT(*) AS n FROM ${process.env.DB_NAME || 'parte_digital'}.parte`,
  );

  console.log(`\n${tablas[0].n} tablas creadas · ${partes[0].n} partes de ejemplo.`);
  await conexion.end();
}

main().catch((error) => {
  console.error(`\ncargar-bd: ${error.message}`);
  if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('Revisa DB_USER y DB_PASSWORD en app/.env.');
  }
  if (error.code === 'ECONNREFUSED') {
    console.error('¿Está corriendo MySQL? En Windows: net start MySQL80');
  }
  process.exit(1);
});

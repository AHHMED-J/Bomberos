// La conexión a MySQL: un solo pool para toda la app.

'use strict';

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'parte_digital',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: ['DATE', 'TIME'],
  charset: 'utf8mb4',
});

// Las tres funciones que usa toda la app. Los ? del SQL se rellenan con
// los valores: mysql2 los escapa, asi que no hay inyeccion de SQL.

// Varios renglones: devuelve un arreglo (vacio si no hubo resultados).
async function filas(sql, valores = []) {
  const respuesta = await pool.query(sql, valores);
  return respuesta[0];
}

// Un solo renglon: devuelve el objeto, o null si no hubo ninguno.
async function fila(sql, valores = []) {
  const encontrados = await filas(sql, valores);
  if (encontrados.length === 0) return null;
  return encontrados[0];
}

// INSERT, UPDATE y DELETE. Es lo mismo que filas(), con otro nombre para
// que al leer una ruta se vea de un vistazo si consulta o si escribe. Lo
// que devuelve trae insertId y affectedRows.
async function ejecutar(sql, valores = []) {
  const respuesta = await pool.query(sql, valores);
  return respuesta[0];
}

module.exports = { pool, filas, fila, ejecutar };

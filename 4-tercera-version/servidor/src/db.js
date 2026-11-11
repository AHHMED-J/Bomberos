// La conexión a MySQL: un solo pool para toda la app. Es el mismo db.js de
// la v1, más transaccion().

'use strict';

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bomberos_v3',
  waitForConnections: true,
  connectionLimit: 10,
  // Las fechas llegan como texto, tal como las guarda MySQL. Todas las
  // comparaciones de tiempo (vencimientos) se hacen en SQL con NOW(), así que
  // nunca se mezcla la hora de Node con la de MySQL.
  dateStrings: true,
  charset: 'utf8mb4',
});

// Los ? del SQL se rellenan con los valores: mysql2 los escapa, así que no
// hay inyección de SQL.
function funcionesSobre(conexion) {
  // Varios renglones: devuelve un arreglo (vacío si no hubo resultados).
  async function filas(sql, valores = []) {
    const respuesta = await conexion.query(sql, valores);
    return respuesta[0];
  }

  // Un solo renglón: devuelve el objeto, o null si no hubo ninguno.
  async function fila(sql, valores = []) {
    const encontrados = await filas(sql, valores);
    return encontrados.length === 0 ? null : encontrados[0];
  }

  // INSERT y UPDATE. Lo que devuelve trae insertId y affectedRows.
  async function ejecutar(sql, valores = []) {
    const respuesta = await conexion.query(sql, valores);
    return respuesta[0];
  }

  return { filas, fila, ejecutar };
}

// Corre varias escrituras como una sola: o entran todas o no entra ninguna.
// trabajo recibe { filas, fila, ejecutar } que usan la misma conexión.
async function transaccion(trabajo) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await trabajo(funcionesSobre(conexion));
    await conexion.commit();
    return resultado;
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

async function cerrar() {
  await pool.end();
}

module.exports = { ...funcionesSobre(pool), transaccion, cerrar };

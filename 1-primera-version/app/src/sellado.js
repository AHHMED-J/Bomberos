// El sellado del parte al validarlo (tabla archivo).
//
// Real: el documento se congela en app/almacen/, su hash SHA-256 se calcula
// sobre ese archivo y resguardo_hasta = fecha del servicio + 10 años (N7).
// SIMULADO: el documento sellado es HTML, no PDF. El hash y el resguardo
// funcionan igual sobre cualquiera de los dos; cambiarlo es reemplazar
// sellar().

'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const ejs = require('ejs');

const { fila, ejecutar } = require('./db');
const formato = require('./formato');

const ALMACEN = path.resolve(__dirname, '..', 'almacen');
const PLANTILLA = path.resolve(__dirname, '..', 'views', 'sellado.ejs');

function resguardoHasta(fechaServicio) {
  const base = fechaServicio ? new Date(`${fechaServicio}T00:00:00`) : new Date();
  base.setFullYear(base.getFullYear() + 10);
  return base.toISOString().slice(0, 10);
}

// Dibuja el documento, lo deja congelado en app/almacen/ y devuelve su ruta
// y el hash, calculado sobre el archivo ya escrito. Aparte de sellar(), lo
// usa cargar-bd.js: los partes de ejemplo llegan ya sellados desde seed.sql
// y ese renglon de la tabla archivo necesita un documento de verdad detras.
async function escribirDocumento(parte, selladoEn = new Date()) {
  // La plantilla se dibuja aqui, no por Express, asi que hay que pasarle a
  // mano el f de formato.js que las demas vistas reciben solas.
  const documento = await ejs.renderFile(PLANTILLA, {
    parte: parte,
    selladoEn: selladoEn,
    f: formato,
  });

  await fs.mkdir(ALMACEN, { recursive: true });
  const nombre = `${parte.folio}.html`;
  const destino = path.join(ALMACEN, nombre);
  await fs.writeFile(destino, documento, 'utf8');

  const hash = crypto.createHash('sha256').update(await fs.readFile(destino)).digest('hex');

  return { ruta: `almacen/${nombre}`, hash };
}

// UNIQUE en archivo.parte_id: un solo documento por parte.
async function sellar(parte) {
  const yaEsta = await fila('SELECT * FROM archivo WHERE parte_id = ?', [parte.id]);
  if (yaEsta) return yaEsta;

  const { ruta, hash } = await escribirDocumento(parte, new Date());

  await ejecutar(
    'INSERT INTO archivo (parte_id, pdf_ruta, hash_sha256, resguardo_hasta) VALUES (?, ?, ?, ?)',
    [parte.id, ruta, hash, resguardoHasta(parte.fecha)],
  );

  return fila('SELECT * FROM archivo WHERE parte_id = ?', [parte.id]);
}

module.exports = { sellar, escribirDocumento, resguardoHasta, ALMACEN };

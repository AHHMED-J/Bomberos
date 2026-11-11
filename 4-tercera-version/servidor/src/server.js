// El servidor de la app de celulares. Solo habla JSON.
//
//   npm start

'use strict';

require('dotenv').config({ quiet: true });

const express = require('express');

const { ErrorApi } = require('./errores');

function crearApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/acceso', require('./rutas/acceso'));
  app.use('/api/partes', require('./rutas/partes'));

  app.use((req, res) => {
    res.status(404).json({ error: 'NO_EXISTE', mensaje: 'Esa ruta no existe.' });
  });

  // Express 5 manda aquí también los errores de las funciones async.
  app.use((error, req, res, siguiente) => {
    if (error instanceof ErrorApi) {
      return res.status(error.estado).json({ error: error.codigo, mensaje: error.message, ...error.extra });
    }
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'JSON', mensaje: 'La petición no es JSON válido.' });
    }
    console.error(error);
    res.status(500).json({ error: 'ERROR', mensaje: 'Algo salió mal en el servidor.' });
  });

  return app;
}

if (require.main === module) {
  const puerto = Number(process.env.PORT || 3000);
  crearApp().listen(puerto, () => {
    console.log(`Servidor de BomberosApp en http://localhost:${puerto}`);
  });
}

module.exports = { crearApp };

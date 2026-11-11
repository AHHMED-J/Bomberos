// El servidor de la tercera versión. Contesta lo mismo que
// app-bomberos/servidor (la app no nota la diferencia), pero guarda en MySQL.
//
//   npm start      (puerto 3100, el que ya usa la app; PORT=xxxx para cambiarlo)

'use strict';

require('dotenv').config({ quiet: true });

const express = require('express');

const firma = require('./firma');
const { rutasIa, modoIa } = require('./de-la-app');

function crearApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '25mb' })); // el audio del dictado llega en base64
  app.use((req, _res, siguiente) => {
    req.body ??= {};
    siguiente();
  });

  app.get('/api/salud', (_req, res) => res.json({ ok: true, firmas_simuladas: firma.ACEPTA_SIMULADAS, ia_modo: modoIa }));
  app.use('/api/acceso', require('./rutas/acceso'));
  app.use('/api/partes', require('./rutas/partes'));
  app.use('/api/revision', require('./rutas/revision'));
  app.use('/api/ia', rutasIa);

  app.use((_req, res) => res.status(404).json({ error: 'no_existe' }));

  // Express 5 manda aquí también los errores de las funciones async.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'audio_muy_grande' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'json_invalido' });
    console.error(err);
    res.status(err.status || 500).json({ error: 'error_interno' });
  });

  return app;
}

if (require.main === module) {
  const puerto = Number(process.env.PORT) || 3100;
  crearApp().listen(puerto, '0.0.0.0', () => {
    console.log(`BomberosApp · servidor de la tercera versión en http://0.0.0.0:${puerto}`);
  });
}

module.exports = { crearApp };

// API JSON de prueba para la app iOS del parte digital. Sin base de datos: todo en memoria.
// Uso: npm install && npm start   (puerto 3100; PORT=xxxx para cambiarlo)
const express = require('express');
const firma = require('./src/firma');

const app = express();
app.use(express.json({ limit: '25mb' })); // el audio llega en base64 (ver CONTRATOS-IA.md)
app.use((req, _res, next) => {
  console.log(new Date().toLocaleTimeString(), req.method, req.url);
  next();
});

app.get('/api/salud', (_req, res) => res.json({ ok: true, firmas_simuladas: firma.ACEPTA_SIMULADAS }));
app.use('/api/acceso', require('./src/rutas/acceso'));
app.use('/api/partes', require('./src/rutas/partes'));
app.use('/api/revision', require('./src/rutas/revision'));
app.use('/api/ia', require('./src/rutas/ia'));

app.use((_req, res) => res.status(404).json({ error: 'no_existe' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.type === 'entity.too.large' ? 'audio_muy_grande' : 'error_interno' });
});

const PUERTO = Number(process.env.PORT) || 3100;
app.listen(PUERTO, '0.0.0.0', () => console.log(`Parte digital · API de prueba en http://0.0.0.0:${PUERTO}`));

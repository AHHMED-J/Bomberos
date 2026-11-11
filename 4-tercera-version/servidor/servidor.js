// API JSON para la app del parte digital. Usuarios, firmas y partes en MySQL; IA fija o local.
// Uso: npm install && npm start   (puerto 3100; PORT=xxxx para cambiarlo). Antes, una vez: ver README.md.
require('./src/entorno');

const express = require('express');
const db = require('./src/db');
const firma = require('./src/firma');

function crearApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '25mb' })); // el audio llega en base64 (ver CONTRATOS-IA.md)
  app.use((req, _res, next) => {
    req.body ??= {};
    console.log(new Date().toLocaleTimeString(), req.method, req.url);
    next();
  });

  app.get('/api/salud', (_req, res) =>
    res.json({ ok: true, firmas_simuladas: firma.ACEPTA_SIMULADAS, ia_modo: require('./src/ia/config').modo }));
  app.use('/api/acceso', require('./src/rutas/acceso'));
  app.use('/api/partes', require('./src/rutas/partes'));
  app.use('/api/revision', require('./src/rutas/revision'));
  app.use('/api/ia', require('./src/rutas/ia'));

  app.use((_req, res) => res.status(404).json({ error: 'no_existe' }));
  // Express 5 manda aquí también los errores de las rutas async (p. ej. si MySQL no contesta).
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.type === 'entity.too.large' ? 'audio_muy_grande' : 'error_interno' });
  });
  return app;
}

if (require.main === module) {
  const PUERTO = Number(process.env.PORT) || 3100;
  crearApp().listen(PUERTO, '0.0.0.0', async () => {
    console.log(`Parte digital · API en http://0.0.0.0:${PUERTO}`);
    try {
      await db.fila('SELECT 1 FROM usuario LIMIT 1');
    } catch (e) {
      console.error(`\nMySQL no está listo (${e.code || e.message}). Revisa servidor/.env y corre «npm run db:crear».`);
      console.error('Mientras tanto, entrar, enviar y validar van a fallar; la IA sí contesta.\n');
    }
  });
}

module.exports = { crearApp };

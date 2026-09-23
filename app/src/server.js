// Prototipo navegable del sistema de parte digital.
// Express + EJS del lado del servidor + mysql2, sin JavaScript de cliente:
// cada acción es un enlace o un <form>, para que el sitemap de la Figura 1
// se vea tal cual en las URLs. Las rutas son las de la Tabla 3.

'use strict';

require('dotenv').config();

const path = require('node:path');
const express = require('express');
const cookieParser = require('cookie-parser');
const ejs = require('ejs');

const sesion = require('./sesion');
const formato = require('./formato');

const app = express();
const RAIZ = path.resolve(__dirname, '..');
const REPO = path.resolve(RAIZ, '..');

const VISTAS = path.join(RAIZ, 'views');
app.set('view engine', 'ejs');
app.set('views', VISTAS);

// El motor se registra a mano para pasarle root: sin eso, los include que
// empiezan con / los busca en la raiz del disco en vez de en views/.
app.engine('ejs', (archivo, datos, cb) =>
  ejs.renderFile(archivo, datos, { root: VISTAS }, cb));

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.locals.f = formato;

// El CSS de la maqueta se sirve desde docs/css/ sin copiarlo, y app-ui.css
// se carga encima. El README explica la decisión.
app.use('/css', express.static(path.join(REPO, 'docs', 'css')));
app.use('/css', express.static(path.join(RAIZ, 'public', 'css')));

app.use((req, res, siguiente) => {
  sesion.cargar(req, res, siguiente).catch(siguiente);
});

app.use((req, res, siguiente) => {
  res.locals.inicioDeRol = req.usuario ? sesion.inicioDe(req.usuario) : '/acceso';
  res.locals.contexto = null;
  res.locals.sinMenu = false;
  res.locals.query = req.query;
  siguiente();
});

app.use(require('./rutas/acceso'));
app.use(require('./rutas/partes'));
app.use(require('./rutas/revision'));
app.use(require('./rutas/direccion'));

app.get('/', (req, res) => {
  res.redirect(req.usuario ? sesion.inicioDe(req.usuario) : '/acceso');
});

app.use((req, res) => {
  res.status(404).render('no-existe', { ruta: req.originalUrl });
});

app.use((error, req, res, _siguiente) => {
  console.error(error);
  res.status(500).render('error', { mensaje: error.message });
});

const PUERTO = Number(process.env.PORT || 3000);
app.listen(PUERTO, () => {
  console.log(`Parte Digital · prototipo en http://localhost:${PUERTO}`);
});

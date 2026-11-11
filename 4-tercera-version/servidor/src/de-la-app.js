// Lo que este servidor toma tal cual de app-bomberos/servidor, para no
// tener dos copias que se desfasen:
//
//   validacion   la revisión del parte y el contenido canónico que se firma.
//                Tiene que coincidir byte a byte con la app.
//   rutasIa      /api/ia/* (dictado, llenado de campos y resumen), con su
//                propia configuración en app-bomberos/servidor/.env.
//   sesionesIa   las sesiones en memoria con las que esas rutas autorizan.

'use strict';

const path = require('node:path');
const Module = require('node:module');

const SERVIDOR_APP = path.join(__dirname, '..', '..', '..', 'app-bomberos', 'servidor', 'src');

// Las rutas de la IA piden 'express' desde su carpeta, que puede no tener
// node_modules. Con esto lo encuentran en el de este servidor.
process.env.NODE_PATH = [path.join(__dirname, '..', 'node_modules'), process.env.NODE_PATH]
  .filter(Boolean)
  .join(path.delimiter);
Module._initPaths();

const validacion = require(path.join(SERVIDOR_APP, 'validacion'));
const rutasIa = require(path.join(SERVIDOR_APP, 'rutas', 'ia'));
const sesionesIa = require(path.join(SERVIDOR_APP, 'datos')).sesiones;
const modoIa = require(path.join(SERVIDOR_APP, 'ia', 'config')).modo;

module.exports = { validacion, rutasIa, sesionesIa, modoIa };

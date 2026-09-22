#!/usr/bin/env node
/**
 * importar-pantallas.js — pasa las pantallas de docs/screens/ a vistas de /app.
 *
 *   node scripts/importar-pantallas.js            (no pisa lo que ya existe)
 *   node scripts/importar-pantallas.js --forzar   (vuelve a generar todo)
 *   node scripts/importar-pantallas.js --listar   (sólo dice qué haría)
 *
 * Se corrió una vez al arrancar el prototipo; de ahí en adelante las vistas
 * se editan en app/views/, porque divergen de la maqueta. Queda en el repo
 * para que se vea de dónde salió cada vista, y por eso no sobrescribe sin
 * --forzar. docs/ sólo se lee: no se toca.
 *
 * Reusa el regex CUERPO de build.py para sacar el <div class="screen">.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..', '..');
const PANTALLAS = path.join(RAIZ, 'docs', 'screens');
const MANIFIESTO = path.join(RAIZ, 'manifest.json');
const VISTAS = path.resolve(__dirname, '..', 'views');

// Los mismos regex de build.py, más el del contenido que sí cambia por ruta.
const CUERPO = /<body class="preview">([\s\S]*)<\/body>/;
const RAIZ_PANTALLA = /<div class="screen" id="([\w-]+)">/;
const PRINCIPAL = /<main class="main">[\s\S]*<\/main>/;
const TRAS_BARRA = /<\/header>([\s\S]*)<\/div>\s*$/;

// De qué pantalla de la maqueta sale cada vista, y a qué ruta corresponde.
// Las pantallas nuevas (Inicio · Mis partes, el paso 2, el cierre del paso
// 4, Archivo y Personal) no están aquí: se escribieron a mano.
const MAPA = [
  { pantalla: 'acceso.html',              vista: 'acceso.ejs',                     ruta: '/acceso' },
  { pantalla: 'registro-credencial.html', vista: 'registro.ejs',                   ruta: '/registro' },
  { pantalla: 'acceso-compartido.html',   vista: 'acceso-estacion.ejs',            ruta: '/acceso/estacion' },
  { pantalla: 'formulario.html',          vista: 'partes/datos.ejs',               ruta: '/partes/:id/datos' },
  { pantalla: 'croquis.html',             vista: 'partes/croquis.ejs',             ruta: '/partes/:id/croquis' },
  // Esta se fusiono con la de arriba: en la app las dos pantallas son el
  // mismo momento, con o sin respuesta de la IA, asi que viven en una sola
  // ruta. El script la sigue sabiendo generar por si se quiere consultar
  // aparte, pero la vista suelta no se versiona.
  { pantalla: 'croquis-sin-respuesta.html', vista: 'partes/croquis-sin-respuesta.ejs', ruta: '/partes/:id/croquis (estado alterno, fusionado)' },
  { pantalla: 'resumen-firma.html',       vista: 'partes/firma.ejs',               ruta: '/partes/:id/firma' },
  { pantalla: 'envio-confirmado.html',    vista: 'partes/enviado.ejs',             ruta: '/partes/:id/enviado' },
  { pantalla: 'bandeja.html',             vista: 'revision/bandeja.ejs',           ruta: '/revision' },
  { pantalla: 'bandeja-detalle.html',     vista: 'revision/detalle.ejs',           ruta: '/revision/:id' },
  { pantalla: 'panel-direccion.html',     vista: 'direccion/partes.ejs',           ruta: '/direccion/partes y /consulta' },
  { pantalla: 'panel-detalle.html',       vista: 'direccion/detalle.ejs',          ruta: '/direccion/partes/:id' },
];

/** Devuelve el .screen de una pantalla, sin su documento envolvente. */
function cuerpoDe(archivo) {
  const encontrado = CUERPO.exec(fs.readFileSync(archivo, 'utf8'));
  if (!encontrado) {
    throw new Error(`${path.basename(archivo)}: falta <body class="preview"> … </body>`);
  }
  return encontrado[1].trim();
}

// Lo que cambia de una ruta a otra: ocho pantallas tienen <main class="main">
// y cuatro son centradas, con sólo la barra superior; de ésas se toma lo que
// va después de </header>. La barra y el menú no se copian a cada vista:
// viven una sola vez en views/parcial/.
function contenido(cuerpo, pantalla) {
  const principal = PRINCIPAL.exec(cuerpo);
  if (principal) return principal[0];

  const centrado = TRAS_BARRA.exec(cuerpo);
  if (centrado) return centrado[1].trim();

  throw new Error(`${pantalla}: no se encontró ni <main class="main"> ni contenido tras </header>`);
}

/** Indenta lo importado para que quepa dentro de la plantilla. */
function sangrar(texto, espacios) {
  const relleno = ' '.repeat(espacios);
  return texto
    .split('\n')
    .map((linea) => (linea.trim() === '' ? '' : relleno + linea))
    .join('\n');
}

function encabezado(entrada, figura, id) {
  return [
    '<%# ===========================================================',
    `     Generada por scripts/importar-pantallas.js desde`,
    `     docs/screens/${entrada.pantalla} (figura ${figura}, #${id}).`,
    `     Ruta: ${entrada.ruta}`,
    '',
    '     docs/ es la maqueta publicada y no se toca. Esta vista ya',
    '     divergió de ella: se edita aquí.',
    '     =========================================================== %>',
    '',
  ].join('\n');
}

function main() {
  const forzar = process.argv.includes('--forzar');
  const listar = process.argv.includes('--listar');

  const manifiesto = JSON.parse(fs.readFileSync(MANIFIESTO, 'utf8'));
  const rotulos = new Map();
  for (const seccion of manifiesto.secciones) {
    for (const pantalla of seccion.pantallas) {
      rotulos.set(pantalla.archivo, pantalla);
    }
  }

  let escritas = 0;
  let saltadas = 0;

  for (const entrada of MAPA) {
    const origen = path.join(PANTALLAS, entrada.pantalla);
    if (!fs.existsSync(origen)) {
      throw new Error(`no existe docs/screens/${entrada.pantalla}`);
    }

    const cuerpo = cuerpoDe(origen);
    const id = (RAIZ_PANTALLA.exec(cuerpo) || [, '?'])[1];
    const ficha = rotulos.get(entrada.pantalla) || {};
    const destino = path.join(VISTAS, entrada.vista);

    if (listar) {
      console.log(`${entrada.pantalla.padEnd(26)} → views/${entrada.vista}`);
      continue;
    }

    if (fs.existsSync(destino) && !forzar) {
      console.log(`· views/${entrada.vista} ya existe, no se toca`);
      saltadas += 1;
      continue;
    }

    const texto =
      encabezado(entrada, ficha.figura || '?', id) +
      sangrar(contenido(cuerpo, entrada.pantalla), 0) +
      '\n';

    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, texto, 'utf8');
    console.log(`✓ views/${entrada.vista}  ←  docs/screens/${entrada.pantalla}`);
    escritas += 1;
  }

  if (!listar) {
    console.log(`\n${escritas} vistas generadas, ${saltadas} respetadas.`);
    console.log('Las vistas nuevas de /app (Inicio · Mis partes, paso 2,');
    console.log('cierre del paso 4, Archivo y Personal) no salen de la maqueta.');
  }
}

try {
  main();
} catch (error) {
  console.error(`importar-pantallas: ${error.message}`);
  process.exit(1);
}

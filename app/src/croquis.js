// El croquis de la escena (Figura 4).
//
// SIMULADO: reconoce palabras en la descripción y arma un SVG de ejemplo
// con el mismo trazo de docs/screens/croquis.html. No entiende la escena,
// sólo empareja palabras clave contra un catálogo corto (elementosDe). Si
// la descripción está vacía, quien llama muestra la pantalla "croquis sin
// respuesta" y guarda el parte igual, porque el croquis es opcional.

'use strict';

const CATALOGO = [
  { tipo: 'estructura', palabras: ['casa', 'inmueble', 'edificio', 'vivienda', 'local', 'bodega', 'departamento', 'fonda'] },
  { tipo: 'fuego',      palabras: ['fuego', 'incendio', 'flama', 'llama', 'humo', 'quema'] },
  { tipo: 'unidad',     palabras: ['unidad', 'pipa', 'camión', 'camion', 'ambulancia'] },
  { tipo: 'hidrante',   palabras: ['hidrante', 'toma de agua'] },
  { tipo: 'vehiculo',   palabras: ['vehículo', 'vehiculo', 'camioneta', 'auto', 'carro', 'volcadura', 'motocicleta'] },
  { tipo: 'vegetacion', palabras: ['pastizal', 'maleza', 'monte', 'ladera', 'forestal', 'árbol', 'arbol'] },
  { tipo: 'persona',    palabras: ['persona', 'lesionado', 'atrapada', 'víctima', 'victima', 'paciente'] },
];

const ETIQUETAS = {
  estructura: 'Inmueble', fuego: 'Foco de fuego', unidad: 'Unidad',
  hidrante: 'Hidrante', vehiculo: 'Vehículo', vegetacion: 'Vegetación',
  persona: 'Persona',
};

// Los trazos de cada elemento, con las clases sk-* de components.css.
const TRAZOS = {
  estructura: `<rect class="sk-solid" x="120" y="96" width="270" height="234"/>
    <path class="sk-solid" d="M120 96 255 46l135 50"/>
    <rect class="sk-soft" x="152" y="128" width="62" height="50"/>
    <rect class="sk-soft" x="232" y="258" width="56" height="72"/>
    <text class="sk-label" x="150" y="316">INMUEBLE</text>`,
  vegetacion: `<path class="sk-soft" d="M90 300c30-40 70-60 120-60s90 20 120 60"/>
    <text class="sk-label" x="150" y="290">VEGETACIÓN</text>`,
  fuego: `<rect class="sk-fire" x="292" y="128" width="62" height="50"/>
    <path class="sk-fire" d="M323 100c14 12 21 20 21 28a21 21 0 0 1-42 0c0-8 7-16 21-28Z"/>
    <text class="sk-label sk-label--fire" x="410" y="140">FOCO DE FUEGO</text>`,
  vehiculo: `<rect class="sk-soft" x="150" y="230" width="150" height="52" rx="2"/>
    <text class="sk-label" x="164" y="262">VEHÍCULO</text>`,
  persona: `<circle class="sk-solid" cx="430" cy="250" r="10"/>
    <path class="sk-solid" d="M430 260v26M418 270h24M430 286l-10 18M430 286l10 18"/>
    <text class="sk-label" x="396" y="324">PERSONA</text>`,
  unidad: `<path class="sk-dashed" d="M680 300C600 250 500 210 400 196"/>
    <rect class="sk-solid" x="470" y="286" width="210" height="62" rx="2"/>
    <text class="sk-label sk-label--ink" x="486" y="324">UNIDAD</text>
    <circle class="sk-solid" cx="508" cy="352" r="14"/>
    <circle class="sk-solid" cx="642" cy="352" r="14"/>`,
  hidrante: `<circle class="sk-solid" cx="790" cy="300" r="7"/>
    <path class="sk-solid" d="M790 307v26M778 315h24"/>
    <text class="sk-label" x="748" y="392">HIDRANTE</text>`,
};

// La calle siempre va: es lo que orienta el croquis en la hoja de papel.
const BASE = `<path class="sk-soft" d="M36 44h26M36 44v26"/>
  <text class="sk-label sk-label--faint" x="36" y="34">N</text>
  <path class="sk-street" d="M0 330h880M0 364h880"/>
  <path class="sk-street" d="M20 347h44M100 347h44M180 347h44M260 347h44M340 347h44M420 347h44M500 347h44M580 347h44M660 347h44M740 347h44M820 347h44"/>`;

// Quita los acentos para que "camion" encuentre "camión". Se cambia letra
// por letra a proposito: es mas largo, pero se ve lo que hace.
const CON_ACENTO = 'áéíóúüñÁÉÍÓÚÜÑ';
const SIN_ACENTO = 'aeiouunAEIOUUN';

function sinAcentos(texto) {
  let limpio = '';
  for (const letra of String(texto)) {
    const posicion = CON_ACENTO.indexOf(letra);
    limpio += posicion === -1 ? letra : SIN_ACENTO[posicion];
  }
  return limpio.toLowerCase();
}

const escapar = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Reconoce palabras, no entiende la escena: ésa es la parte simulada.
function elementosDe(descripcion) {
  const texto = sinAcentos(descripcion || '');
  const encontrados = CATALOGO
    .filter((e) => e.palabras.some((p) => texto.includes(sinAcentos(p))))
    .map((e) => ({ tipo: e.tipo, etiqueta: ETIQUETAS[e.tipo] }));

  return encontrados.length ? encontrados : [{ tipo: 'estructura', etiqueta: 'Escena' }];
}

function dibujar(elementos, lugar) {
  const tipos = new Set(elementos.map((e) => e.tipo));
  const calle = escapar((lugar || 'Vía pública').toUpperCase().slice(0, 30));

  const piezas = Object.keys(TRAZOS)
    .filter((tipo) => tipos.has(tipo))
    .map((tipo) => TRAZOS[tipo]);

  return `<svg viewBox="0 0 880 420" aria-label="Croquis esquemático de la escena">${BASE}
    <text class="sk-label sk-label--faint" x="24" y="400">${calle}</text>
    ${piezas.join('')}</svg>`;
}

// Devuelve { ok, elementos, svg } o { ok: false, motivo }.
async function generar(parte) {
  const descripcion = parte.descripcion || '';
  if (!descripcion.trim()) {
    return { ok: false, motivo: 'Todavía no hay descripción de los hechos que leer.' };
  }

  const elementos = elementosDe(descripcion);
  return { ok: true, elementos, svg: dibujar(elementos, parte.lugar_servicio) };
}

module.exports = { generar, dibujar, elementosDe };

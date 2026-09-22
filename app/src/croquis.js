// El croquis de la escena (Figura 4).
//
// Sin GEMINI_API_KEY es SIMULADO: reconoce palabras en la descripción y
// arma un SVG de ejemplo con el mismo trazo de docs/screens/croquis.html.
// Con llave, le pide los elementos a la API en JSON. Si falla, quien llama
// muestra la pantalla "croquis sin respuesta" y guarda el parte igual,
// porque el croquis es opcional.

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

async function pedirAGemini(descripcion) {
  const modelo = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const respuesta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(12000),   // se rinde a los 12 segundos
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{
            text:
              'Eres el asistente de croquis de un parte de bomberos. A partir de la ' +
              'descripción de los hechos, devuelve los elementos que debe llevar un ' +
              'croquis esquemático de la escena. Usa sólo estos tipos: ' +
              CATALOGO.map((c) => c.tipo).join(', ') +
              '. Responde en español.\n\nDescripción:\n' + descripcion,
          }],
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              elementos: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    tipo: { type: 'string', enum: CATALOGO.map((c) => c.tipo) },
                    etiqueta: { type: 'string' },
                  },
                  required: ['tipo', 'etiqueta'],
                },
              },
            },
            required: ['elementos'],
          },
        },
      }),
    },
  );

  if (!respuesta.ok) throw new Error(`la API respondió ${respuesta.status}`);

  // La respuesta viene envuelta en varias capas. Se abren de una en una
  // para que se vea la forma del JSON que manda Gemini.
  const cuerpo = await respuesta.json();
  const candidatos = cuerpo.candidates;
  if (!candidatos || !candidatos.length) throw new Error('la API no devolvió contenido');

  const partes = candidatos[0].content.parts;
  if (!partes || !partes.length) throw new Error('la API no devolvió contenido');

  const elementos = JSON.parse(partes[0].text).elementos;
  if (!Array.isArray(elementos) || !elementos.length) {
    throw new Error('la API no devolvió elementos');
  }
  return elementos;
}

// Devuelve { ok, elementos, svg } o { ok: false, motivo }.
async function generar(parte) {
  const descripcion = parte.descripcion || '';
  if (!descripcion.trim()) {
    return { ok: false, motivo: 'Todavía no hay descripción de los hechos que leer.' };
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const elementos = await pedirAGemini(descripcion);
      return { ok: true, elementos, svg: dibujar(elementos, parte.lugar_servicio) };
    } catch (error) {
      return { ok: false, motivo: `El servicio de IA no respondió (${error.message}).` };
    }
  }

  const elementos = elementosDe(descripcion);
  return { ok: true, elementos, svg: dibujar(elementos, parte.lugar_servicio) };
}

module.exports = { generar, dibujar, elementosDe };

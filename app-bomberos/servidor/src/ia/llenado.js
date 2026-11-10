// IA 2 · Llenado de campos. El modelo (Ollama) sólo PROPONE; aquí se verifica todo con reglas fijas
// antes de devolverlo a la app. Contrato: servidor/CONTRATOS-IA.md § 2.
const { chatJson } = require('./ollama');
const { normalizar, cobertura, citaEnTexto, tieneNegacion } = require('./texto');

// Campos que la IA no llena (los pone el teléfono).
const NO_DICTABLES = new Set(['fecha']);

// Nombres, lugares y narrativa: aunque el modelo esté «seguro», el bombero los revisa siempre.
const SIEMPRE_REVISAR = new Set([
  'propietario', 'telefono_propietario', 'lugar_servicio', 'personal_turno', 'voluntarios',
  'descripcion', 'unidades_apoyo', 'instituciones_apoyo',
]);

// Qué significa cada casilla (va en el prompt). Evita, por ejemplo, que el lugar acabe en «zona».
// Los ejemplos NO deben coincidir con los casos de ia-local/evaluacion (el modelo los copia y la evaluación se infla).
const PISTAS = {
  no_incidente_c5: 'número de incidente que da C-5, tal como se dictó (con letras y dígitos, p. ej. del estilo ABC-00-000000)',
  unidad: 'clave de la unidad de bomberos que atendió (ej. B3, P12). Nunca una frase',
  estacion: 'número o nombre de la estación de bomberos',
  hora_salida: 'hora en que salió la unidad',
  hora_llegada: 'hora en que llegaron al lugar',
  hora_regreso: 'hora en que regresaron a la base',
  hora_control_fuego: 'hora en que se controló el fuego',
  tipo_servicio: 'qué tipo de servicio fue',
  zona: 'SÓLO si el bombero dijo literalmente «rural» o «urbana»',
  turno: 'SÓLO si dijo «turno A/B/C/D»',
  lugar_servicio: 'dónde ocurrió: calle, avenida, colonia, carretera o referencia (ej. «colonia Las Flores», «calle Primera», «por la carretera a Tecate»)',
  propietario: 'nombre del dueño o arrendatario, sólo si lo dijo',
  telefono_propietario: 'teléfono del propietario, sólo si lo dijo',
  descripcion: 'qué pasó y qué hicieron',
  personal_turno: 'bomberos que iban en la unidad',
  voluntarios: 'voluntarios que participaron',
  unidades_apoyo: 'otras unidades de bomberos que apoyaron (ej. pipa 12)',
  instituciones_apoyo: 'otras instituciones que apoyaron (Cruz Roja, Protección Civil, policía…)',
};

// Forma mínima que debe tener el valor (sobre el texto normalizado). Si no la tiene, se descarta.
const FORMAS = {
  unidad: /\b[a-z]{1,6}\s?-?\d{1,3}\b/,
  no_incidente_c5: /\d{3,}/,
};

const SISTEMA = `Llenas el formulario «Hoja de incidente» de Bomberos de Ensenada con lo que dictó un bombero.
Reglas, en orden de importancia:
1. Usa SOLO información dicha explícitamente en el dictado. Nunca inventes, supongas ni completes datos.
2. Si un campo no se mencionó, NO lo incluyas en la lista.
3. "evidencia" es una cita textual copiada del dictado, palabra por palabra, que respalda el valor.
4. Horas en formato HH:MM de 24 horas.
5. En campos de tipo "opcion", "valor" debe ser exactamente una de las opciones dadas. Si lo dicho no corresponde a ninguna, no incluyas el campo.
6. Respeta las negaciones: «no hubo lesionados» significa que NO hubo lesionados.
7. "descripcion": copia las frases del dictado que narran qué pasó y qué hicieron, sin agregar ni cambiar el sentido.
8. Si el bombero se corrige («corrijo», «perdón, eran…», «no, fue…»), usa el último valor que dijo.
9. "seguro" es false si hay ambigüedad, si un nombre propio pudo escribirse mal o si dudas.
Responde sólo con el JSON pedido.`;

function esquemaPara(ids) {
  return {
    type: 'object',
    properties: {
      campos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            campo: { type: 'string', enum: ids },
            valor: { type: 'string' },
            evidencia: { type: 'string' },
            seguro: { type: 'boolean' },
          },
          required: ['campo', 'valor', 'evidencia', 'seguro'],
        },
      },
    },
    required: ['campos'],
  };
}

function mensajeUsuario(texto, catalogo, actuales) {
  const lista = catalogo
    .map((c) => `- ${c.id} (${c.etiqueta}; tipo ${c.tipo}${c.opciones ? `; opciones: ${c.opciones.join(' | ')}` : ''})${PISTAS[c.id] ? `: ${PISTAS[c.id]}` : ''}`)
    .join('\n');
  const yaTiene = Object.entries(actuales)
    .filter(([, v]) => v && v.valor)
    .map(([id, v]) => `- ${id}: ${v.valor}`)
    .join('\n');
  return `CAMPOS DEL FORMULARIO:\n${lista}\n\n` +
    (yaTiene ? `LA HOJA YA TIENE (inclúyelos sólo si el dictado los cambia):\n${yaTiene}\n\n` : '') +
    `DICTADO:\n"""${texto}"""`;
}

// ---------- Normalización por tipo ----------

function normalizarHora(v) {
  const m = /(\d{1,2})\s*[:.h]\s*(\d{2})/.exec(String(v)) || /^(\d{1,2})(\d{2})$/.exec(String(v).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function elegirOpcion(v, opciones) {
  const n = normalizar(v);
  const exacta = opciones.find((o) => normalizar(o) === n);
  if (exacta) return exacta;
  const parecidas = opciones.filter((o) => normalizar(o).includes(n) || n.includes(normalizar(o)));
  return parecidas.length === 1 ? parecidas[0] : null;
}

function opcionDicha(def, valor, evidencia) {
  const cortas = normalizar(valor).split(' ').every((w) => w.length <= 2);
  if (cortas) return normalizar(evidencia).includes(`${normalizar(def.etiqueta || def.id)} ${normalizar(valor)}`);
  return cobertura(valor, evidencia) >= 0.5;
}

function limpiarValor(def, valor) {
  const v = String(valor || '').trim();
  if (!v) return null;
  // Whisper escribe los números largos con coma de miles («118,843»); en un folio no van.
  if (def.id === 'no_incidente_c5') return v.replace(/(\d)[,.](?=\d{3}\b)/g, '$1');
  switch (def.tipo) {
    case 'hora': return normalizarHora(v);
    case 'opcion': return def.opciones ? elegirOpcion(v, def.opciones) : v;
    case 'telefono': {
      const d = v.replace(/\D/g, '');
      return d.length >= 7 ? d : null;
    }
    default: return v;
  }
}

/**
 * Verifica las propuestas del modelo. Devuelve los campos del contrato y cuántos se descartaron.
 * Es una función pura (sin IA) para poder probarla sola.
 */
function verificar(propuestas, { texto, catalogo, actuales }) {
  const porId = new Map(catalogo.map((c) => [c.id, c]));
  const ultimos = new Map(); // si el modelo repite un campo, vale el último (correcciones)
  let descartados = 0;

  for (const p of propuestas || []) {
    const def = porId.get(p.campo);
    if (!def || NO_DICTABLES.has(def.id)) { descartados++; continue; }
    if (!citaEnTexto(p.evidencia, texto)) { descartados++; continue; } // posible invento
    const valor = limpiarValor(def, p.valor);
    if (!valor) { descartados++; continue; }
    if (FORMAS[def.id] && !FORMAS[def.id].test(normalizar(valor))) { descartados++; continue; }
    // Una opción tiene que estar DICHA, no deducida (p. ej. «colonia» no implica «Urbana»).
    if (def.tipo === 'opcion' && !opcionDicha(def, valor, p.evidencia)) { descartados++; continue; }
    // En texto libre, las palabras del valor deben estar en el dictado.
    const cob = ['texto', 'multilinea'].includes(def.tipo) ? cobertura(valor, texto) : 1;
    if (cob < 0.5) { descartados++; continue; }
    const dudoso = !p.seguro || cob < 0.8 || SIEMPRE_REVISAR.has(def.id) || tieneNegacion(p.evidencia) ||
      (def.tipo === 'hora' && !normalizar(texto).includes(valor.replace(/^0/, '')));
    ultimos.set(def.id, { campo: def.id, valor, evidencia: String(p.evidencia).trim(), dudoso });
  }

  const campos = [];
  for (const c of ultimos.values()) {
    const anterior = actuales[c.campo] && actuales[c.campo].valor ? String(actuales[c.campo].valor) : '';
    if (anterior && normalizar(anterior) === normalizar(c.valor)) continue; // no cambió
    campos.push({
      campo: c.campo,
      valor: c.valor,
      estado: anterior ? 'corregido' : c.dudoso ? 'revisar' : 'entendido',
      confianza: c.dudoso || anterior ? 0.6 : 0.9, // regla fija, no es una probabilidad del modelo
      valor_anterior: anterior || null,
      evidencia: c.evidencia,
    });
  }

  // Obligatorios que siguen vacíos.
  for (const def of catalogo) {
    if (!def.obligatorio || ultimos.has(def.id)) continue;
    if (actuales[def.id] && actuales[def.id].valor) continue;
    campos.push({ campo: def.id, valor: '', estado: 'falta', confianza: 0, valor_anterior: null, evidencia: null });
  }
  return { campos, descartados };
}

async function llenarCampos({ texto, catalogo, actuales = {}, modelo }) {
  const dictables = catalogo.filter((c) => !NO_DICTABLES.has(c.id));
  const { datos, modelo: usado } = await chatJson({
    sistema: SISTEMA,
    usuario: mensajeUsuario(texto, dictables, actuales),
    esquema: esquemaPara(dictables.map((c) => c.id)),
    modelo,
  });
  const { campos, descartados } = verificar(datos.campos, { texto, catalogo, actuales });
  return { modelo: usado, campos, descartados };
}

module.exports = { llenarCampos, verificar, normalizarHora, elegirOpcion };

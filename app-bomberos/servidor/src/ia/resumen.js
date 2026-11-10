// IA 2 · Resumen informal para WhatsApp. No se guarda. Contrato: CONTRATOS-IA.md § 3.
// Los datos de civiles (propietario, testigo, teléfonos) se quitan ANTES de llegar al modelo
// y se vuelven a tachar en la salida, por si acaso.
const { chatJson } = require('./ollama');

const PRIVADOS = ['propietario', 'telefono_propietario', 'testigo', 'testigo_nombre', 'propietario_nombre'];
const MAX = 600;

const SISTEMA = `Escribes un aviso corto e informal para el grupo de WhatsApp de Bomberos de Ensenada.
Reglas:
- Español, máximo 5 renglones y ${MAX} caracteres. Empieza con 🚒 y el tipo de servicio.
- Usa sólo los datos que te doy. No inventes horas, lugares, unidades ni consecuencias.
- Si no se sabe si hubo lesionados, no lo menciones.
- Nunca incluyas nombres de civiles ni números de teléfono.
Responde sólo con el JSON pedido.`;

function tachar(texto, nombres) {
  let t = String(texto || '').replace(/\+?\d[\d\s-]{6,}\d/g, '[teléfono]');
  for (const n of nombres) {
    for (const parte of String(n).split(/\s+/).filter((p) => p.length > 3)) {
      t = t.replace(new RegExp(`\\b${parte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '[nombre]');
    }
  }
  return t;
}

function recortar(t) {
  if (t.length <= MAX) return t;
  const corte = t.slice(0, MAX - 1);
  return `${corte.slice(0, Math.max(corte.lastIndexOf(' '), MAX - 40))}…`;
}

async function resumir({ campos = {}, transcripcion = '', modelo }) {
  const nombresPrivados = PRIVADOS.map((k) => campos[k]).filter(Boolean);
  const publicos = Object.fromEntries(
    Object.entries(campos).filter(([k, v]) => !PRIVADOS.includes(k) && v && String(v).trim()),
  );
  const datos = Object.entries(publicos).map(([k, v]) => `- ${k}: ${tachar(v, nombresPrivados)}`).join('\n');
  const extra = transcripcion ? `\n\nDICTADO (sólo como contexto):\n"""${tachar(transcripcion, nombresPrivados)}"""` : '';

  const { datos: r, modelo: usado } = await chatJson({
    sistema: SISTEMA,
    usuario: `DATOS DEL PARTE:\n${datos || '(sin datos)'}${extra}`,
    esquema: { type: 'object', properties: { texto: { type: 'string' } }, required: ['texto'] },
    modelo,
    temperatura: 0.2,
  });
  return {
    texto: recortar(tachar(String(r.texto || '').trim(), nombresPrivados)),
    advertencia: 'Borrador informal. No es documento oficial ni se guarda.',
    modelo: usado,
  };
}

module.exports = { resumir, tachar, recortar };

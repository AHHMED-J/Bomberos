// Cliente mínimo de Ollama (corre en esta Mac). Sólo /api/chat con salida JSON forzada por esquema.
const config = require('./config');

async function chatJson({ sistema, usuario, esquema, modelo = config.ollama.modelo, temperatura = 0 }) {
  let r;
  try {
    r = await fetch(`${config.ollama.url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(config.esperaMs.ollama),
      body: JSON.stringify({
        model: modelo,
        stream: false,
        keep_alive: config.ollama.mantener,
        format: esquema,
        options: { temperature: temperatura, num_ctx: 8192, seed: 7 },
        messages: [
          { role: 'system', content: sistema },
          { role: 'user', content: usuario },
        ],
      }),
    });
  } catch {
    const e = new Error('Ollama no responde');
    e.estado = 503;
    e.codigo = 'ollama_apagado';
    throw e;
  }
  if (!r.ok) {
    const e = new Error(`Ollama respondió ${r.status}`);
    e.estado = 502;
    e.codigo = r.status === 404 ? 'modelo_no_descargado' : 'ollama_error';
    throw e;
  }
  const j = await r.json();
  try {
    return { datos: JSON.parse(j.message.content), modelo };
  } catch {
    const e = new Error('Ollama devolvió algo que no es JSON');
    e.estado = 502;
    e.codigo = 'ollama_json_invalido';
    throw e;
  }
}

module.exports = { chatJson };

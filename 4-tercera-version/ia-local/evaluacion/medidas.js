// Cómo se califica un caso (lo usan evaluar.js y probar-audio.js).
const { normalizar } = require('../../servidor/src/ia/texto');

function coincide(esperado, valor) {
  const v = normalizar(valor);
  if (typeof esperado === 'string') return normalizar(esperado).replace(/\s/g, '') === v.replace(/\s/g, '');
  return (esperado.contiene || []).every((c) => v.includes(normalizar(c)));
}

function evaluarCaso(caso, r) {
  const dados = new Map(r.campos.filter((c) => c.estado !== 'falta').map((c) => [c.campo, c]));
  const out = { aciertos: 0, esperados: 0, mal: [], faltaron: [], inventados: [], negacion_mal: [], estados_mal: [], extras: [] };
  for (const [campo, esp] of Object.entries(caso.esperado)) {
    out.esperados++;
    const d = dados.get(campo);
    if (!d) { out.faltaron.push(campo); continue; }
    if (coincide(esp, d.valor)) out.aciertos++; else out.mal.push(`${campo}: «${d.valor}»`);
    for (const frase of (typeof esp === 'object' && esp.no_contiene_sin_no) || []) {
      const v = normalizar(d.valor);
      const f = normalizar(frase);
      if (v.includes(f) && !v.includes(`no ${f}`)) out.negacion_mal.push(`${campo}: perdió la negación`);
    }
  }
  for (const [campo, est] of Object.entries(caso.estado_minimo || {})) {
    const d = dados.get(campo);
    if (d && (est === 'corregido' ? d.estado !== 'corregido' : d.estado === 'entendido')) out.estados_mal.push(`${campo}: ${d.estado}`);
  }
  for (const campo of caso.no_debe_aparecer || []) if (dados.has(campo)) out.inventados.push(`${campo}: «${dados.get(campo).valor}»`);
  for (const campo of caso.no_debe_cambiar || []) if (dados.has(campo)) out.inventados.push(`${campo} cambió a «${dados.get(campo).valor}»`);
  const conocidos = new Set([...Object.keys(caso.esperado), ...(caso.opcionales || []), ...(caso.no_debe_aparecer || []), ...(caso.no_debe_cambiar || [])]);
  for (const [campo, d] of dados) if (!conocidos.has(campo)) out.extras.push(`${campo}: «${d.valor}» (${d.estado})`);
  return out;
}

/**
 * Tasa de error por palabra (WER) entre lo dictado y lo transcrito.
 * «14.05» y «14:05» cuentan igual: es la misma hora con otra puntuación.
 */
function wer(referencia, hipotesis) {
  const horas = (t) => normalizar(String(t).replace(/\b(\d{1,2})[.:](\d{2})\b/g, '$1h$2'));
  const r = horas(referencia).split(' ');
  const h = horas(hipotesis).split(' ');
  const d = Array.from({ length: r.length + 1 }, (_, i) => [i, ...Array(h.length).fill(0)]);
  for (let j = 1; j <= h.length; j++) d[0][j] = j;
  for (let i = 1; i <= r.length; i++)
    for (let j = 1; j <= h.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
  return d[r.length][h.length] / r.length;
}

module.exports = { coincide, evaluarCaso, wer };

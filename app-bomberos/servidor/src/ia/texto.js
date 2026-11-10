// Utilidades de texto para verificar lo que propone la IA contra lo que de verdad se dictó.

/** minúsculas, sin acentos, sin signos, espacios simples */
function normalizar(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ:\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function palabras(s) {
  return normalizar(s).split(' ').filter((p) => p.length > 0);
}

/** Fracción de las palabras significativas de `a` que aparecen en `b`. */
function cobertura(a, b) {
  const enB = new Set(palabras(b));
  const sig = palabras(a).filter((p) => p.length > 2 || /\d/.test(p));
  if (sig.length === 0) return 0;
  return sig.filter((p) => enB.has(p)).length / sig.length;
}

/** ¿La cita está (casi) tal cual en el dictado? */
function citaEnTexto(cita, texto) {
  const c = normalizar(cita);
  if (c.length < 3) return false;
  return normalizar(texto).includes(c) || cobertura(cita, texto) >= 0.9;
}

const NEGACIONES = /\b(no|sin|ningun|ninguna|ninguno|nadie|nunca|tampoco|ni)\b/;
function tieneNegacion(s) {
  return NEGACIONES.test(normalizar(s));
}

module.exports = { normalizar, palabras, cobertura, citaEnTexto, tieneNegacion };

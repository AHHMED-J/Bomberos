// Misma revisión que la app (lib/hoja/validacion_envio.dart). El servidor NUNCA confía sólo en la pantalla.
const crypto = require('crypto');

// Campos obligatorios de la Hoja de incidente (lib/datos/catalogo_campos.dart).
const OBLIGATORIOS = {
  no_incidente_c5: 'No. de incidente de C-5',
  tipo_servicio: 'Tipo de servicio',
  lugar_servicio: 'Lugar del servicio',
  descripcion: 'Descripción del incidente',
};

const vacio = (v) => !v || !String(v.valor || '').trim();

/** Campo dictado por la IA que el bombero no ha confirmado (los «Falta» no cuentan). */
const sinConfirmar = (v) => v && v.origen === 'dictado' && v.confirmado === false && v.estado_ia !== 'falta';

/** Lista de textos con lo que falta. Vacía = se puede enviar. */
function pendientes(parte) {
  const c = parte.campos || {};
  const r = [];
  if (vacio(c.hora_regreso)) r.push('Hora de regreso · presiona Regreso');
  for (const [id, etiqueta] of Object.entries(OBLIGATORIOS)) if (vacio(c[id])) r.push(etiqueta);
  if (!(parte.fotos >= 1)) r.push('Al menos 1 foto');
  for (const [id, v] of Object.entries(c)) if (sinConfirmar(v)) r.push(`Sin confirmar: ${id}`);
  const f = parte.firmas || {};
  if (!f.elaboro) r.push('Firma de quien elabora, con credencial');
  if (f.requiere_peritaje === null || f.requiere_peritaje === undefined) r.push('¿Requiere peritaje?');
  return r;
}

/**
 * Contenido canónico que se firma: debe coincidir byte a byte con Parte.contenidoParaFirmar() de la app
 * (mismas llaves, mismo orden, campos ordenados por id).
 */
function contenidoParaFirmar(parte) {
  const c = parte.campos || {};
  const f = parte.firmas || {};
  const campos = {};
  for (const id of Object.keys(c).sort()) campos[id] = c[id].valor;
  return {
    folio: parte.folio,
    campos,
    fotos: parte.fotos || 0,
    propietario: f.propietario_nombre || '',
    testigo: f.testigo_nombre || '',
    propietario_trazo: f.propietario_trazo ?? null,
    testigo_trazo: f.testigo_trazo ?? null,
    requiere_peritaje: f.requiere_peritaje ?? null,
  };
}

const sha256 = (texto) => crypto.createHash('sha256').update(texto).digest('hex');
const hashContenido = (contenido) => sha256(JSON.stringify(contenido));

module.exports = { pendientes, contenidoParaFirmar, hashContenido, sha256 };

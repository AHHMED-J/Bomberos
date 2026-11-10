// Datos EN MEMORIA (se pierden al reiniciar). DATOS DE EJEMPLO: no son partes reales.
// TODO(BD): pasar a MySQL con el esquema de 1-primera-version/app/db/schema.sql + cambios de decisiones.md.
const DIVISION = 'División Estructural';

const usuarios = [
  { id: 'u-380207', nombre: 'Acevedo Carrillo, Verónica', matricula: '380207', rango: 'Bombero', rol: 'editor', division: DIVISION, estacion: 'Central' },
  { id: 'u-376285', nombre: 'Jalife Burgueño, Ahhmed', matricula: '376285', rango: 'Bombero', rol: 'editor', division: DIVISION, estacion: 'Central' },
  { id: 'u-300112', nombre: 'Cap. J. Navarro', matricula: '300112', rango: 'Capitán', rol: 'capitan', division: DIVISION, estacion: 'Central' },
];

// Códigos de alta de un solo uso (los da la Dirección). Ejemplo: 4F2K9 → Verónica.
const codigosAlta = new Map([['4F2K9', { usuarioId: 'u-380207', usado: false }]]);

// usuarioId -> llave pública PEM (o 'SIMULADA').
const llaves = new Map();

const m = (valor) => ({ valor, origen: 'manual', estado_ia: null, confianza: null, valor_anterior: null, confirmado: true });
const a = (valor) => ({ ...m(valor), origen: 'auto' });
const completo = (o) => ({
  no_incidente_c5: m(o.c5 || 'ENS-26-118843'),
  fecha: a(o.fecha || '24/10/2026'),
  unidad: a('Pipa 04'),
  turno: a('A'),
  estacion: a('Central'),
  hora_salida: m(o.salida || '21:30'),
  hora_llegada: m(o.llegada || '21:41'),
  hora_regreso: m(o.regreso || '23:05'),
  tipo_servicio: m(o.tipo),
  zona: m('Urbana'),
  lugar_servicio: m(o.lugar),
  descripcion: m(o.desc),
  personal_turno: m('Jalife Burgueño, Ahhmed; Acevedo Carrillo, Verónica'),
});
const firmasEjemplo = { elaboro: 'SIMULADA:ejemplo', elaboro_simulada: true, propietario_nombre: '', propietario_trazo: null, testigo_nombre: '', testigo_trazo: null, requiere_peritaje: false };

function parte(o) {
  return {
    id: o.id, folio: o.folio, estado: o.estado, elaboro_id: o.elaboro.id, elaboro_nombre: o.elaboro.nombre,
    division: DIVISION, creado_en: o.creado, campos: o.campos, fotos: o.fotos ?? 1, croquis_dibujado: false,
    firmas: firmasEjemplo, modo: o.modo || 'dictado', seg_activo: o.seg ?? 120, ultima_actividad: null,
    nota: o.nota || null, enviado_en: o.enviado || null, sello: o.sello || null,
  };
}

const [vero, ahhmed, capitan] = usuarios;
const partes = new Map(
  [
    parte({ id: 'srv-0150', folio: 'PE-2026-0150', estado: 'enviado', elaboro: ahhmed, creado: '2026-11-08T14:20:00', enviado: '2026-11-08T16:02:00', fotos: 2, seg: 112,
      campos: completo({ tipo: 'Incendio de pastizal', lugar: 'Calle López Mateos, El Sauzal', desc: '(Ejemplo) Se sofocó el fuego con pitón de niebla. No hubo lesionados.', c5: 'ENS-26-118842', fecha: '08/11/2026', salida: '14:05', llegada: '14:20', regreso: '15:40' }) }),
    parte({ id: 'srv-0143', folio: 'PE-2026-0143', estado: 'enviado', elaboro: vero, creado: '2026-09-06T21:30:00', enviado: '2026-09-06T23:05:00', modo: 'teclado', seg: 240,
      campos: completo({ tipo: 'Fuga de gas', lugar: 'Calle Novena 88, Col. Bustamante', desc: '(Ejemplo) Fuga en conexión de tanque estacionario.', fecha: '06/09/2026' }) }),
    parte({ id: 'srv-0147', folio: 'PE-2026-0147', estado: 'validado', elaboro: ahhmed, creado: '2026-10-20T09:00:00', fotos: 3,
      sello: '9f2c0d8e5b1a4c7f9e2d3b6a8c1f0e4d7b5a2c9e8f1d3b6a4c7e0f2d5b8a1c3e',
      campos: completo({ tipo: 'Incendio estructural', lugar: 'Av. Reforma 1520, Col. Carlos Pacheco', desc: '(Ejemplo) Incendio en cocina.' }) }),
    parte({ id: 'srv-0142', folio: 'PE-2026-0142', estado: 'devuelto', elaboro: ahhmed, creado: '2026-11-07T14:05:00',
      nota: { texto: 'Falta la hora de control del fuego.', seccion: 'Datos del servicio', revisor: capitan.nombre, fecha: '2026-11-08T08:10:00' },
      campos: completo({ tipo: 'Incendio de pastizal', lugar: 'Ejido Chapultepec', desc: '(Ejemplo) Quema de pastizal controlada.', salida: '14:05', llegada: '14:16', regreso: '15:40' }) }),
  ].map((p) => [p.folio, p]),
);

let siguienteFolio = 153;
const nuevoFolio = () => `PE-2026-${String(siguienteFolio++).padStart(4, '0')}`;

// Sesiones: token -> usuarioId. TODO: tokens firmados con vencimiento.
const sesiones = new Map();

module.exports = { usuarios, codigosAlta, llaves, partes, nuevoFolio, sesiones, DIVISION };

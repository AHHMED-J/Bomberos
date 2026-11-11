// Pruebas de las reglas fijas que revisan lo que propone la IA. No usan modelos ni red.
const test = require('node:test');
const assert = require('node:assert/strict');
const { verificar, normalizarHora } = require('../src/ia/llenado');
const { tachar, recortar } = require('../src/ia/resumen');

const catalogo = [
  { id: 'no_incidente_c5', tipo: 'texto', obligatorio: true },
  { id: 'fecha', tipo: 'fecha' },
  { id: 'tipo_servicio', tipo: 'opcion', obligatorio: true, opciones: ['Incendio estructural', 'Incendio de pastizal', 'Fuga de gas'] },
  { id: 'hora_llegada', tipo: 'hora' },
  { id: 'lugar_servicio', tipo: 'texto', obligatorio: true },
  { id: 'descripcion', tipo: 'multilinea', obligatorio: true },
  { id: 'propietario', tipo: 'texto' },
];
const texto = 'Incendio de pastizal en El Sauzal. Llegamos a las 14:20. No hubo lesionados. El propietario es Manuel Torres.';
const p = (campo, valor, evidencia, seguro = true) => ({ campo, valor, evidencia, seguro });
const de = (r, id) => r.campos.find((c) => c.campo === id);

test('descarta lo que no está en el dictado (posible invento)', () => {
  const r = verificar([p('lugar_servicio', 'Calle Reforma 1520', 'en la calle Reforma 1520')], { texto, catalogo, actuales: {} });
  assert.equal(de(r, 'lugar_servicio').estado, 'falta');
  assert.equal(r.descartados, 1);
});

test('una opción dicha con otras palabras se ajusta al catálogo', () => {
  const r = verificar([p('tipo_servicio', 'pastizal', 'Incendio de pastizal')], { texto, catalogo, actuales: {} });
  assert.equal(de(r, 'tipo_servicio').valor, 'Incendio de pastizal');
  assert.equal(de(r, 'tipo_servicio').estado, 'entendido');
});

test('una opción que no existe se descarta', () => {
  const r = verificar([p('tipo_servicio', 'Rescate acuático', 'Incendio de pastizal')], { texto, catalogo, actuales: {} });
  assert.equal(de(r, 'tipo_servicio').estado, 'falta');
});

test('las negaciones siempre van a Revisar', () => {
  const r = verificar([p('descripcion', 'No hubo lesionados.', 'No hubo lesionados')], { texto, catalogo, actuales: {} });
  assert.equal(de(r, 'descripcion').estado, 'revisar');
});

test('nombres de personas siempre van a Revisar aunque el modelo esté seguro', () => {
  const r = verificar([p('propietario', 'Manuel Torres', 'El propietario es Manuel Torres')], { texto, catalogo, actuales: {} });
  assert.equal(de(r, 'propietario').estado, 'revisar');
});

test('un valor distinto al que ya había es una corrección con su valor anterior', () => {
  const t2 = 'Corrijo, llegamos a las 14:35.';
  const r = verificar([p('hora_llegada', '14:35', 'llegamos a las 14:35')], { texto: t2, catalogo, actuales: { hora_llegada: { valor: '14:20' } } });
  assert.equal(de(r, 'hora_llegada').estado, 'corregido');
  assert.equal(de(r, 'hora_llegada').valor_anterior, '14:20');
});

test('el mismo valor que ya había no se repite', () => {
  const r = verificar([p('hora_llegada', '14:20', 'Llegamos a las 14:20')], { texto, catalogo, actuales: { hora_llegada: { valor: '14:20' } } });
  assert.equal(de(r, 'hora_llegada'), undefined);
});

test('si el modelo repite un campo vale el último (corrección dentro del mismo audio)', () => {
  const t = 'Llegamos a las 14:20, perdón, llegamos a las 14:30.';
  const r = verificar([p('hora_llegada', '14:20', 'Llegamos a las 14:20'), p('hora_llegada', '14:30', 'llegamos a las 14:30')], { texto: t, catalogo, actuales: {} });
  assert.equal(de(r, 'hora_llegada').valor, '14:30');
});

test('la fecha no la llena la IA y los campos desconocidos se descartan', () => {
  const r = verificar([p('fecha', '10/11/2026', 'Incendio'), p('inventado', 'x', 'Incendio')], { texto, catalogo, actuales: {} });
  assert.equal(de(r, 'fecha'), undefined);
  assert.equal(r.descartados, 2);
});

test('obligatorios vacíos salen como Falta; los que ya tenían valor no', () => {
  const r = verificar([], { texto, catalogo, actuales: { no_incidente_c5: { valor: 'ENS-1' } } });
  assert.deepEqual(r.campos.filter((c) => c.estado === 'falta').map((c) => c.campo).sort(), ['descripcion', 'lugar_servicio', 'tipo_servicio']);
});

test('horas', () => {
  assert.equal(normalizarHora('14:35'), '14:35');
  assert.equal(normalizarHora('9.05'), '09:05');
  assert.equal(normalizarHora('1435'), '14:35');
  assert.equal(normalizarHora('25:00'), null);
});

test('el resumen tacha teléfonos y nombres de civiles y no pasa de 600 caracteres', () => {
  const t = tachar('Llamar a Manuel Torres al 646 123 4567', ['Manuel Torres']);
  assert.ok(!/Manuel|Torres|4567/.test(t), t);
  assert.ok(recortar('a '.repeat(500)).length <= 600);
});

test('una opción deducida (no dicha) se descarta: «colonia» no implica «Urbana»', () => {
  const cat = [{ id: 'zona', etiqueta: 'Zona', tipo: 'opcion', opciones: ['Rural', 'Urbana'] }];
  const t = 'Fuga de gas en la colonia Chapultepec.';
  assert.equal(verificar([p('zona', 'Urbana', 'colonia Chapultepec')], { texto: t, catalogo: cat, actuales: {} }).campos.length, 0);
  const t2 = 'Fue en zona rural.';
  assert.equal(verificar([p('zona', 'Rural', 'zona rural')], { texto: t2, catalogo: cat, actuales: {} }).campos[0].valor, 'Rural');
});

test('opciones de una letra sólo si se dijo «turno X»', () => {
  const cat = [{ id: 'turno', etiqueta: 'Turno', tipo: 'opcion', opciones: ['A', 'B'] }];
  assert.equal(verificar([p('turno', 'A', 'a las 9')], { texto: 'llegamos a las 9', catalogo: cat, actuales: {} }).campos.length, 0);
  assert.equal(verificar([p('turno', 'B', 'turno B')], { texto: 'del turno B', catalogo: cat, actuales: {} }).campos[0].valor, 'B');
});

test('la unidad tiene que parecer una clave, no una frase', () => {
  const cat = [{ id: 'unidad', etiqueta: 'Unidad', tipo: 'texto' }];
  const t = 'Salimos a un servicio en Valle Dorado con la unidad R1.';
  assert.equal(verificar([p('unidad', 'Salimos a un servicio en Valle Dorado', 'Salimos a un servicio en Valle Dorado')], { texto: t, catalogo: cat, actuales: {} }).campos.length, 0);
  assert.equal(verificar([p('unidad', 'R1', 'la unidad R1')], { texto: t, catalogo: cat, actuales: {} }).campos[0].valor, 'R1');
});

test('Whisper: un segmento cortado a mitad de palabra se pega sin espacio', () => {
  const { unirSegmentos } = require('../src/ia/whisper');
  const s = unirSegmentos([
    { text: ' Colonia Juá', start: 0, end: 1 },
    { text: 'rez.', start: 1, end: 1.4 },
    { text: ' No hubo lesionados.', start: 1.4, end: 3 },
  ]);
  assert.deepEqual(s.map((x) => x.texto), ['Colonia Juárez.', 'No hubo lesionados.']);
  assert.equal(s[0].fin, 1.4);
});

test('C-5: se quita la coma de miles que pone Whisper', () => {
  const { verificar } = require('../src/ia/llenado');
  const texto = 'Incidente de C-5, NUC, 26, 118,843. Rescate en la colonia Ruiz.';
  const { campos } = verificar(
    [{ campo: 'no_incidente_c5', valor: 'NUC, 26, 118,843', evidencia: 'Incidente de C-5, NUC, 26, 118,843.', seguro: true }],
    { texto, catalogo: [{ id: 'no_incidente_c5', etiqueta: 'No. de incidente C-5', tipo: 'texto' }], actuales: {} },
  );
  assert.equal(campos[0].valor, 'NUC, 26, 118843');
});

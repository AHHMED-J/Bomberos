// Consultas del parte: cargarlo, saber qué le falta y buscarlo.
// Escritas a mano, sin ORM, para que se lean igual que en la Tabla 3.

'use strict';

const { filas, fila, ejecutar } = require('./db');

const PASOS = [
  { clave: 'datos',    numero: 1, texto: 'Datos del servicio' },
  { clave: 'personas', numero: 2, texto: 'Personas y apoyos' },
  { clave: 'croquis',  numero: 3, texto: 'Descripción y croquis' },
  { clave: 'firma',    numero: 4, texto: 'Cierre y firma' },
];

// Campos obligatorios de cada paso, con el rótulo que se enseña.
// Salen del formato en papel (Anexo E).
const OBLIGATORIOS = {
  datos: [
    ['no_incidente_c5', 'No. de incidente del C-5'],
    ['fecha', 'Fecha'],
    ['hora_salida', 'Hora de salida'],
    ['hora_regreso', 'Hora de regreso'],
    ['unidad_id', 'Unidad'],
    ['turno', 'Turno'],
    ['estacion_id', 'Estación'],
    ['tipo_servicio_id', 'Tipo de servicio'],
    ['zona', 'Zona'],
    ['despacho', 'Despacho'],
    ['lugar_servicio', 'Lugar del servicio'],
  ],
  croquis: [['descripcion', 'Descripción de los hechos']],
  firma: [['requiere_peritaje', 'Requiere peritaje']],
};

function vacio(valor) {
  return valor === null || valor === undefined || String(valor).trim() === '';
}

async function siguienteFolio() {
  const anio = new Date().getFullYear();
  const ultimo = await fila(
    `SELECT MAX(CAST(SUBSTRING_INDEX(folio, '-', -1) AS UNSIGNED)) AS n
       FROM parte WHERE folio LIKE ?`,
    [`PE-${anio}-%`],
  );
  const n = (ultimo && ultimo.n ? Number(ultimo.n) : 0) + 1;
  return `PE-${anio}-${String(n).padStart(4, '0')}`;
}

// El parte existe desde que se abre "Nuevo parte", antes del primer campo:
// es lo que sostiene el flujo de la Figura 3.
async function crearBorrador(usuario) {
  const ahora = new Date();
  const resultado = await ejecutar(
    `INSERT INTO parte (folio, fecha, hora_salida, estacion_id, turno, elaboro_id, estado)
     VALUES (?, ?, ?, ?, ?, ?, 'borrador')`,
    [
      await siguienteFolio(),
      ahora.toISOString().slice(0, 10),
      ahora.toTimeString().slice(0, 8),
      usuario.estacion_id,
      usuario.turno,
      usuario.id,
    ],
  );

  const nuevoId = resultado.insertId;

  await ejecutar('INSERT IGNORE INTO parte_personal (parte_id, usuario_id) VALUES (?, ?)', [
    nuevoId, usuario.id,
  ]);
  return nuevoId;
}

// El parte con todas sus tablas hijas.
async function cargar(id) {
  const parte = await fila(
    `SELECT p.*,
            ts.nombre AS tipo_servicio, ts.division_id,
            d.nombre  AS division,
            un.clave  AS unidad,
            es.nombre AS estacion,
            us.nombre AS elaboro, us.no_empleado AS elaboro_no_empleado,
            fn.ordenamiento AS fundamento_ordenamiento, fn.articulo AS fundamento_articulo
       FROM parte p
       LEFT JOIN tipo_servicio ts ON ts.id = p.tipo_servicio_id
       LEFT JOIN division  d  ON d.id  = ts.division_id
       LEFT JOIN unidad    un ON un.id = p.unidad_id
       LEFT JOIN estacion  es ON es.id = p.estacion_id
       LEFT JOIN usuario   us ON us.id = p.elaboro_id
       LEFT JOIN fundamento_normativo fn ON fn.id = p.fundamento_id
      WHERE p.id = ?`,
    [id],
  );
  if (!parte) return null;

  // Una consulta por cada tabla hija, en fila. Cada resultado se le cuelga
  // al parte, para que la vista lo encuentre como parte.personal, parte.firmas...
  parte.personal = await filas(
    `SELECT u.id, u.nombre, u.no_empleado, u.cargo
       FROM parte_personal pp JOIN usuario u ON u.id = pp.usuario_id
      WHERE pp.parte_id = ? ORDER BY u.nombre`,
    [id],
  );
  parte.personas = await filas(
    'SELECT * FROM persona_involucrada WHERE parte_id = ? ORDER BY id', [id],
  );
  parte.apoyos = await filas('SELECT * FROM apoyo WHERE parte_id = ? ORDER BY id', [id]);
  parte.croquis = await fila('SELECT * FROM croquis WHERE parte_id = ?', [id]);
  parte.evidencias = await filas('SELECT * FROM evidencia WHERE parte_id = ? ORDER BY id', [id]);
  parte.firmas = await filas(
    `SELECT f.*, u.nombre AS usuario
       FROM firma f LEFT JOIN usuario u ON u.id = f.usuario_id
      WHERE f.parte_id = ? ORDER BY f.firmado_en`,
    [id],
  );
  parte.revisiones = await filas(
    `SELECT r.*, u.nombre AS revisor
       FROM revision r JOIN usuario u ON u.id = r.revisor_id
      WHERE r.parte_id = ? ORDER BY r.fecha DESC`,
    [id],
  );
  parte.archivo = await fila('SELECT * FROM archivo WHERE parte_id = ?', [id]);

  // Atajos: las vistas piden mucho al propietario y al testigo, y buscarlos
  // cada vez dentro de parte.personas ensuciaria el HTML.
  parte.propietario = parte.personas.find(
    (p) => p.rol === 'propietario' || p.rol === 'arrendatario') || null;
  parte.testigo = parte.personas.find((p) => p.rol === 'testigo') || null;
  parte.voluntarios = parte.personas.filter((p) => p.rol === 'voluntario');
  parte.devolucion = parte.revisiones.find((r) => r.decision === 'devuelto') || null;

  return parte;
}

// El paso 2 no tiene columnas obligatorias: lo que exige es que haya
// alguien del personal de turno, como en el papel.
function faltantesDe(parte, paso) {
  if (paso === 'personas') {
    return parte.personal.length ? [] : [['personal', 'Personal de turno']];
  }
  const campos = OBLIGATORIOS[paso] || [];
  const faltan = [];
  for (const campo of campos) {
    const columna = campo[0];          // el nombre en la base de datos
    if (vacio(parte[columna])) faltan.push(campo);
  }
  return faltan;
}

function primerPasoIncompleto(parte) {
  for (const paso of PASOS) {
    if (paso.clave === 'firma') continue;
    if (faltantesDe(parte, paso.clave).length) return paso.clave;
  }
  return null;
}

// La revisión automática de la Figura 7. Es más ancha que la de la captura:
// incluye lo que en el papel se llena pero el sistema no puede exigir.
function revisionAutomatica(parte) {
  const faltas = [];
  for (const paso of ['datos', 'croquis', 'firma']) {
    for (const campo of faltantesDe(parte, paso)) {
      faltas.push(campo[1]);           // campo = [columna, rotulo]
    }
  }
  if (!parte.personal.length) faltas.push('Personal de turno');
  if (!parte.propietario) faltas.push('Propietario o arrendatario');
  else if (vacio(parte.propietario.telefono)) faltas.push('Teléfono de contacto');
  if (!parte.firmas.some((f) => f.tipo === 'propietario')) faltas.push('Firma del propietario');
  if (!parte.firmas.some((f) => f.tipo === 'testigo')) faltas.push('Firma del testigo');
  if (!parte.croquis) faltas.push('Croquis');
  if (vacio(parte.nuc)) faltas.push('NUC de fiscalía');
  return faltas;
}

async function catalogos() {
  const unidades = await filas('SELECT id, clave FROM unidad ORDER BY clave');
  const tipos = await filas(
    `SELECT ts.id, ts.nombre, d.nombre AS division
       FROM tipo_servicio ts JOIN division d ON d.id = ts.division_id
      ORDER BY d.nombre, ts.nombre`,
  );
  const estaciones = await filas('SELECT id, numero, nombre FROM estacion ORDER BY numero');
  const personal = await filas(
    "SELECT id, nombre, no_empleado FROM usuario WHERE rol <> 'direccion' ORDER BY nombre",
  );

  return { unidades: unidades, tipos: tipos, estaciones: estaciones, personal: personal };
}

/* --- La búsqueda de /consulta y /direccion/partes (Tabla 3) -------------- */

// Un folio, un No. de C-5 o un NUC se buscan exactos con sus índices
// (idx_parte_c5, idx_parte_nuc); lo demás va al FULLTEXT ft_parte_texto.
// Ése es el caso de la necesidad oculta O3: cuando lo pide el 911 o la
// fiscalía se busca por número, no por texto.
function pareceIdentificador(texto) {
  return /^(pe-\d{4}-\d+|c-?5\s*\d+|nuc\b.*|\d{4,})$/i.test(texto.trim());
}

// alcance: { elaboro_id } para el bombero, { division_id } para el revisor,
// {} para la Dirección.
async function buscar(filtros = {}, alcance = {}) {
  // Se arman dos listas en paralelo: los pedazos del WHERE y los valores que
  // van en lugar de cada ?. Al final se pegan con AND.
  const donde = [];
  const valores = [];

  if (alcance.elaboro_id) {
    donde.push('p.elaboro_id = ?');
    valores.push(alcance.elaboro_id);
  }
  if (alcance.division_id) {
    donde.push('ts.division_id = ?');
    valores.push(alcance.division_id);
  }
  if (filtros.desde) {
    donde.push('p.fecha >= ?');
    valores.push(filtros.desde);
  }
  if (filtros.hasta) {
    donde.push('p.fecha <= ?');
    valores.push(filtros.hasta);
  }
  if (filtros.tipo_servicio_id) {
    donde.push('p.tipo_servicio_id = ?');
    valores.push(Number(filtros.tipo_servicio_id));
  }
  if (filtros.unidad_id) {
    donde.push('p.unidad_id = ?');
    valores.push(Number(filtros.unidad_id));
  }
  if (filtros.estado) {
    donde.push('p.estado = ?');
    valores.push(filtros.estado);
  }

  const texto = String(filtros.texto || '').trim();
  if (texto && pareceIdentificador(texto)) {
    donde.push('(p.folio = ? OR p.no_incidente_c5 = ? OR p.nuc = ?)');
    valores.push(texto);
    valores.push(texto);
    valores.push(texto);
  } else if (texto) {
    donde.push('MATCH (p.lugar_servicio, p.descripcion) AGAINST (? IN NATURAL LANGUAGE MODE)');
    valores.push(texto);
  }

  return filas(
    `SELECT p.id, p.folio, p.estado, p.fecha, p.hora_salida, p.lugar_servicio,
            p.no_incidente_c5, p.nuc,
            ts.nombre AS tipo_servicio, d.nombre AS division,
            un.clave AS unidad, es.nombre AS estacion, us.nombre AS elaboro,
            a.resguardo_hasta
       FROM parte p
       LEFT JOIN tipo_servicio ts ON ts.id = p.tipo_servicio_id
       LEFT JOIN division  d  ON d.id  = ts.division_id
       LEFT JOIN unidad    un ON un.id = p.unidad_id
       LEFT JOIN estacion  es ON es.id = p.estacion_id
       LEFT JOIN usuario   us ON us.id = p.elaboro_id
       LEFT JOIN archivo   a  ON a.parte_id = p.id
       ${donde.length ? `WHERE ${donde.join(' AND ')}` : ''}
      ORDER BY p.fecha DESC, p.hora_salida DESC, p.id DESC
      LIMIT 100`,
    valores,
  );
}

async function catalogosDeFiltro() {
  const todos = await catalogos();
  return { tipos: todos.tipos, unidades: todos.unidades };
}

module.exports = {
  PASOS, vacio, crearBorrador, cargar, faltantesDe, primerPasoIncompleto,
  revisionAutomatica, catalogos, buscar, catalogosDeFiltro,
};

// Catálogo de casillas de la Hoja de incidente (pantalla P2 de Figma).
// Es la misma lista que recibe el modelo de llenado (ver servidor/CONTRATOS-IA.md).
// Ojo: falta compararla campo por campo con el formato en papel (pendiente de decisiones.md).

enum TipoCampo { texto, multilinea, hora, fecha, opcion, telefono }

enum SeccionHoja {
  datosServicio('Datos del servicio'),
  lugarPropietario('Lugar y propietario'),
  descripcion('Descripción del incidente'),
  personal('Personal de turno'),
  apoyo('Apoyo'),
  croquis('Croquis'),
  firmas('Firmas');

  const SeccionHoja(this.titulo);
  final String titulo;
}

class CampoDef {
  const CampoDef({
    required this.id,
    required this.etiqueta,
    required this.seccion,
    this.tipo = TipoCampo.texto,
    this.obligatorio = false,
    this.auto = false,
    this.sugerencia,
    this.opciones = const [],
    this.soloAutor = false,
  });

  final String id;
  final String etiqueta;
  final SeccionHoja seccion;
  final TipoCampo tipo;
  final bool obligatorio;

  /// Se llena solo (fecha, unidad, turno, estación).
  final bool auto;

  /// Lo que se muestra mientras se graba: «Di: …».
  final String? sugerencia;
  final List<String> opciones;

  /// Llegada y Regreso los presiona sólo quien elabora el parte.
  final bool soloAutor;

  Map<String, dynamic> aJson() => {
    'id': id,
    'etiqueta': etiqueta,
    'seccion': seccion.name,
    'tipo': tipo.name,
    'obligatorio': obligatorio,
    if (opciones.isNotEmpty) 'opciones': opciones,
  };
}

/// Tipos de servicio de ejemplo. TODO: catálogo real de la Dirección.
const tiposServicioEjemplo = [
  'Incendio estructural',
  'Incendio de pastizal',
  'Incendio vehicular',
  'Fuga de gas',
  'Rescate',
  'Otro',
];

const catalogoCampos = <CampoDef>[
  CampoDef(
    id: 'no_incidente_c5',
    etiqueta: 'No. de incidente de C-5',
    seccion: SeccionHoja.datosServicio,
    obligatorio: true,
    sugerencia: 'Di: «incidente C-5 ENS-26-118843»',
  ),
  CampoDef(id: 'fecha', etiqueta: 'Fecha', seccion: SeccionHoja.datosServicio, tipo: TipoCampo.fecha, auto: true),
  CampoDef(
    id: 'unidad',
    etiqueta: 'Unidad',
    seccion: SeccionHoja.datosServicio,
    auto: true,
    sugerencia: 'Di: «unidad E7, estación 3»',
  ),
  CampoDef(id: 'hora_salida', etiqueta: 'Salida', seccion: SeccionHoja.datosServicio, tipo: TipoCampo.hora),
  CampoDef(
    id: 'hora_llegada',
    etiqueta: 'Hora de llegada',
    seccion: SeccionHoja.datosServicio,
    tipo: TipoCampo.hora,
    soloAutor: true,
    sugerencia: 'Di: «llegamos a las 14:20»',
  ),
  CampoDef(
    id: 'hora_regreso',
    etiqueta: 'Regreso',
    seccion: SeccionHoja.datosServicio,
    tipo: TipoCampo.hora,
    soloAutor: true,
  ),
  CampoDef(
    id: 'turno',
    etiqueta: 'Turno',
    seccion: SeccionHoja.datosServicio,
    tipo: TipoCampo.opcion,
    auto: true,
    opciones: ['A', 'B', 'C', 'D'],
  ),
  CampoDef(id: 'estacion', etiqueta: 'Estación', seccion: SeccionHoja.datosServicio, auto: true),
  CampoDef(
    id: 'tipo_servicio',
    etiqueta: 'Tipo de servicio',
    seccion: SeccionHoja.datosServicio,
    tipo: TipoCampo.opcion,
    obligatorio: true,
    opciones: tiposServicioEjemplo,
    sugerencia: 'Di: «incendio de pastizal»',
  ),
  CampoDef(
    id: 'zona',
    etiqueta: 'Zona',
    seccion: SeccionHoja.datosServicio,
    tipo: TipoCampo.opcion,
    opciones: ['Rural', 'Urbana'],
  ),
  CampoDef(
    id: 'hora_control_fuego',
    etiqueta: 'Hora de control del fuego',
    seccion: SeccionHoja.datosServicio,
    tipo: TipoCampo.hora,
    sugerencia: 'Di: «el fuego se controló a las 14:50»',
  ),
  CampoDef(
    id: 'lugar_servicio',
    etiqueta: 'Lugar del servicio',
    seccion: SeccionHoja.lugarPropietario,
    obligatorio: true,
    sugerencia: 'Di: la calle y la colonia',
  ),
  CampoDef(
    id: 'propietario',
    etiqueta: 'Propietario / arrendatario',
    seccion: SeccionHoja.lugarPropietario,
    sugerencia: 'Di: nombre y teléfono, si hay',
  ),
  CampoDef(
    id: 'telefono_propietario',
    etiqueta: 'Teléfono de contacto',
    seccion: SeccionHoja.lugarPropietario,
    tipo: TipoCampo.telefono,
  ),
  CampoDef(
    id: 'descripcion',
    etiqueta: 'Descripción del incidente',
    seccion: SeccionHoja.descripcion,
    tipo: TipoCampo.multilinea,
    obligatorio: true,
    sugerencia: 'Di: qué pasó y qué hicieron',
  ),
  CampoDef(
    id: 'personal_turno',
    etiqueta: 'Personal de turno',
    seccion: SeccionHoja.personal,
    sugerencia: 'Di: quiénes iban en la unidad',
  ),
  CampoDef(id: 'voluntarios', etiqueta: 'Voluntarios', seccion: SeccionHoja.personal),
  CampoDef(
    id: 'unidades_apoyo',
    etiqueta: 'Unidades de bomberos en apoyo',
    seccion: SeccionHoja.apoyo,
    sugerencia: 'Di: «apoyó la pipa 07»',
  ),
  CampoDef(id: 'instituciones_apoyo', etiqueta: 'Instituciones de apoyo', seccion: SeccionHoja.apoyo),
];

final Map<String, CampoDef> campoPorId = {for (final c in catalogoCampos) c.id: c};

CampoDef campoDef(String id) => campoPorId[id] ?? (throw ArgumentError('Campo desconocido: $id'));

/// Campos que se pueden dictar (los que no son automáticos).
Iterable<CampoDef> get camposDictables => catalogoCampos.where((c) => !c.auto || c.sugerencia != null);

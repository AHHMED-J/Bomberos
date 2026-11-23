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
    this.obligatorio = true,
    this.auto = false,
    this.sugerencia,
    this.opciones = const [],
    this.soloAutor = false,
    this.agregar,
    this.digitos,
  });

  final String id;
  final String etiqueta;
  final SeccionHoja seccion;
  final TipoCampo tipo;

  /// Todos los campos de la hoja son obligatorios.
  final bool obligatorio;

  /// Se llena solo (fecha, unidad, turno, estación).
  final bool auto;

  /// Lo que se muestra mientras se graba: «Di: …».
  final String? sugerencia;
  final List<String> opciones;

  /// Llegada y Regreso los escribe sólo quien elabora el parte.
  final bool soloAutor;

  /// Campo de varios elementos (personas o unidades): se llena uno por uno con este botón («Agregar…»).
  /// El valor guardado es la lista unida con «; ».
  final String? agregar;

  bool get esLista => agregar != null;

  /// Sólo números, exactamente esta cantidad (el No. de incidente de C-5 son 6).
  final int? digitos;

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
    digitos: 6,
    sugerencia: 'Di: «incidente 118843»',
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
    etiqueta: 'Llegada',
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
  CampoDef(
    id: 'estacion',
    etiqueta: 'Estación',
    seccion: SeccionHoja.datosServicio,
    tipo: TipoCampo.opcion,
    opciones: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
  ),
  CampoDef(
    id: 'tipo_servicio',
    etiqueta: 'Tipo de servicio',
    seccion: SeccionHoja.datosServicio,
    tipo: TipoCampo.opcion,
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
    id: 'lugar_servicio',
    etiqueta: 'Lugar del servicio',
    seccion: SeccionHoja.lugarPropietario,
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
    sugerencia: 'Di: qué pasó y qué hicieron',
  ),
  CampoDef(
    id: 'personal_turno',
    etiqueta: 'Personal de turno',
    seccion: SeccionHoja.personal,
    sugerencia: 'Di: quiénes iban en la unidad',
    agregar: 'Agregar persona',
  ),
  CampoDef(id: 'voluntarios', etiqueta: 'Voluntarios', seccion: SeccionHoja.personal, agregar: 'Agregar voluntario'),
  CampoDef(
    id: 'unidades_apoyo',
    etiqueta: 'Unidades de bomberos en apoyo',
    seccion: SeccionHoja.apoyo,
    sugerencia: 'Di: «apoyó la pipa 07»',
    agregar: 'Agregar unidad',
  ),
  CampoDef(
    id: 'instituciones_apoyo',
    etiqueta: 'Instituciones de apoyo',
    seccion: SeccionHoja.apoyo,
    agregar: 'Agregar institución',
  ),
];

final Map<String, CampoDef> campoPorId = {for (final c in catalogoCampos) c.id: c};

CampoDef campoDef(String id) => campoPorId[id] ?? (throw ArgumentError('Campo desconocido: $id'));

/// Campos que se pueden dictar (los que no son automáticos).
Iterable<CampoDef> get camposDictables => catalogoCampos.where((c) => !c.auto || c.sugerencia != null);

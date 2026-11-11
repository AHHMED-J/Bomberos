// Modelo de datos del parte en el teléfono.
// Se guarda como JSON en SQLite (ver repositorio_local.dart) y se manda igual al servidor.

/// Roles de la app. Dirección NO está en la app (es la web, otro proyecto).
enum Rol {
  /// Cualquier bombero con permiso Editor en su división. Quien crea un parte es
  /// quien lo elabora (`elaboroId`): no es un rol aparte, es una condición de ese parte.
  editor,

  /// Capitán = encargado de turno = Revisor: valida o devuelve los partes de su división.
  capitan,
}

class Usuario {
  const Usuario({
    required this.id,
    required this.nombre,
    required this.matricula,
    required this.rango,
    required this.rol,
    required this.division,
    required this.estacion,
    this.trazo,
    this.tieneLlave = false,
  });
  final String id;
  final String nombre;

  /// Número de empleado: con él y su contraseña entra a la app.
  final String matricula;
  final String rango;
  final Rol rol;
  final String division;
  final String estacion;

  /// Su firma en trazo (ver LienzoFirma.serializar), guardada en el servidor. Se copia a cada parte que firma.
  final String? trazo;

  /// El servidor ya tiene la llave del chip seguro de su celular (uno por usuario).
  final bool tieneLlave;

  String get inicial => nombre.isEmpty ? '?' : nombre.substring(0, 1);

  Usuario copiar({String? trazo, bool? tieneLlave}) => Usuario(
    id: id,
    nombre: nombre,
    matricula: matricula,
    rango: rango,
    rol: rol,
    division: division,
    estacion: estacion,
    trazo: trazo ?? this.trazo,
    tieneLlave: tieneLlave ?? this.tieneLlave,
  );

  Map<String, dynamic> aJson() => {
    'id': id,
    'nombre': nombre,
    'matricula': matricula,
    'rango': rango,
    'rol': rol.name,
    'division': division,
    'estacion': estacion,
    'trazo': trazo,
    'tiene_llave': tieneLlave,
  };

  factory Usuario.deJson(Map<String, dynamic> j) => Usuario(
    id: j['id'] as String,
    nombre: j['nombre'] as String,
    matricula: j['matricula'] as String,
    rango: j['rango'] as String,
    rol: Rol.values.byName(j['rol'] as String),
    division: j['division'] as String,
    estacion: j['estacion'] as String,
    trazo: j['trazo'] as String?,
    tieneLlave: j['tiene_llave'] as bool? ?? false,
  );
}

enum EstadoParte { enProgreso, enviado, devuelto, validado }

/// Experimento A/B: teclado contra dictado. El sorteo todavía no existe.
enum ModoCaptura { teclado, dictado }

/// Cómo dejó la IA un campo. `null` = no lo tocó la IA.
enum EstadoIa { entendido, revisar, falta, corregido }

enum OrigenCampo { manual, auto, dictado }

/// El valor de una casilla de la hoja, con su rastro de dictado.
class ValorCampo {
  const ValorCampo({
    this.valor = '',
    this.origen = OrigenCampo.manual,
    this.estadoIa,
    this.confianza,
    this.valorAnterior,
    this.confirmado = true,
  });

  final String valor;
  final OrigenCampo origen;
  final EstadoIa? estadoIa;

  /// 0..1 según el modelo de llenado.
  final double? confianza;

  /// Sólo en correcciones: lo que había antes del segundo dictado. Nada se borra sin confirmar.
  final String? valorAnterior;

  /// Lo manual nace confirmado; lo dictado nace sin confirmar.
  final bool confirmado;

  bool get vacio => valor.trim().isEmpty;

  /// Bloquea el envío: propuesta de la IA que el bombero no ha confirmado.
  bool get pendienteDeConfirmar => origen == OrigenCampo.dictado && !confirmado && estadoIa != EstadoIa.falta;

  ValorCampo copiar({
    String? valor,
    OrigenCampo? origen,
    EstadoIa? estadoIa,
    bool quitarEstadoIa = false,
    double? confianza,
    String? valorAnterior,
    bool quitarValorAnterior = false,
    bool? confirmado,
  }) => ValorCampo(
    valor: valor ?? this.valor,
    origen: origen ?? this.origen,
    estadoIa: quitarEstadoIa ? null : (estadoIa ?? this.estadoIa),
    confianza: confianza ?? this.confianza,
    valorAnterior: quitarValorAnterior ? null : (valorAnterior ?? this.valorAnterior),
    confirmado: confirmado ?? this.confirmado,
  );

  Map<String, dynamic> aJson() => {
    'valor': valor,
    'origen': origen.name,
    'estado_ia': estadoIa?.name,
    'confianza': confianza,
    'valor_anterior': valorAnterior,
    'confirmado': confirmado,
  };

  factory ValorCampo.deJson(Map<String, dynamic> j) => ValorCampo(
    valor: j['valor'] as String? ?? '',
    origen: OrigenCampo.values.byName(j['origen'] as String? ?? 'manual'),
    estadoIa: j['estado_ia'] == null ? null : EstadoIa.values.byName(j['estado_ia'] as String),
    confianza: (j['confianza'] as num?)?.toDouble(),
    valorAnterior: j['valor_anterior'] as String?,
    confirmado: j['confirmado'] as bool? ?? true,
  );
}

class NotaDevolucion {
  const NotaDevolucion({required this.texto, required this.seccion, required this.revisor, required this.fecha});
  final String texto;
  final String seccion;
  final String revisor;
  final DateTime fecha;

  Map<String, dynamic> aJson() => {
    'texto': texto,
    'seccion': seccion,
    'revisor': revisor,
    'fecha': fecha.toIso8601String(),
  };
  factory NotaDevolucion.deJson(Map<String, dynamic> j) => NotaDevolucion(
    texto: j['texto'] as String,
    seccion: j['seccion'] as String,
    revisor: j['revisor'] as String,
    fecha: DateTime.parse(j['fecha'] as String),
  );
}

/// Firmas del parte. Quien lo elabora y quien lo revisa ponen su firma en trazo (la de su cuenta) y la
/// confirman con la biometría del celular o con su contraseña. Propietario y testigo firman con el dedo.
class Firmas {
  const Firmas({
    this.elaboro,
    this.elaboroSimulada = false,
    this.elaboroTrazo,
    this.revisorNombre,
    this.revisorTrazo,
    this.propietarioNombre = '',
    this.propietarioTrazo,
    this.testigoNombre = '',
    this.testigoTrazo,
    this.requierePeritaje,
  });

  /// Cómo confirmó quien elabora: la firma ECDSA (base64) del reto que lleva el SHA-256 del contenido,
  /// o el texto «contrasena» si confirmó con su contraseña.
  final String? elaboro;

  /// true si la firma vino del respaldo simulado (sin Face ID real).
  final bool elaboroSimulada;

  /// Copia del trazo de quien elabora. La pone el servidor al enviar.
  final String? elaboroTrazo;

  /// Nombre y copia del trazo del revisor. Los pone el servidor al validar.
  final String? revisorNombre;
  final String? revisorTrazo;
  final String propietarioNombre;

  /// Trazo del dedo serializado (ver LienzoFirma.serializar).
  final String? propietarioTrazo;
  final String testigoNombre;
  final String? testigoTrazo;
  final bool? requierePeritaje;

  Firmas copiar({
    String? elaboro,
    bool? elaboroSimulada,
    String? propietarioNombre,
    String? propietarioTrazo,
    String? testigoNombre,
    String? testigoTrazo,
    bool? requierePeritaje,
  }) => Firmas(
    elaboro: elaboro ?? this.elaboro,
    elaboroSimulada: elaboroSimulada ?? this.elaboroSimulada,
    elaboroTrazo: elaboroTrazo,
    revisorNombre: revisorNombre,
    revisorTrazo: revisorTrazo,
    propietarioNombre: propietarioNombre ?? this.propietarioNombre,
    propietarioTrazo: propietarioTrazo ?? this.propietarioTrazo,
    testigoNombre: testigoNombre ?? this.testigoNombre,
    testigoTrazo: testigoTrazo ?? this.testigoTrazo,
    requierePeritaje: requierePeritaje ?? this.requierePeritaje,
  );

  Map<String, dynamic> aJson() => {
    'elaboro': elaboro,
    'elaboro_simulada': elaboroSimulada,
    'elaboro_trazo': elaboroTrazo,
    'revisor_nombre': revisorNombre,
    'revisor_trazo': revisorTrazo,
    'propietario_nombre': propietarioNombre,
    'propietario_trazo': propietarioTrazo,
    'testigo_nombre': testigoNombre,
    'testigo_trazo': testigoTrazo,
    'requiere_peritaje': requierePeritaje,
  };
  factory Firmas.deJson(Map<String, dynamic> j) => Firmas(
    // `encargado*` = nombres anteriores al 10-nov-2026; siguen guardados en teléfonos de prueba.
    elaboro: (j['elaboro'] ?? j['encargado']) as String?,
    elaboroSimulada: (j['elaboro_simulada'] ?? j['encargado_simulada']) as bool? ?? false,
    elaboroTrazo: j['elaboro_trazo'] as String?,
    revisorNombre: j['revisor_nombre'] as String?,
    revisorTrazo: j['revisor_trazo'] as String?,
    propietarioNombre: j['propietario_nombre'] as String? ?? '',
    propietarioTrazo: j['propietario_trazo'] as String?,
    testigoNombre: j['testigo_nombre'] as String? ?? '',
    testigoTrazo: j['testigo_trazo'] as String?,
    requierePeritaje: j['requiere_peritaje'] as bool?,
  );
}

/// Un parte (Hoja de incidente). Lo llena UNA persona: no hay multijugador.
class Parte {
  const Parte({
    required this.id,
    required this.folio,
    required this.estado,
    required this.elaboroId,
    required this.elaboroNombre,
    required this.division,
    required this.creadoEn,
    this.campos = const {},
    this.fotos = 0,
    this.croquisPng,
    this.firmas = const Firmas(),
    this.modo = ModoCaptura.dictado,
    this.segActivo = 0,
    this.ultimaActividad,
    this.nota,
    this.enviadoEn,
    this.sello,
  });

  final String id;
  final String folio;
  final EstadoParte estado;
  final String elaboroId;
  final String elaboroNombre;
  final String division;
  final DateTime creadoEn;
  final Map<String, ValorCampo> campos;
  final int fotos;

  /// Ruta relativa del PNG del croquis en el teléfono («croquis/…png»), o null si no hay captura.
  final String? croquisPng;
  final Firmas firmas;

  /// A/B: qué grupo le tocó a este parte. TODO(experimento): sorteo al crear.
  final ModoCaptura modo;

  /// Tiempo activo en segundos; los huecos de más de 30 s cuentan 30 s (como en el CFP).
  final int segActivo;
  final DateTime? ultimaActividad;
  final NotaDevolucion? nota;
  final DateTime? enviadoEn;

  /// SHA-256 del sello del revisor (sólo validados).
  final String? sello;

  static const huecoMaximo = Duration(seconds: 30);

  String valor(String campoId) => campos[campoId]?.valor ?? '';
  ValorCampo campo(String campoId) => campos[campoId] ?? const ValorCampo();

  Parte copiar({
    String? folio,
    EstadoParte? estado,
    Map<String, ValorCampo>? campos,
    int? fotos,
    String? croquisPng,
    Firmas? firmas,
    ModoCaptura? modo,
    int? segActivo,
    DateTime? ultimaActividad,
    NotaDevolucion? nota,
    bool quitarNota = false,
    DateTime? enviadoEn,
    String? sello,
  }) => Parte(
    id: id,
    folio: folio ?? this.folio,
    estado: estado ?? this.estado,
    elaboroId: elaboroId,
    elaboroNombre: elaboroNombre,
    division: division,
    creadoEn: creadoEn,
    campos: campos ?? this.campos,
    fotos: fotos ?? this.fotos,
    croquisPng: croquisPng ?? this.croquisPng,
    firmas: firmas ?? this.firmas,
    modo: modo ?? this.modo,
    segActivo: segActivo ?? this.segActivo,
    ultimaActividad: ultimaActividad ?? this.ultimaActividad,
    nota: quitarNota ? null : (nota ?? this.nota),
    enviadoEn: enviadoEn ?? this.enviadoEn,
    sello: sello ?? this.sello,
  );

  /// Suma tiempo activo con tope de 30 s por hueco.
  Parte conActividad(DateTime ahora) {
    var suma = segActivo;
    final ultima = ultimaActividad;
    if (ultima != null) {
      var hueco = ahora.difference(ultima);
      if (hueco.isNegative) hueco = Duration.zero;
      if (hueco > huecoMaximo) hueco = huecoMaximo;
      suma += hueco.inSeconds;
    }
    return copiar(segActivo: suma, ultimaActividad: ahora);
  }

  /// Contenido canónico que se firma (su SHA-256 va en el reto).
  Map<String, dynamic> contenidoParaFirmar() => {
    'folio': folio,
    'campos': {for (final e in (campos.entries.toList()..sort((a, b) => a.key.compareTo(b.key)))) e.key: e.value.valor},
    'fotos': fotos,
    'propietario': firmas.propietarioNombre,
    'testigo': firmas.testigoNombre,
    'propietario_trazo': firmas.propietarioTrazo,
    'testigo_trazo': firmas.testigoTrazo,
    'requiere_peritaje': firmas.requierePeritaje,
  };

  Map<String, dynamic> aJson() => {
    'id': id,
    'folio': folio,
    'estado': estado.name,
    'elaboro_id': elaboroId,
    'elaboro_nombre': elaboroNombre,
    'division': division,
    'creado_en': creadoEn.toIso8601String(),
    'campos': campos.map((k, v) => MapEntry(k, v.aJson())),
    'fotos': fotos,
    'croquis_png': croquisPng,
    'firmas': firmas.aJson(),
    'modo': modo.name,
    'seg_activo': segActivo,
    'ultima_actividad': ultimaActividad?.toIso8601String(),
    'nota': nota?.aJson(),
    'enviado_en': enviadoEn?.toIso8601String(),
    'sello': sello,
  };

  factory Parte.deJson(Map<String, dynamic> j) => Parte(
    id: j['id'] as String,
    folio: j['folio'] as String,
    estado: EstadoParte.values.byName(j['estado'] as String),
    elaboroId: (j['elaboro_id'] ?? j['encargado_id']) as String,
    elaboroNombre: (j['elaboro_nombre'] ?? j['encargado_nombre']) as String? ?? '',
    division: j['division'] as String? ?? '',
    creadoEn: DateTime.tryParse(j['creado_en'] as String? ?? '') ?? DateTime.now(),
    campos: (j['campos'] as Map<String, dynamic>? ?? {}).map(
      (k, v) => MapEntry(k, ValorCampo.deJson(v as Map<String, dynamic>)),
    ),
    fotos: j['fotos'] as int? ?? 0,
    croquisPng: j['croquis_png'] as String?, // «croquis_dibujado» (versión anterior) ya no se usa
    firmas: Firmas.deJson(j['firmas'] as Map<String, dynamic>? ?? {}),
    modo: ModoCaptura.values.byName(j['modo'] as String? ?? 'dictado'),
    segActivo: j['seg_activo'] as int? ?? 0,
    ultimaActividad: j['ultima_actividad'] == null ? null : DateTime.parse(j['ultima_actividad'] as String),
    nota: j['nota'] == null ? null : NotaDevolucion.deJson(j['nota'] as Map<String, dynamic>),
    enviadoEn: j['enviado_en'] == null ? null : DateTime.parse(j['enviado_en'] as String),
    sello: j['sello'] as String?,
  );
}

/// Folio que pone el teléfono cuando se empieza un parte sin señal. Se cambia por el real del servidor
/// justo antes de firmar y enviar (el servidor no conoce los provisionales).
const prefijoFolioProvisional = 'LOCAL-';

bool esFolioProvisional(String folio) => folio.startsWith(prefijoFolioProvisional);

String folioProvisional(DateTime t) =>
    '$prefijoFolioProvisional${t.millisecondsSinceEpoch.toRadixString(36).toUpperCase()}';

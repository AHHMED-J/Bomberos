import '../datos/modelos.dart';

/// De dónde salen los datos o la IA.
enum Fuente {
  /// Datos de ejemplo dentro de la app (no hace falta el servidor).
  falsa,

  /// 4-tercera-version/servidor (que por ahora también responde datos fijos).
  servidor,
}

/// LA bandera única para cambiar las piezas falsas por las reales.
/// Se arranca con --dart-define y se puede mover en Ajustes de depuración.
///
///   flutter run --dart-define=IA=servidor --dart-define=DATOS=servidor \
///               --dart-define=SERVIDOR_URL=http://192.168.1.20:3100
class Config {
  const Config({
    this.urlServidor = const String.fromEnvironment('SERVIDOR_URL', defaultValue: 'http://localhost:3100'),
    // IA real por defecto. Sólo `--dart-define=IA=falsa` usa los textos de ejemplo (sin servidor).
    this.ia = const String.fromEnvironment('IA') == 'falsa' ? Fuente.falsa : Fuente.servidor,
    this.datos = const String.fromEnvironment('DATOS') == 'servidor' ? Fuente.servidor : Fuente.falsa,
    this.sinConexionSimulada = false,
    this.microfonoBloqueadoSimulado = false,
    this.microfonoSimulado = const bool.fromEnvironment('MICROFONO_SIMULADO'),
    this.firmaSimulada = false,
    this.modoNuevoParte = ModoCaptura.dictado,
  });

  final String urlServidor;

  /// servidor = Whisper + qwen2.5 en la Mac (arrancar/correr-app.sh). falsa = textos de ejemplo.
  final Fuente ia;
  final Fuente datos;

  /// TODO: cambiar por un detector de red real (p. ej. connectivity_plus).
  final bool sinConexionSimulada;
  final bool microfonoBloqueadoSimulado;

  /// Grabadora de mentira (sin micrófono). Apagado = micrófono real con el paquete `record`.
  final bool microfonoSimulado;

  /// Fuerza la firma simulada aunque haya Face ID (útil en el simulador).
  final bool firmaSimulada;

  /// A/B: modo de los partes nuevos. TODO(experimento): sorteo en el servidor.
  final ModoCaptura modoNuevoParte;

  Config copiar({
    String? urlServidor,
    Fuente? ia,
    Fuente? datos,
    bool? sinConexionSimulada,
    bool? microfonoBloqueadoSimulado,
    bool? microfonoSimulado,
    bool? firmaSimulada,
    ModoCaptura? modoNuevoParte,
  }) => Config(
    urlServidor: urlServidor ?? this.urlServidor,
    ia: ia ?? this.ia,
    datos: datos ?? this.datos,
    sinConexionSimulada: sinConexionSimulada ?? this.sinConexionSimulada,
    microfonoBloqueadoSimulado: microfonoBloqueadoSimulado ?? this.microfonoBloqueadoSimulado,
    microfonoSimulado: microfonoSimulado ?? this.microfonoSimulado,
    firmaSimulada: firmaSimulada ?? this.firmaSimulada,
    modoNuevoParte: modoNuevoParte ?? this.modoNuevoParte,
  );
}

import 'dart:async';
import 'dart:math';
import 'dart:typed_data';

/// Un audio terminado, listo para transcribir. Se borra apenas se transcribe.
class AudioGrabado {
  const AudioGrabado({required this.bytes, required this.duracion, this.formato = 'm4a', required this.grabadoEn});
  final Uint8List bytes;
  final Duration duracion;
  final String formato;
  final DateTime grabadoEn;
}

enum PermisoMicrofono { concedido, denegado }

/// Interfaz del micrófono. La app sólo conoce esto.
abstract interface class GrabadoraAudio {
  Future<PermisoMicrofono> pedirPermiso();
  Future<void> iniciar();

  /// Segundos transcurridos y nivel (0..1) para dibujar la onda.
  Stream<NivelAudio> get niveles;
  Future<AudioGrabado> detener();
  Future<void> cancelar();
}

class NivelAudio {
  const NivelAudio(this.segundos, this.nivel);
  final int segundos;
  final double nivel;
}

/// Grabadora de mentira: cuenta segundos y genera niveles al azar.
/// La real está en grabadora_real.dart (paquete `record`). Ésta se usa en pruebas
/// y con «Micrófono simulado» en Depuración.
class GrabadoraFalsa implements GrabadoraAudio {
  GrabadoraFalsa({this.bloqueada = false, this.tick = const Duration(seconds: 1)});

  /// Simula que el usuario negó el micrófono (pantalla D7).
  final bool bloqueada;
  final Duration tick;

  final _rnd = Random(7);
  StreamController<NivelAudio>? _ctrl;
  Timer? _timer;
  DateTime? _inicio;
  int _segundos = 0;

  @override
  Future<PermisoMicrofono> pedirPermiso() async => bloqueada ? PermisoMicrofono.denegado : PermisoMicrofono.concedido;

  @override
  Stream<NivelAudio> get niveles => (_ctrl ??= StreamController<NivelAudio>.broadcast()).stream;

  @override
  Future<void> iniciar() async {
    _ctrl ??= StreamController<NivelAudio>.broadcast();
    _inicio = DateTime.now();
    _segundos = 0;
    _timer?.cancel();
    _timer = Timer.periodic(tick, (_) {
      _segundos++;
      _ctrl?.add(NivelAudio(_segundos, .25 + _rnd.nextDouble() * .75));
    });
  }

  @override
  Future<AudioGrabado> detener() async {
    _timer?.cancel();
    final dur = _inicio == null ? Duration.zero : Duration(seconds: _segundos);
    _inicio = null;
    // Bytes de relleno: no hay audio real. Sirven para probar el envío al servidor.
    return AudioGrabado(bytes: Uint8List.fromList(List.filled(32, 0)), duracion: dur, grabadoEn: DateTime.now());
  }

  @override
  Future<void> cancelar() async {
    _timer?.cancel();
    _inicio = null;
  }
}

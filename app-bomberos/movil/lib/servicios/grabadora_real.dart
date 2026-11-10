import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import 'grabadora_audio.dart';

/// Micrófono real con el paquete `record`: AAC en m4a, 16 kHz, mono (lo que espera Whisper).
///
/// Privacidad: el archivo vive en la carpeta temporal de la app sólo mientras se graba.
/// Al detener se lee a memoria y se BORRA del disco; al cancelar se borra sin leerlo.
/// Si la app se cerró a media grabación, los restos se borran al iniciar la siguiente.
///
/// Mientras graba, la pantalla no se apaga: el bombero dicta sin tocarla y el bloqueo automático
/// (30 s o 1 min) mandaba la app a segundo plano a media grabación.
class GrabadoraReal implements GrabadoraAudio {
  GrabadoraReal({AudioRecorder? grabador}) : _rec = grabador ?? AudioRecorder();

  final AudioRecorder _rec;
  final _ctrl = StreamController<NivelAudio>.broadcast();
  final _reloj = Stopwatch();
  StreamSubscription<Amplitude>? _amp;
  DateTime? _inicio;
  String? _ruta;

  static const _prefijo = 'dictado-';

  static const config = RecordConfig(
    encoder: AudioEncoder.aacLc,
    sampleRate: 16000,
    numChannels: 1,
    bitRate: 32000, // ~240 KB por minuto: suficiente para voz
  );

  /// dBFS → 0..1 para la onda. Bajo −50 dB se ve plano.
  @visibleForTesting
  static double nivelDesdeDb(double db) => db.isFinite ? ((db + 50) / 50).clamp(0.0, 1.0) : 0.0;

  @override
  Future<PermisoMicrofono> pedirPermiso() async =>
      await _rec.hasPermission() ? PermisoMicrofono.concedido : PermisoMicrofono.denegado;

  @override
  Stream<NivelAudio> get niveles => _ctrl.stream;

  @override
  Future<void> iniciar() async {
    final dir = await getTemporaryDirectory();
    await _borrarRestos(dir);
    _ruta = '${dir.path}/$_prefijo${DateTime.now().millisecondsSinceEpoch}.m4a';
    await _rec.start(config, path: _ruta!);
    await _pantallaEncendida(true);
    _inicio = DateTime.now();
    _reloj
      ..reset()
      ..start();
    await _amp?.cancel();
    _amp = _rec
        .onAmplitudeChanged(const Duration(milliseconds: 200))
        .listen((a) => _ctrl.add(NivelAudio(_reloj.elapsed.inSeconds, nivelDesdeDb(a.current))));
  }

  @override
  Future<AudioGrabado> detener() async {
    _reloj.stop();
    await _pantallaEncendida(false);
    await _amp?.cancel();
    _amp = null;
    final ruta = await _rec.stop() ?? _ruta;
    _ruta = null;
    if (ruta == null) throw StateError('No había grabación');
    final archivo = File(ruta);
    try {
      return AudioGrabado(
        bytes: await archivo.readAsBytes(),
        duracion: _reloj.elapsed,
        formato: 'm4a',
        grabadoEn: _inicio ?? DateTime.now(),
      );
    } finally {
      await _borrar(archivo);
    }
  }

  @override
  Future<void> cancelar() async {
    _reloj.stop();
    await _pantallaEncendida(false);
    await _amp?.cancel();
    _amp = null;
    await _rec.cancel(); // `record` también borra el archivo
    if (_ruta != null) await _borrar(File(_ruta!));
    _ruta = null;
  }

  Future<void> liberar() async {
    await cancelar();
    await _rec.dispose();
    await _ctrl.close();
  }

  /// Si el plugin falla, se graba igual: sólo se pierde lo de mantener la pantalla encendida.
  static Future<void> _pantallaEncendida(bool si) async {
    try {
      await WakelockPlus.toggle(enable: si);
    } catch (e) {
      debugPrint('No se pudo ${si ? 'mantener' : 'liberar'} la pantalla encendida: $e');
    }
  }

  static Future<void> _borrarRestos(Directory dir) async {
    try {
      await for (final f in dir.list()) {
        if (f is File && f.uri.pathSegments.last.startsWith(_prefijo)) await _borrar(f);
      }
    } catch (e) {
      debugPrint('No se pudo revisar la carpeta temporal: $e'); // no impide grabar
    }
  }

  static Future<void> _borrar(File f) async {
    try {
      if (await f.exists()) await f.delete();
    } catch (e) {
      debugPrint('No se pudo borrar un audio temporal: $e');
    }
  }
}

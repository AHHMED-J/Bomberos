import 'dart:async';
import 'dart:typed_data';

import 'package:bomberos_parte/acceso/memoria_telefono.dart';
import 'package:bomberos_parte/croquis/almacen_croquis.dart';
import 'package:bomberos_parte/datos/repositorio_local.dart';
import 'package:bomberos_parte/datos/repositorio_remoto.dart';
import 'package:bomberos_parte/servicios/firma/servicio_firma.dart';
import 'package:bomberos_parte/servicios/grabadora_audio.dart';
import 'package:bomberos_parte/servicios/ia/servicio_llenado_campos.dart';
import 'package:bomberos_parte/servicios/ia/servicio_resumen.dart';
import 'package:bomberos_parte/servicios/ia/servicio_transcripcion.dart';
import 'package:bomberos_parte/servicios/proveedores.dart';
import 'package:bomberos_parte/servicios/ubicacion.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;

/// Grabadora controlada por la prueba: la duración del audio se fija a mano.
class GrabadoraPrueba implements GrabadoraAudio {
  GrabadoraPrueba({this.duracion = const Duration(seconds: 5), this.bloqueada = false});
  Duration duracion;
  bool bloqueada;
  final _c = StreamController<NivelAudio>.broadcast();

  @override
  Future<PermisoMicrofono> pedirPermiso() async => bloqueada ? PermisoMicrofono.denegado : PermisoMicrofono.concedido;
  @override
  Stream<NivelAudio> get niveles => _c.stream;
  @override
  Future<void> iniciar() async => _c.add(const NivelAudio(1, .5));

  /// Simula que pasó el tiempo grabando.
  void emitir(int segundos) => _c.add(NivelAudio(segundos, .5));
  @override
  Future<AudioGrabado> detener() async =>
      AudioGrabado(bytes: Uint8List(8), duracion: duracion, grabadoEn: DateTime(2026, 11, 9, 14, 32));
  @override
  Future<void> cancelar() async {}
}

/// Sobrescrituras comunes: todo falso y sin retardos.
List<Override> overridesDePrueba({
  GrabadoraAudio? grabadora,
  RepositorioLocal? local,
  AlmacenCroquis? croquis,
  ServicioUbicacion? ubicacion,
}) => [
  grabadoraProvider.overrideWithValue(grabadora ?? GrabadoraPrueba()),
  transcripcionProvider.overrideWithValue(FalsoTranscripcion(retardo: Duration.zero)),
  llenadoCamposProvider.overrideWithValue(FalsoLlenadoCampos(retardo: Duration.zero)),
  resumenProvider.overrideWithValue(FalsoResumen(retardo: Duration.zero)),
  repositorioLocalProvider.overrideWithValue(local ?? RepositorioMemoria()),
  repositorioRemotoProvider.overrideWithValue(RemotoFalso(retardo: Duration.zero)),
  firmaProvider.overrideWithValue(FirmaSimulada(retardo: Duration.zero)),
  ubicacionProvider.overrideWithValue(ubicacion ?? UbicacionFija()),
  teselasMapaProvider.overrideWithValue(false),
  almacenCroquisProvider.overrideWithValue(croquis ?? AlmacenCroquisMemoria()),
  memoriaTelefonoProvider.overrideWithValue(MemoriaTelefonoMemoria()),
];

/// Espera (en el bucle de eventos) a que se cumpla una condición.
Future<void> esperarA(bool Function() condicion, {Duration limite = const Duration(seconds: 3)}) async {
  final fin = DateTime.now().add(limite);
  while (!condicion()) {
    if (DateTime.now().isAfter(fin)) throw TimeoutException('La condición no se cumplió');
    await Future<void>.delayed(const Duration(milliseconds: 5));
  }
}

ProviderContainer contenedor({GrabadoraAudio? grabadora, RepositorioLocal? local}) => ProviderContainer.test(
  overrides: overridesDePrueba(grabadora: grabadora, local: local),
);

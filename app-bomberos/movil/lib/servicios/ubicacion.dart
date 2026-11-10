import 'dart:async';

import 'package:geolocator/geolocator.dart';

/// Un punto del GPS con su precisión en metros.
class Ubicacion {
  const Ubicacion(this.latitud, this.longitud, {this.precisionM = 0});
  final double latitud;
  final double longitud;
  final double precisionM;

  /// «31.86670, -116.59640 · ±8 m»
  String get texto =>
      '${latitud.toStringAsFixed(5)}, ${longitud.toStringAsFixed(5)}'
      '${precisionM > 0 ? ' · ±${precisionM.round()} m' : ''}';
}

enum EstadoUbicacion { activa, sinPermiso, apagada }

/// Centro de Ensenada: se muestra mientras llega la primera lectura del GPS.
const centroEnsenada = Ubicacion(31.8667, -116.5964);

/// La ubicación en tiempo real del croquis. Sólo se usa con la app abierta («mientras se usa»):
/// no se guarda en ningún lado hasta que el bombero presiona «Captura».
abstract class ServicioUbicacion {
  /// Revisa que el GPS esté encendido y pide permiso si hace falta.
  Future<EstadoUbicacion> preparar();

  /// Lecturas continuas mientras alguien escuche.
  Stream<Ubicacion> seguir();

  /// Ajustes del iPhone, para cuando se negó el permiso.
  Future<void> abrirAjustes();
}

class UbicacionReal implements ServicioUbicacion {
  @override
  Future<EstadoUbicacion> preparar() async {
    if (!await Geolocator.isLocationServiceEnabled()) return EstadoUbicacion.apagada;
    var permiso = await Geolocator.checkPermission();
    if (permiso == LocationPermission.denied) permiso = await Geolocator.requestPermission();
    return switch (permiso) {
      LocationPermission.denied ||
      LocationPermission.deniedForever ||
      LocationPermission.unableToDetermine => EstadoUbicacion.sinPermiso,
      _ => EstadoUbicacion.activa,
    };
  }

  @override
  Stream<Ubicacion> seguir() => Geolocator.getPositionStream(
    // Cada 3 m basta para ver el punto moverse sin gastar batería de más.
    locationSettings: const LocationSettings(accuracy: LocationAccuracy.best, distanceFilter: 3),
  ).map((p) => Ubicacion(p.latitude, p.longitude, precisionM: p.accuracy));

  @override
  Future<void> abrirAjustes() => Geolocator.openAppSettings();
}

/// Para pruebas y para el simulador sin ubicación: siempre el mismo punto.
class UbicacionFija implements ServicioUbicacion {
  UbicacionFija({
    this.punto = const Ubicacion(31.8667, -116.5964, precisionM: 8),
    this.estado = EstadoUbicacion.activa,
  });
  final Ubicacion punto;
  final EstadoUbicacion estado;

  @override
  Future<EstadoUbicacion> preparar() async => estado;

  @override
  Stream<Ubicacion> seguir() => estado == EstadoUbicacion.activa ? Stream.value(punto) : const Stream.empty();

  @override
  Future<void> abrirAjustes() async {}
}

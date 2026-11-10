import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

/// Dónde viven los PNG del croquis. El parte sólo guarda la ruta relativa («croquis/…png»):
/// la carpeta de la app cambia de lugar entre instalaciones, la ruta relativa no.
///
/// Igual que las fotos, todavía no se suben al servidor (TODO: subirlos con el parte).
abstract class AlmacenCroquis {
  Future<String> guardar(String parteId, Uint8List png);
  Future<Uint8List?> leer(String ruta);
  Future<void> borrar(String ruta);
}

class AlmacenCroquisArchivos implements AlmacenCroquis {
  Future<Directory> _base() => getApplicationDocumentsDirectory();

  @override
  Future<String> guardar(String parteId, Uint8List png) async {
    final base = await _base();
    // La hora en el nombre evita que la pantalla muestre la captura anterior guardada en caché.
    final ruta = p.join('croquis', '$parteId-${DateTime.now().millisecondsSinceEpoch}.png');
    final archivo = File(p.join(base.path, ruta));
    await archivo.parent.create(recursive: true);
    await archivo.writeAsBytes(png, flush: true);
    return ruta;
  }

  @override
  Future<Uint8List?> leer(String ruta) async {
    final archivo = File(p.join((await _base()).path, ruta));
    return await archivo.exists() ? archivo.readAsBytes() : null;
  }

  @override
  Future<void> borrar(String ruta) async {
    try {
      final archivo = File(p.join((await _base()).path, ruta));
      if (await archivo.exists()) await archivo.delete();
    } catch (e) {
      debugPrint('No se pudo borrar un croquis: ${e.runtimeType}');
    }
  }
}

class AlmacenCroquisMemoria implements AlmacenCroquis {
  final archivos = <String, Uint8List>{};
  var _n = 0;

  @override
  Future<String> guardar(String parteId, Uint8List png) async {
    final ruta = 'croquis/$parteId-${_n++}.png';
    archivos[ruta] = png;
    return ruta;
  }

  @override
  Future<Uint8List?> leer(String ruta) async => archivos[ruta];

  @override
  Future<void> borrar(String ruta) async => archivos.remove(ruta);
}

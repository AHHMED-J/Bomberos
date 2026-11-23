import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

/// Dónde viven las fotos de la evidencia en el teléfono. El parte sólo guarda la ruta relativa («fotos/…jpg»):
/// la carpeta de la app cambia de lugar entre instalaciones, la ruta relativa no. Al firmar, se sacan sus
/// SHA-256 y se suben al servidor junto con el croquis (ver HojaControlador.prepararAdjuntos).
abstract class AlmacenFotos {
  Future<String> guardar(String parteId, Uint8List bytes);
  Future<Uint8List?> leer(String ruta);
  Future<void> borrar(String ruta);
}

class AlmacenFotosArchivos implements AlmacenFotos {
  Future<Directory> _base() => getApplicationDocumentsDirectory();

  @override
  Future<String> guardar(String parteId, Uint8List bytes) async {
    final base = await _base();
    final ruta = p.join('fotos', '$parteId-${DateTime.now().microsecondsSinceEpoch}.jpg');
    final archivo = File(p.join(base.path, ruta));
    await archivo.parent.create(recursive: true);
    await archivo.writeAsBytes(bytes, flush: true);
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
      debugPrint('No se pudo borrar una foto: ${e.runtimeType}');
    }
  }
}

class AlmacenFotosMemoria implements AlmacenFotos {
  final archivos = <String, Uint8List>{};
  var _n = 0;

  @override
  Future<String> guardar(String parteId, Uint8List bytes) async {
    final ruta = 'fotos/$parteId-${_n++}.jpg';
    archivos[ruta] = bytes;
    return ruta;
  }

  @override
  Future<Uint8List?> leer(String ruta) async => archivos[ruta];

  @override
  Future<void> borrar(String ruta) async => archivos.remove(ruta);
}

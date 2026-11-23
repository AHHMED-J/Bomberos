import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';

/// De dónde sale la foto.
enum OrigenFoto { camara, galeria }

/// La cámara y la fototeca. Devuelve los bytes de un JPEG ya reducido (lado mayor de 1600 px), o null si la
/// persona canceló. Si la cámara no existe (el simulador no tiene) lanza [CamaraNoDisponible].
abstract interface class ServicioCamara {
  Future<Uint8List?> tomar(OrigenFoto origen);
}

class CamaraNoDisponible implements Exception {
  const CamaraNoDisponible([this.motivo = '']);
  final String motivo;
  @override
  String toString() => 'CamaraNoDisponible($motivo)';
}

/// image_picker: cámara o fototeca del iPhone. La reducción la hace el sistema antes de entregar la foto.
class CamaraReal implements ServicioCamara {
  CamaraReal({ImagePicker? selector}) : _selector = selector ?? ImagePicker();
  final ImagePicker _selector;

  @override
  Future<Uint8List?> tomar(OrigenFoto origen) async {
    try {
      final f = await _selector.pickImage(
        source: origen == OrigenFoto.camara ? ImageSource.camera : ImageSource.gallery,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 80,
        requestFullMetadata: false,
      );
      return f == null ? null : await f.readAsBytes();
    } catch (e) {
      // Sin cámara (simulador) o sin permiso: la pantalla sugiere usar la fototeca.
      throw CamaraNoDisponible('${e.runtimeType}');
    }
  }
}

/// Para pruebas: entrega las fotos que se le pongan, de una en una.
class CamaraFalsa implements ServicioCamara {
  CamaraFalsa([List<Uint8List> fotos = const []]) : _fotos = [...fotos];
  final List<Uint8List> _fotos;
  bool sinCamara = false;

  @override
  Future<Uint8List?> tomar(OrigenFoto origen) async {
    if (sinCamara && origen == OrigenFoto.camara) throw const CamaraNoDisponible('prueba');
    return _fotos.isEmpty ? null : _fotos.removeAt(0);
  }
}

import 'dart:convert';

import '../../datos/api_cliente.dart';
import '../grabadora_audio.dart';

/// IA 1 · voz a texto. Contrato: servidor/CONTRATOS-IA.md § 1.
class Transcripcion {
  const Transcripcion({required this.texto, required this.duracionS, required this.modelo, this.idioma = 'es'});
  final String texto;
  final double duracionS;
  final String modelo;
  final String idioma;
}

/// El audio no sirve (casi silencio): pantalla D6.
class AudioInvalido implements Exception {
  const AudioInvalido([this.motivo = 'Casi no se escuchó nada']);
  final String motivo;
}

abstract interface class ServicioTranscripcion {
  Future<Transcripcion> transcribir(AudioGrabado audio, {String idioma = 'es'});
}

/// Devuelve dos textos de ejemplo: el primer dictado y el segundo (con una corrección).
class FalsoTranscripcion implements ServicioTranscripcion {
  FalsoTranscripcion({this.retardo = const Duration(milliseconds: 900)});
  final Duration retardo;
  int _llamadas = 0;

  static const textoPrimero =
      '(Ejemplo) Incendio de pastizal. Unidad E7 de la estación 3. Calle López Mateos, El Sauzal. '
      'Se sofocó el fuego con pitón de niebla. No hubo lesionados.';
  static const textoSegundo =
      '(Ejemplo) Corrijo, llegamos a las 14:35. El propietario es Manuel Torres. Iban R. Cota y D. Mora.';

  @override
  Future<Transcripcion> transcribir(AudioGrabado audio, {String idioma = 'es'}) async {
    await Future<void>.delayed(retardo);
    if (audio.duracion < const Duration(seconds: 2)) throw const AudioInvalido();
    final texto = _llamadas++ == 0 ? textoPrimero : textoSegundo;
    return Transcripcion(texto: texto, duracionS: audio.duracion.inMilliseconds / 1000, modelo: 'falso');
  }
}

/// Llama a POST /api/ia/transcribir. Con IA_MODO=local el servidor usa Whisper large-v3 en la Mac
/// (ia-local/README.md); con IA_MODO=fijo responde un texto de ejemplo.
class ServidorTranscripcion implements ServicioTranscripcion {
  ServidorTranscripcion(this.api);
  final ApiCliente api;

  @override
  Future<Transcripcion> transcribir(AudioGrabado audio, {String idioma = 'es'}) async {
    try {
      final r = await api.post('/api/ia/transcribir', {
        'audio_base64': base64Encode(audio.bytes),
        'formato': audio.formato,
        'duracion_s': audio.duracion.inMilliseconds / 1000,
        'idioma': idioma,
      });
      return Transcripcion(
        texto: r['texto'] as String,
        duracionS: (r['duracion_s'] as num).toDouble(),
        modelo: r['modelo'] as String,
        idioma: r['idioma'] as String? ?? idioma,
      );
    } on ErrorApi catch (e) {
      switch (e.codigo) {
        case 'audio_vacio':
          throw AudioInvalido(e.cuerpo['mensaje'] as String? ?? 'Casi no se escuchó nada');
        case 'audio_muy_largo':
          throw const AudioInvalido('El audio pasó de 3 minutos. Dicta en dos partes.');
        case 'audio_ilegible':
          throw const AudioInvalido('No se pudo leer el audio. Vuelve a grabar.');
      }
      rethrow;
    }
  }
}

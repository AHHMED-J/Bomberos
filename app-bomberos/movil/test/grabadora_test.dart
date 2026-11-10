import 'dart:convert';

import 'package:bomberos_parte/datos/api_cliente.dart';

import 'dart:typed_data';

import 'package:bomberos_parte/datos/datos_ejemplo.dart';
import 'package:bomberos_parte/dictado/dictado_controlador.dart';
import 'package:bomberos_parte/hoja/hoja_controlador.dart';
import 'package:bomberos_parte/servicios/grabadora_audio.dart';
import 'package:bomberos_parte/servicios/grabadora_real.dart';
import 'package:bomberos_parte/servicios/ia/servicio_transcripcion.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'apoyo.dart';

void main() {
  test('Nivel de la onda: dBFS → 0..1', () {
    expect(GrabadoraReal.nivelDesdeDb(0), 1);
    expect(GrabadoraReal.nivelDesdeDb(-25), .5);
    expect(GrabadoraReal.nivelDesdeDb(-80), 0);
    expect(GrabadoraReal.nivelDesdeDb(double.negativeInfinity), 0);
  });

  test('La grabadora real se configura como la espera Whisper: m4a AAC, 16 kHz, mono', () {
    expect(GrabadoraReal.config.sampleRate, 16000);
    expect(GrabadoraReal.config.numChannels, 1);
  });

  test('Se detiene sola antes del límite de 3 minutos del servidor', () async {
    final g = GrabadoraPrueba(duracion: const Duration(seconds: 175));
    final c = contenedor(grabadora: g);
    await c.read(hojaProvider.notifier).nuevo(usuarioEditorPrincipal);
    final d = c.read(dictadoProvider.notifier);
    await d.iniciar();
    g.emitir(100);
    await Future<void>.delayed(Duration.zero);
    expect(c.read(dictadoProvider).fase, FaseDictado.grabando);
    g.emitir(DictadoControlador.maximo.inSeconds);
    await esperarA(() => c.read(dictadoProvider).fase == FaseDictado.resultado);
  });

  group('Errores del servidor → pantalla D6 con su motivo', () {
    Future<Object?> errorCon(String codigo) async {
      final api = ApiCliente(
        'http://x',
        cliente: MockClient((_) async => http.Response(jsonEncode({'error': codigo}), 413)),
      );
      try {
        await ServidorTranscripcion(api).transcribir(
          AudioGrabado(bytes: Uint8List(4), duracion: const Duration(seconds: 5), grabadoEn: DateTime(2026)),
        );
      } catch (e) {
        return e;
      }
      return null;
    }

    test('audio_muy_largo', () async {
      final e = await errorCon('audio_muy_largo');
      expect(e, isA<AudioInvalido>().having((a) => a.motivo, 'motivo', contains('3 minutos')));
    });
    test('audio_ilegible', () async {
      expect(await errorCon('audio_ilegible'), isA<AudioInvalido>());
    });
    test('otro error se propaga', () async {
      expect(await errorCon('whisper_apagado'), isA<ErrorApi>());
    });
  });
}

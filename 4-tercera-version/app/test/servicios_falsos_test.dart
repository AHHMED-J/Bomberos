import 'dart:typed_data';

import 'package:bomberos_parte/datos/modelos.dart';
import 'package:bomberos_parte/servicios/firma/servicio_firma.dart';
import 'package:bomberos_parte/servicios/grabadora_audio.dart';
import 'package:bomberos_parte/servicios/ia/servicio_llenado_campos.dart';
import 'package:bomberos_parte/servicios/ia/servicio_resumen.dart';
import 'package:bomberos_parte/servicios/ia/servicio_transcripcion.dart';
import 'package:flutter_test/flutter_test.dart';

AudioGrabado _audio(int s) => AudioGrabado(
  bytes: Uint8List(4),
  duracion: Duration(seconds: s),
  grabadoEn: DateTime(2026),
);

void main() {
  test('FalsoTranscripcion: primer y segundo texto; audio corto = AudioInvalido', () async {
    final t = FalsoTranscripcion(retardo: Duration.zero);
    expect(() => t.transcribir(_audio(1)), throwsA(isA<AudioInvalido>()));
    expect((await t.transcribir(_audio(10))).texto, FalsoTranscripcion.textoPrimero);
    expect((await t.transcribir(_audio(10))).texto, FalsoTranscripcion.textoSegundo);
  });

  test('FalsoLlenadoCampos: primer dictado con entendido/revisar/falta', () async {
    final r = await FalsoLlenadoCampos(retardo: Duration.zero).llenar(transcripcion: 'x', camposActuales: const {});
    expect(r.de(EstadoIa.entendido), hasLength(2));
    expect(r.de(EstadoIa.revisar), hasLength(2));
    expect(r.de(EstadoIa.falta), hasLength(2));
    expect(r.tieneCorrecciones, isFalse);
    expect(r.propuestas.every((p) => p.confianza >= 0 && p.confianza <= 1), isTrue);
  });

  test('FalsoLlenadoCampos: segundo dictado corrige con valor anterior', () async {
    final r = await FalsoLlenadoCampos(retardo: Duration.zero).llenar(
      transcripcion: 'x',
      camposActuales: const {
        'tipo_servicio': ValorCampo(valor: 'Incendio de pastizal'),
        'hora_llegada': ValorCampo(valor: '14:20'),
      },
    );
    final c = r.de(EstadoIa.corregido).single;
    expect(c.campoId, 'hora_llegada');
    expect(c.valorAnterior, '14:20');
    expect(c.valor, '14:35');
  });

  test('FalsoResumen usa los campos y avisa que es ejemplo', () async {
    final s = await FalsoResumen(retardo: Duration.zero).resumir(
      campos: const {
        'tipo_servicio': ValorCampo(valor: 'Incendio de pastizal'),
        'lugar_servicio': ValorCampo(valor: 'El Sauzal'),
      },
    );
    expect(s, contains('Incendio de pastizal en El Sauzal'));
    expect(s, contains('ejemplo'));
  });

  test('FirmaSimulada firma el reto y se marca como simulada', () async {
    final f = FirmaSimulada(retardo: Duration.zero);
    expect(await f.tieneLlave(), isFalse);
    expect((await f.crearLlave()).simulada, isTrue);
    final r = await f.firmar('abc:123', motivo: 'prueba');
    expect(r.ok, isTrue);
    expect(r.simulada, isTrue);
    expect(r.firma, startsWith('SIMULADA:'));
  });

  test('FirmaConRespaldo cae a la simulada si el chip seguro falla, pero no si el usuario cancela', () async {
    final conFalla = FirmaConRespaldo(
      real: _FirmaQueTruena(),
      respaldo: FirmaSimulada(retardo: Duration.zero),
    );
    expect((await conFalla.firmar('r', motivo: 'm')).simulada, isTrue);
    final cancelada = FirmaConRespaldo(
      real: _FirmaCancelada(),
      respaldo: FirmaSimulada(retardo: Duration.zero),
    );
    final r = await cancelada.firmar('r', motivo: 'm');
    expect(r.cancelada, isTrue);
    expect(r.ok, isFalse);
  });
}

class _FirmaQueTruena extends FirmaSimulada {
  @override
  Future<ResultadoFirma> firmar(String reto, {required String motivo}) => throw Exception('sin Secure Enclave');
}

class _FirmaCancelada extends FirmaSimulada {
  @override
  Future<ResultadoFirma> firmar(String reto, {required String motivo}) async => const ResultadoFirma(cancelada: true);
}

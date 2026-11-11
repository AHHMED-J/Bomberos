// Prueba de contrato contra 4-tercera-version/servidor corriendo de verdad (con `npm run datos-prueba`).
// Se salta si no hay servidor:  SERVIDOR_URL=http://localhost:3100 flutter test test/servidor_contrato_test.dart
import 'dart:io';
import 'dart:typed_data';

import 'package:bomberos_parte/datos/api_cliente.dart';
import 'package:bomberos_parte/datos/datos_ejemplo.dart';
import 'package:bomberos_parte/datos/modelos.dart';
import 'package:bomberos_parte/datos/repositorio_remoto.dart';
import 'package:bomberos_parte/servicios/firma/servicio_firma.dart';
import 'package:bomberos_parte/servicios/grabadora_audio.dart';
import 'package:bomberos_parte/servicios/ia/servicio_llenado_campos.dart';
import 'package:bomberos_parte/servicios/ia/servicio_resumen.dart';
import 'package:bomberos_parte/servicios/ia/servicio_transcripcion.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final url = Platform.environment['SERVIDOR_URL'];
  final skip = url == null ? 'Sin SERVIDOR_URL' : null;
  late ApiCliente api;
  setUp(() => api = ApiCliente(url ?? ''));

  test('IA 1 · transcribir', () async {
    final t = await ServidorTranscripcion(
      api,
    ).transcribir(AudioGrabado(bytes: Uint8List(16), duracion: const Duration(seconds: 12), grabadoEn: DateTime.now()));
    expect(t.texto, isNotEmpty);
    expect(
      () => ServidorTranscripcion(api).transcribir(
        AudioGrabado(bytes: Uint8List(16), duracion: const Duration(milliseconds: 500), grabadoEn: DateTime.now()),
      ),
      throwsA(isA<AudioInvalido>()),
    );
  }, skip: skip);

  test('IA 2 · llenar campos (primero y segundo dictado) y resumen', () async {
    final s = ServidorLlenadoCampos(api);
    final r1 = await s.llenar(transcripcion: 'x', camposActuales: const {});
    expect(r1.de(EstadoIa.falta), isNotEmpty);
    final r2 = await s.llenar(
      transcripcion: 'x',
      camposActuales: const {
        'tipo_servicio': ValorCampo(valor: 'Incendio de pastizal'),
        'hora_llegada': ValorCampo(valor: '14:20'),
      },
    );
    expect(r2.de(EstadoIa.corregido).single.valorAnterior, '14:20');
    expect(
      await ServidorResumen(api).resumir(campos: const {'tipo_servicio': ValorCampo(valor: 'Rescate')}),
      contains('Rescate'),
    );
  }, skip: skip);

  test('Partes · enviar rechaza pendientes y acepta un parte completo firmado', () async {
    final remoto = RemotoHttp(api);
    final firma = FirmaSimulada(retardo: Duration.zero);
    final base = partesServidorEjemplo().first;
    // Quien elabora entra con su número de empleado y su contraseña, y sube su firma en trazo.
    final autor = usuariosEjemplo.firstWhere((u) => u.id == base.elaboroId);
    final dentro = await remoto.entrar(autor.matricula, 'prueba${autor.matricula}');
    expect(dentro.id, autor.id);
    expect((await remoto.guardarTrazo('10.0,40.0 30.0,12.0 55.0,48.0')).trazo, isNotNull);
    var p = Parte.deJson({...base.aJson(), 'folio': await remoto.nuevoFolio(), 'estado': 'enProgreso'});
    p = p.copiar(
      campos: {
        ...p.campos,
        'propietario': const ValorCampo(
          valor: 'X',
          origen: OrigenCampo.dictado,
          estadoIa: EstadoIa.revisar,
          confirmado: false,
        ),
      },
    );
    var reto = await remoto.retoFirma(p);
    var f = (await firma.firmar(reto, motivo: '')).firma!;
    expect(() => remoto.enviar(p, reto: reto, firma: f), throwsA(isA<EnvioRechazado>()));

    p = p.copiar(
      campos: {
        ...p.campos,
        'propietario': const ValorCampo(valor: 'X'),
      },
    );
    reto = await remoto.retoFirma(p);
    f = (await firma.firmar(reto, motivo: '')).firma!;
    p = p.copiar(firmas: p.firmas.copiar(elaboro: f));
    final enviado = await remoto.enviar(p, reto: reto, firma: f);
    expect(enviado.estado, EstadoParte.enviado);
    expect(enviado.firmas.elaboroTrazo, isNotNull);
    expect((await remoto.bandeja(divisionEjemplo)).any((x) => x.folio == p.folio), isTrue);
  }, skip: skip);
}

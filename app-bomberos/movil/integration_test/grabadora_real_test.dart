// Prueba en simulador o iPhone: graba de verdad con el micrófono.
//   xcrun simctl privacy <id> grant microphone mx.edu.uabc.bomberosParte
//   flutter test integration_test/grabadora_real_test.dart -d <id> \
//     --dart-define=SERVIDOR_URL=http://127.0.0.1:3100 --dart-define=CLAVE_LOCAL=…   (opcional: prueba el envío)
import 'dart:io';

import 'package:bomberos_parte/datos/api_cliente.dart';
import 'package:bomberos_parte/servicios/grabadora_audio.dart';
import 'package:bomberos_parte/servicios/grabadora_real.dart';
import 'package:bomberos_parte/servicios/ia/servicio_transcripcion.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('graba m4a real, lo borra del disco y el servidor lo puede leer', (tester) async {
    final g = GrabadoraReal();
    expect(await g.pedirPermiso(), PermisoMicrofono.concedido);

    final niveles = <NivelAudio>[];
    final sub = g.niveles.listen(niveles.add);
    await g.iniciar();
    await Future<void>.delayed(const Duration(seconds: 3));
    final audio = await g.detener();
    await sub.cancel();

    expect(audio.duracion.inMilliseconds, greaterThan(2500));
    expect(audio.bytes.length, greaterThan(1000));
    expect(String.fromCharCodes(audio.bytes.sublist(4, 8)), 'ftyp', reason: 'contenedor MP4/m4a');
    expect(niveles, isNotEmpty, reason: 'la onda recibe niveles');

    final restos = (await getTemporaryDirectory()).listSync().where((f) => f.path.contains('dictado-'));
    expect(restos, isEmpty, reason: 'el audio no queda en disco');

    const url = String.fromEnvironment('SERVIDOR_URL');
    if (url.isEmpty) return;
    String resultado;
    try {
      final t = await ServidorTranscripcion(ApiCliente(url)).transcribir(audio);
      resultado = 'transcrito (${t.texto.length} caracteres)';
    } on AudioInvalido catch (e) {
      resultado = 'AudioInvalido: ${e.motivo}';
    } on ErrorApi catch (e) {
      resultado = 'ErrorApi ${e.codigo}';
    }
    stdout.writeln('RESULTADO_SERVIDOR: $resultado');
    expect(resultado, isNot(contains('No se pudo leer')), reason: 'ffmpeg del servidor debe poder leerlo');
  });
}

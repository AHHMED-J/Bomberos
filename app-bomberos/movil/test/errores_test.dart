import 'dart:async';

import 'package:bomberos_parte/datos/api_cliente.dart';
import 'package:bomberos_parte/dictado/dictado_controlador.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Errores de la IA en palabras claras', () {
    expect(explicarError(ErrorApi(401, {'error': 'sin_autorizacion'})), contains('CLAVE_LOCAL'));
    expect(explicarError(ErrorApi(503, {'error': 'whisper_apagado'})), contains('iniciar.sh'));
    expect(explicarError(TimeoutException('x')), contains('tardó'));
    expect(explicarError(Exception('SocketException: Connection refused')), contains('misma Wi-Fi'));
  });
}

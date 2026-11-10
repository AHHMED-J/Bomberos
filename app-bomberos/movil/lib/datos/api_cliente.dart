import 'dart:convert';

import 'package:http/http.dart' as http;

class ErrorApi implements Exception {
  ErrorApi(this.estado, this.cuerpo);
  final int estado;
  final Map<String, dynamic> cuerpo;

  String get codigo => cuerpo['error'] as String? ?? 'error_$estado';

  @override
  String toString() => 'ErrorApi($estado, $cuerpo)';
}

/// Cliente JSON hacia app-bomberos/servidor. La URL sale de Config.urlServidor.
class ApiCliente {
  ApiCliente(this.urlBase, {http.Client? cliente, this.token}) : _http = cliente ?? http.Client();

  final String urlBase;
  final http.Client _http;

  /// Token de sesión que devuelve /api/acceso/verificar.
  String? token;

  static const _espera = Duration(seconds: 20);

  /// La IA local (Whisper + Ollama en la Mac) puede tardar más, sobre todo la primera vez.
  static const _esperaIa = Duration(seconds: 120);

  /// Clave de la IA local. Sólo llega al compilar: `--dart-define=CLAVE_LOCAL=…`. Nunca se escribe en el código.
  static const _claveLocal = String.fromEnvironment('CLAVE_LOCAL');

  static bool _esIa(String ruta) => ruta.startsWith('/api/ia/');

  Map<String, String> _cabeceras(String ruta) => {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
    if (_esIa(ruta) && _claveLocal.isNotEmpty) 'X-Clave-Local': _claveLocal,
  };

  Future<Map<String, dynamic>> get(String ruta) async {
    final r = await _http
        .get(Uri.parse('$urlBase$ruta'), headers: _cabeceras(ruta))
        .timeout(_esIa(ruta) ? _esperaIa : _espera);
    return _leer(r);
  }

  Future<Map<String, dynamic>> post(String ruta, [Map<String, dynamic>? cuerpo]) async {
    final r = await _http
        .post(Uri.parse('$urlBase$ruta'), headers: _cabeceras(ruta), body: jsonEncode(cuerpo ?? const {}))
        .timeout(_esIa(ruta) ? _esperaIa : _espera);
    return _leer(r);
  }

  Map<String, dynamic> _leer(http.Response r) {
    final cuerpo = r.body.isEmpty ? <String, dynamic>{} : jsonDecode(utf8.decode(r.bodyBytes)) as Map<String, dynamic>;
    if (r.statusCode >= 400) throw ErrorApi(r.statusCode, cuerpo);
    return cuerpo;
  }
}

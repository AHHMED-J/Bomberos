import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';

import '../hoja/validacion_envio.dart';
import '../servicios/firma/servicio_firma.dart';
import 'api_cliente.dart';
import 'datos_ejemplo.dart';
import 'modelos.dart';

/// El servidor rechazó el envío: devuelve qué falta (misma regla que la pantalla).
class EnvioRechazado implements Exception {
  const EnvioRechazado(this.pendientes);
  final List<String> pendientes;
  @override
  String toString() => 'EnvioRechazado($pendientes)';
}

/// Lo que vive en el servidor: usuarios, partes enviados, bandeja y sellos.
abstract interface class RepositorioRemoto {
  /// Datos del código de alta antes de registrar la llave (pantalla A2).
  Future<Usuario> consultarCodigo(String codigo);
  Future<Usuario> alta(String codigo, String llavePublica);
  Future<String> retoAcceso(String usuarioId);
  Future<Usuario> verificarAcceso(String usuarioId, String reto, String firma);

  Future<String> nuevoFolio();
  Future<List<Parte>> misPartes(String usuarioId);
  Future<List<Parte>> bandeja(String division);

  /// Reto = número al azar + ':' + SHA-256 del contenido del parte.
  Future<String> retoFirma(Parte parte);
  Future<Parte> enviar(Parte parte, {required String reto, required String firma});
  Future<Parte> devolver(String folio, {required String nota, required String seccion, required Usuario revisor});
  Future<Parte> validar(
    String folio, {
    required String reto,
    required String firma,
    required String trazo,
    required Usuario revisor,
  });
}

/// Servidor de mentira dentro de la app. Comparte estado entre roles para la demo.
class RemotoFalso implements RepositorioRemoto {
  RemotoFalso({this.retardo = const Duration(milliseconds: 350)}) {
    for (final p in partesServidorEjemplo()) {
      _partes[p.folio] = p;
    }
  }
  final Duration retardo;
  final _partes = <String, Parte>{};
  final _rnd = Random();
  int _folio = 153;

  Future<void> _espera() => Future<void>.delayed(retardo);

  @override
  Future<Usuario> consultarCodigo(String codigo) async {
    await _espera();
    if (codigo.trim().length != 5) throw ErrorApi(404, {'error': 'codigo_invalido'});
    return usuarioEditor;
  }

  @override
  Future<Usuario> alta(String codigo, String llavePublica) async => consultarCodigo(codigo);

  @override
  Future<String> retoAcceso(String usuarioId) async {
    await _espera();
    return '${_azar()}:acceso';
  }

  @override
  Future<Usuario> verificarAcceso(String usuarioId, String reto, String firma) async {
    await _espera();
    return usuariosEjemplo.firstWhere((u) => u.id == usuarioId, orElse: () => usuarioEditorPrincipal);
  }

  @override
  Future<String> nuevoFolio() async => 'PE-2026-${(_folio++).toString().padLeft(4, '0')}';

  @override
  Future<List<Parte>> misPartes(String usuarioId) async {
    await _espera();
    return _partes.values.where((p) => p.elaboroId == usuarioId).toList()
      ..sort((a, b) => b.creadoEn.compareTo(a.creadoEn));
  }

  @override
  Future<List<Parte>> bandeja(String division) async {
    await _espera();
    return _partes.values.where((p) => p.division == division).toList()
      ..sort((a, b) => (b.enviadoEn ?? b.creadoEn).compareTo(a.enviadoEn ?? a.creadoEn));
  }

  @override
  Future<String> retoFirma(Parte parte) async {
    await _espera();
    return '${_azar()}:${hashContenido(parte.contenidoParaFirmar())}';
  }

  @override
  Future<Parte> enviar(Parte parte, {required String reto, required String firma}) async {
    await _espera();
    // Mismo filtro que el servidor real: nada sin confirmar, nada obligatorio vacío.
    final faltan = pendientesParaEnviar(parte.copiar(firmas: parte.firmas.copiar(elaboro: firma)));
    if (faltan.isNotEmpty) throw EnvioRechazado([for (final f in faltan) f.mensaje]);
    if (reto.split(':').last != hashContenido(parte.contenidoParaFirmar())) {
      throw const EnvioRechazado(['El contenido cambió después de firmar']);
    }
    final enviado = parte.copiar(estado: EstadoParte.enviado, enviadoEn: DateTime.now(), quitarNota: true);
    _partes[parte.folio] = enviado;
    return enviado;
  }

  @override
  Future<Parte> devolver(
    String folio, {
    required String nota,
    required String seccion,
    required Usuario revisor,
  }) async {
    await _espera();
    final p = _partes[folio]!;
    final r = p.copiar(
      estado: EstadoParte.devuelto,
      nota: NotaDevolucion(texto: nota, seccion: seccion, revisor: revisor.nombre, fecha: DateTime.now()),
    );
    _partes[folio] = r;
    return r;
  }

  @override
  Future<Parte> validar(
    String folio, {
    required String reto,
    required String firma,
    required String trazo,
    required Usuario revisor,
  }) async {
    await _espera();
    final p = _partes[folio]!;
    // Sello = SHA-256 del contenido + firma del revisor (credencial y trazo).
    final sello = sha256
        .convert(utf8.encode(jsonEncode({'contenido': p.contenidoParaFirmar(), 'firma': firma, 'trazo': trazo})))
        .toString();
    final r = p.copiar(estado: EstadoParte.validado, sello: sello);
    _partes[folio] = r;
    return r;
  }

  String _azar() => List.generate(16, (_) => _rnd.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
}

/// Habla con app-bomberos/servidor (Express). Mismas operaciones, en JSON.
class RemotoHttp implements RepositorioRemoto {
  RemotoHttp(this.api);
  final ApiCliente api;

  Usuario _usuario(Map<String, dynamic> j) => Usuario(
    id: j['id'] as String,
    nombre: j['nombre'] as String,
    matricula: j['matricula'] as String,
    rango: j['rango'] as String,
    rol: Rol.values.byName(j['rol'] as String),
    division: j['division'] as String,
    estacion: j['estacion'] as String,
  );

  List<Parte> _lista(Map<String, dynamic> r) => [
    for (final p in r['partes'] as List) Parte.deJson(p as Map<String, dynamic>),
  ];

  @override
  Future<Usuario> consultarCodigo(String codigo) async =>
      _usuario((await api.get('/api/acceso/codigo/${Uri.encodeComponent(codigo)}'))['usuario'] as Map<String, dynamic>);

  @override
  Future<Usuario> alta(String codigo, String llavePublica) async => _usuario(
    (await api.post('/api/acceso/alta', {'codigo': codigo, 'llave_publica': llavePublica}))['usuario']
        as Map<String, dynamic>,
  );

  @override
  Future<String> retoAcceso(String usuarioId) async =>
      (await api.post('/api/acceso/reto', {'usuario_id': usuarioId}))['reto'] as String;

  @override
  Future<Usuario> verificarAcceso(String usuarioId, String reto, String firma) async {
    final r = await api.post('/api/acceso/verificar', {'usuario_id': usuarioId, 'reto': reto, 'firma': firma});
    api.token = r['token'] as String?;
    return _usuario(r['usuario'] as Map<String, dynamic>);
  }

  @override
  Future<String> nuevoFolio() async => (await api.post('/api/partes/folio'))['folio'] as String;

  @override
  Future<List<Parte>> misPartes(String usuarioId) async => _lista(await api.get('/api/partes?usuario=$usuarioId'));

  @override
  Future<List<Parte>> bandeja(String division) async =>
      _lista(await api.get('/api/revision/bandeja?division=${Uri.encodeComponent(division)}'));

  @override
  Future<String> retoFirma(Parte parte) async =>
      (await api.post('/api/partes/${parte.folio}/reto', {'contenido': parte.contenidoParaFirmar()}))['reto'] as String;

  @override
  Future<Parte> enviar(Parte parte, {required String reto, required String firma}) async {
    try {
      final r = await api.post('/api/partes/${parte.folio}/enviar', {
        'parte': parte.aJson(),
        'reto': reto,
        'firma': firma,
      });
      return Parte.deJson(r['parte'] as Map<String, dynamic>);
    } on ErrorApi catch (e) {
      if (e.estado == 422) throw EnvioRechazado([for (final x in (e.cuerpo['pendientes'] as List? ?? [])) '$x']);
      rethrow;
    }
  }

  @override
  Future<Parte> devolver(
    String folio, {
    required String nota,
    required String seccion,
    required Usuario revisor,
  }) async => Parte.deJson(
    (await api.post('/api/revision/$folio/devolver', {
          'nota': nota,
          'seccion': seccion,
          'revisor_id': revisor.id,
        }))['parte']
        as Map<String, dynamic>,
  );

  @override
  Future<Parte> validar(
    String folio, {
    required String reto,
    required String firma,
    required String trazo,
    required Usuario revisor,
  }) async => Parte.deJson(
    (await api.post('/api/revision/$folio/validar', {
          'reto': reto,
          'firma': firma,
          'trazo': trazo,
          'revisor_id': revisor.id,
        }))['parte']
        as Map<String, dynamic>,
  );
}

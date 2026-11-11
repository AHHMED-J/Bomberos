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

/// Texto para la persona a partir del código de error del servidor.
String mensajeDeError(Object e) {
  if (e is! ErrorApi) return '$e';
  return switch (e.codigo) {
    'credenciales_incorrectas' => 'Número de empleado o contraseña incorrectos',
    'contrasena_incorrecta' => 'Contraseña incorrecta',
    'contrasena_corta' => 'La contraseña nueva debe tener al menos 8 caracteres',
    'falta_trazo' => 'Primero sube tu firma en Mi cuenta',
    'ya_tiene_celular' => 'Tu cuenta ya tiene un celular registrado',
    'ya_enviado' => 'Este parte ya se envió',
    'contenido_cambio' => 'El parte cambió después de confirmar; inténtalo de nuevo',
    'no_espera_revision' => 'Este parte no está esperando revisión',
    'no_es_revisor' => 'Dirección no te ha habilitado para revisar',
    'es_su_parte' => 'No puedes revisar un parte que llenaste tú',
    'otra_division' => 'Este parte es de otra división',
    'firma_invalida' || 'sin_llave_publica' => 'No se reconoció la biometría de este celular; usa tu contraseña',
    'reto_usado' || 'reto_vencido' || 'reto_desconocido' => 'La confirmación venció; inténtalo de nuevo',
    'sin_sesion' => 'Tu sesión terminó; vuelve a entrar',
    _ => 'El servidor contestó: ${e.codigo}',
  };
}

/// Lo que vive en el servidor: usuarios, partes enviados, bandeja y sellos.
abstract interface class RepositorioRemoto {
  /// Entrada con el usuario (número de empleado) y la contraseña que entrega Dirección.
  Future<Usuario> entrar(String noEmpleado, String contrasena);

  /// Registra la llave pública del chip seguro de este celular (uno por usuario).
  Future<void> registrarLlave(String llavePublica);
  Future<void> cambiarContrasena({required String actual, required String nueva});

  /// Sube o actualiza la firma en trazo del usuario. Devuelve al usuario ya con ella.
  Future<Usuario> guardarTrazo(String trazo);

  /// Entrada con la biometría: el servidor manda un reto y el celular lo firma con su llave.
  Future<String> retoAcceso(String usuarioId);
  Future<Usuario> verificarAcceso(String usuarioId, String reto, String firma);

  Future<String> nuevoFolio();
  Future<List<Parte>> misPartes(String usuarioId);
  Future<List<Parte>> bandeja(String division);

  /// Reto = número al azar + ':' + SHA-256 del contenido del parte.
  Future<String> retoFirma(Parte parte);

  /// Quien firma confirma que es él con [firma] (biometría: la llave del celular firmó el reto) o con
  /// [contrasena]. El servidor pone en el parte la firma en trazo que el usuario tiene en su cuenta.
  Future<Parte> enviar(Parte parte, {required String reto, String? firma, String? contrasena});
  Future<Parte> devolver(String folio, {required String nota, required String seccion, required Usuario revisor});
  Future<Parte> validar(
    String folio, {
    required String reto,
    String? firma,
    String? contrasena,
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
  final _trazos = <String, String>{};
  final _rnd = Random();
  int _folio = 153;

  /// Quién entró la última vez (para registrarLlave y guardarTrazo).
  Usuario? _actual;

  Future<void> _espera() => Future<void>.delayed(retardo);

  Usuario _conTrazo(Usuario u) => _trazos[u.id] == null ? u : u.copiar(trazo: _trazos[u.id]);

  /// Acepta a los usuarios de ejemplo por su matrícula, con cualquier contraseña que no esté vacía.
  @override
  Future<Usuario> entrar(String noEmpleado, String contrasena) async {
    await _espera();
    final u = usuariosEjemplo.where((u) => u.matricula == noEmpleado.trim()).firstOrNull;
    if (u == null || contrasena.isEmpty) throw ErrorApi(401, {'error': 'credenciales_incorrectas'});
    return _actual = _conTrazo(u);
  }

  @override
  Future<void> registrarLlave(String llavePublica) async => _espera();

  @override
  Future<void> cambiarContrasena({required String actual, required String nueva}) async {
    await _espera();
    if (nueva.length < 8) throw ErrorApi(400, {'error': 'contrasena_corta'});
  }

  @override
  Future<Usuario> guardarTrazo(String trazo) async {
    await _espera();
    final u = _actual ?? usuarioEditorPrincipal;
    _trazos[u.id] = trazo;
    return _actual = u.copiar(trazo: trazo);
  }

  @override
  Future<String> retoAcceso(String usuarioId) async {
    await _espera();
    return '${_azar()}:acceso';
  }

  @override
  Future<Usuario> verificarAcceso(String usuarioId, String reto, String firma) async {
    await _espera();
    final u = usuariosEjemplo.firstWhere((u) => u.id == usuarioId, orElse: () => usuarioEditorPrincipal);
    return _actual = _conTrazo(u);
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
  Future<Parte> enviar(Parte parte, {required String reto, String? firma, String? contrasena}) async {
    await _espera();
    final confirmacion = firma ?? (contrasena == null ? null : 'contrasena');
    // Mismo filtro que el servidor real: nada sin confirmar, nada obligatorio vacío.
    final faltan = pendientesParaEnviar(parte.copiar(firmas: parte.firmas.copiar(elaboro: confirmacion)));
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
    String? firma,
    String? contrasena,
    required Usuario revisor,
  }) async {
    await _espera();
    final p = _partes[folio]!;
    // Sello = SHA-256 del contenido + la confirmación y el trazo del revisor.
    final sello = sha256
        .convert(
          utf8.encode(
            jsonEncode({
              'contenido': p.contenidoParaFirmar(),
              'firma': firma ?? 'contrasena',
              'trazo': _trazos[revisor.id] ?? revisor.trazo,
            }),
          ),
        )
        .toString();
    final r = p.copiar(estado: EstadoParte.validado, sello: sello);
    _partes[folio] = r;
    return r;
  }

  String _azar() => List.generate(16, (_) => _rnd.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
}

/// Habla con app-bomberos/servidor (Express + MySQL). Mismas operaciones, en JSON.
class RemotoHttp implements RepositorioRemoto {
  RemotoHttp(this.api);
  final ApiCliente api;

  Usuario _usuario(Map<String, dynamic> r) => Usuario.deJson(r['usuario'] as Map<String, dynamic>);

  List<Parte> _lista(Map<String, dynamic> r) => [
    for (final p in r['partes'] as List) Parte.deJson(p as Map<String, dynamic>),
  ];

  /// La confirmación viaja como «firma» (biometría) o como «contrasena»; nunca las dos.
  Map<String, dynamic> _confirmacion(String? firma, String? contrasena) => {
    if (firma != null) 'firma': firma else 'contrasena': contrasena,
  };

  @override
  Future<Usuario> entrar(String noEmpleado, String contrasena) async {
    final r = await api.post('/api/acceso/entrar', {'no_empleado': noEmpleado.trim(), 'contrasena': contrasena});
    api.token = r['token'] as String?;
    return _usuario(r);
  }

  @override
  Future<void> registrarLlave(String llavePublica) async {
    await api.post('/api/acceso/llave', {'llave_publica': llavePublica});
  }

  @override
  Future<void> cambiarContrasena({required String actual, required String nueva}) async {
    await api.post('/api/acceso/contrasena', {'actual': actual, 'nueva': nueva});
  }

  @override
  Future<Usuario> guardarTrazo(String trazo) async => _usuario(await api.post('/api/acceso/trazo', {'trazo': trazo}));

  @override
  Future<String> retoAcceso(String usuarioId) async =>
      (await api.post('/api/acceso/reto', {'usuario_id': usuarioId}))['reto'] as String;

  @override
  Future<Usuario> verificarAcceso(String usuarioId, String reto, String firma) async {
    final r = await api.post('/api/acceso/verificar', {'usuario_id': usuarioId, 'reto': reto, 'firma': firma});
    api.token = r['token'] as String?;
    return _usuario(r);
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
  Future<Parte> enviar(Parte parte, {required String reto, String? firma, String? contrasena}) async {
    try {
      final r = await api.post('/api/partes/${parte.folio}/enviar', {
        'parte': parte.aJson(),
        'reto': reto,
        ..._confirmacion(firma, contrasena),
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
    String? firma,
    String? contrasena,
    required Usuario revisor,
  }) async => Parte.deJson(
    (await api.post('/api/revision/$folio/validar', {
          'reto': reto,
          'revisor_id': revisor.id,
          ..._confirmacion(firma, contrasena),
        }))['parte']
        as Map<String, dynamic>,
  );
}

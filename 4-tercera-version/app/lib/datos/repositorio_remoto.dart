import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

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
    'falta_trazo' => 'Primero guarda tu firma en Mi cuenta',
    'trazo_invalido' => 'La firma no es válida; dibújala de nuevo',
    'ya_tiene_celular' => 'Tu cuenta ya tiene un celular registrado',
    'ya_enviado' => 'Este parte ya se envió',
    'no_es_su_parte' => 'Ese parte es de otra persona',
    'no_es_tu_cuenta' => 'Esa petición no es de tu cuenta',
    'sin_permiso' => 'No tienes permiso para ver eso',
    'formato_no_valido' => 'La imagen debe ser JPEG o PNG',
    'imagen_muy_grande' => 'La imagen pesa demasiado (máximo 8 MB)',
    'demasiados_adjuntos' => 'Demasiadas imágenes en este parte',
    'adjunto_faltante' => 'Falta subir una imagen; inténtalo de nuevo',
    'fotos_no_coinciden' => 'El número de fotos no coincide con las imágenes subidas',
    'hash_no_coincide' => 'La imagen se dañó al subirla; inténtalo de nuevo',
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

  /// Sube o actualiza la firma en trazo del usuario. Pide su contraseña: así una sesión ajena no puede
  /// poner otra firma. Devuelve al usuario ya con ella.
  Future<Usuario> guardarTrazo(String trazo, {required String contrasena});

  /// Los avisos de quien tiene la sesión (los últimos 50, de nuevos a viejos). [usuarioId] sólo lo usa el
  /// servidor falso: el real sabe quién es por la sesión.
  Future<List<Notificacion>> notificaciones(String usuarioId);
  Future<void> marcarAvisoLeido(int id, {required String usuarioId});
  Future<void> marcarAvisosLeidos({required String usuarioId});

  /// Entrada con la biometría: el servidor manda un reto y el celular lo firma con su llave.
  Future<String> retoAcceso(String usuarioId);
  Future<Usuario> verificarAcceso(String usuarioId, String reto, String firma);

  Future<String> nuevoFolio();

  /// Sube una foto o el croquis (JPEG o PNG) antes de enviar el parte. [sha256] es el hash de [bytes]; el
  /// servidor lo comprueba. Subir lo mismo dos veces no estorba.
  Future<void> subirAdjunto(String folio, {required String tipo, required String sha256, required Uint8List bytes});

  /// Baja una imagen del parte: la de quien lo elaboró y la de los capitanes de su división.
  Future<Uint8List> leerAdjunto(String folio, String sha256);
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
  Future<Usuario> guardarTrazo(String trazo, {required String contrasena}) async {
    await _espera();
    if (contrasena.isEmpty) throw ErrorApi(401, {'error': 'contrasena_incorrecta'});
    final u = _actual ?? usuarioEditorPrincipal;
    _trazos[u.id] = trazo;
    _avisar(u.id, TipoAviso.firmaCambiada, 'Guardaste tu firma', 'Si no fuiste tú, avisa a Dirección.');
    return _actual = u.copiar(trazo: trazo);
  }

  // ---- Avisos (el servidor falso los reparte igual que el real) ----
  final _avisos = <String, List<Notificacion>>{};
  int _idAviso = 0;

  void _avisar(String usuarioId, TipoAviso tipo, String titulo, String texto, {String? folio}) =>
      (_avisos[usuarioId] ??= []).insert(
        0,
        Notificacion(id: ++_idAviso, tipo: tipo, titulo: titulo, texto: texto, creadaEn: DateTime.now(), folio: folio),
      );

  @override
  Future<List<Notificacion>> notificaciones(String usuarioId) async {
    await _espera();
    return List.of(_avisos[usuarioId] ?? const []);
  }

  @override
  Future<void> marcarAvisoLeido(int id, {required String usuarioId}) async {
    final l = _avisos[usuarioId];
    if (l == null) return;
    _avisos[usuarioId] = [for (final n in l) n.id == id ? n.copiar(leida: true) : n];
  }

  @override
  Future<void> marcarAvisosLeidos({required String usuarioId}) async {
    _avisos[usuarioId] = [for (final n in _avisos[usuarioId] ?? const <Notificacion>[]) n.copiar(leida: true)];
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

  final _imagenes = <String, Uint8List>{};

  @override
  Future<void> subirAdjunto(
    String folio, {
    required String tipo,
    required String sha256,
    required Uint8List bytes,
  }) async {
    await _espera();
    _imagenes['$folio/$sha256'] = bytes;
  }

  @override
  Future<Uint8List> leerAdjunto(String folio, String sha256) async {
    await _espera();
    return _imagenes['$folio/$sha256'] ?? (throw ErrorApi(404, {'error': 'no_existe'}));
  }

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
    // Como el servidor real: las imágenes que firmó tienen que haberse subido.
    for (final a in parte.adjuntos) {
      if (!_imagenes.containsKey('${parte.folio}/${a.sha256}')) {
        throw ErrorApi(422, {'error': 'adjunto_faltante'});
      }
    }
    // Mismo filtro que el servidor real: nada sin confirmar, nada obligatorio vacío.
    final faltan = pendientesParaEnviar(parte.copiar(firmas: parte.firmas.copiar(elaboro: confirmacion)));
    if (faltan.isNotEmpty) throw EnvioRechazado([for (final f in faltan) f.mensaje]);
    if (reto.split(':').last != hashContenido(parte.contenidoParaFirmar())) {
      throw const EnvioRechazado(['El contenido cambió después de firmar']);
    }
    final enviado = parte.copiar(estado: EstadoParte.enviado, enviadoEn: DateTime.now(), quitarNota: true);
    _partes[parte.folio] = enviado;
    for (final c in usuariosEjemplo.where((u) => u.rol == Rol.capitan && u.division == parte.division)) {
      _avisar(
        c.id,
        TipoAviso.partePorRevisar,
        'Parte por revisar',
        '${parte.elaboroNombre} envió el parte ${parte.folio}.',
        folio: parte.folio,
      );
    }
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
    _avisar(
      p.elaboroId,
      TipoAviso.parteDevuelto,
      'Parte devuelto',
      '${revisor.nombre} devolvió $folio: $nota',
      folio: folio,
    );
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
    _avisar(
      p.elaboroId,
      TipoAviso.parteValidado,
      'Parte validado',
      '${revisor.nombre} validó $folio. Ya está en Administración.',
      folio: folio,
    );
    return r;
  }

  String _azar() => List.generate(16, (_) => _rnd.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
}

/// Habla con 4-tercera-version/servidor (Express + MySQL). Mismas operaciones, en JSON.
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
  Future<Usuario> guardarTrazo(String trazo, {required String contrasena}) async =>
      _usuario(await api.post('/api/acceso/trazo', {'trazo': trazo, 'contrasena': contrasena}));

  @override
  Future<List<Notificacion>> notificaciones(String usuarioId) async => [
    for (final n in (await api.get('/api/notificaciones'))['notificaciones'] as List)
      Notificacion.deJson(n as Map<String, dynamic>),
  ];

  @override
  Future<void> marcarAvisoLeido(int id, {required String usuarioId}) async {
    await api.post('/api/notificaciones/$id/leida');
  }

  @override
  Future<void> marcarAvisosLeidos({required String usuarioId}) async {
    await api.post('/api/notificaciones/leidas');
  }

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
  Future<void> subirAdjunto(
    String folio, {
    required String tipo,
    required String sha256,
    required Uint8List bytes,
  }) async {
    await api.post('/api/partes/$folio/adjuntos', {'tipo': tipo, 'sha256': sha256, 'datos': base64Encode(bytes)});
  }

  @override
  Future<Uint8List> leerAdjunto(String folio, String sha256) => api.getBytes('/api/partes/$folio/adjuntos/$sha256');

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

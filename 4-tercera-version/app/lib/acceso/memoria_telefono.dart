import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

import '../datos/modelos.dart';

/// Recuerda entre aperturas qué usuario ya entró con su contraseña en este teléfono, para ofrecerle
/// entrar con la biometría. No guarda contraseñas ni tokens.
abstract class MemoriaTelefono {
  Future<Usuario?> leer();
  Future<void> guardar(Usuario usuario);
}

/// En la carpeta de la app (telefono.json).
class MemoriaTelefonoArchivo implements MemoriaTelefono {
  Future<File> _archivo() async => File('${(await getApplicationDocumentsDirectory()).path}/telefono.json');

  @override
  Future<Usuario?> leer() async {
    try {
      final archivo = await _archivo();
      if (!await archivo.exists()) return null;
      return Usuario.deJson(jsonDecode(await archivo.readAsString()) as Map<String, dynamic>);
    } catch (e) {
      debugPrint('No se pudo leer telefono.json ($e)');
      return null;
    }
  }

  @override
  Future<void> guardar(Usuario usuario) async {
    try {
      // El trazo no hace falta aquí: llega del servidor cada vez que entra.
      final sinTrazo = usuario.aJson()..remove('trazo');
      await (await _archivo()).writeAsString(jsonEncode(sinTrazo));
    } catch (e) {
      debugPrint('No se pudo guardar telefono.json ($e)');
    }
  }
}

/// Para las pruebas: no toca archivos.
class MemoriaTelefonoMemoria implements MemoriaTelefono {
  MemoriaTelefonoMemoria([this._usuario]);
  Usuario? _usuario;

  @override
  Future<Usuario?> leer() async => _usuario;

  @override
  Future<void> guardar(Usuario usuario) async => _usuario = usuario;
}

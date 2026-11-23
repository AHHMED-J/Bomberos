import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

import '../servicios/grabadora_audio.dart';
import 'modelos.dart';

/// Audio que se grabó sin señal: espera en el teléfono hasta que vuelva la conexión.
class AudioPendiente {
  const AudioPendiente({required this.id, required this.parteId, required this.audio});
  final int id;
  final String parteId;
  final AudioGrabado audio;
}

/// Lo que vive SÓLO en el teléfono: partes en progreso y audios por enviar.
abstract interface class RepositorioLocal {
  Future<List<Parte>> partes();
  Future<Parte?> parte(String id);
  Future<void> guardar(Parte parte);
  Future<void> borrar(String id);

  Future<int> guardarAudio(String parteId, AudioGrabado audio);
  Future<List<AudioPendiente>> audiosPendientes();

  /// Se llama apenas se transcribe: el audio no se conserva.
  Future<void> borrarAudio(int id);
}

/// Lee un parte guardado. Si no se puede (formato viejo o dañado) devuelve null y lo avisa,
/// en vez de tumbar todo el almacenamiento local. No imprime el contenido: puede traer datos personales.
Parte? leerParteGuardado(Object? json) {
  try {
    return Parte.deJson(jsonDecode(json as String) as Map<String, dynamic>);
  } catch (e) {
    debugPrint('Se saltó un parte guardado que no se pudo leer (${e.runtimeType}).');
    return null;
  }
}

/// SQLite con sqflite. El parte completo va como JSON; las columnas sueltas sirven para listar y
/// para el experimento A/B (modo y tiempo activo).
class RepositorioSqlite implements RepositorioLocal {
  RepositorioSqlite._(this._db);
  final Database _db;

  static Future<RepositorioSqlite> abrir() async {
    final ruta = p.join(await getDatabasesPath(), 'parte_digital.db');
    final db = await openDatabase(
      ruta,
      version: 1,
      onCreate: (db, _) async {
        await db.execute('''
        CREATE TABLE parte_local (
          id TEXT PRIMARY KEY,
          folio TEXT NOT NULL,
          estado TEXT NOT NULL,
          modo TEXT NOT NULL,          -- teclado | dictado (experimento A/B)
          seg_activo INTEGER NOT NULL, -- tiempo activo, huecos > 30 s cuentan 30 s
          actualizado_en TEXT NOT NULL,
          json TEXT NOT NULL
        )''');
        await db.execute('''
        CREATE TABLE audio_pendiente (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parte_id TEXT NOT NULL,
          formato TEXT NOT NULL,
          duracion_ms INTEGER NOT NULL,
          grabado_en TEXT NOT NULL,
          bytes BLOB NOT NULL
        )''');
      },
    );
    return RepositorioSqlite._(db);
  }

  @override
  Future<List<Parte>> partes() async {
    final filas = await _db.query('parte_local', orderBy: 'actualizado_en DESC');
    final out = <Parte>[];
    for (final f in filas) {
      final p = leerParteGuardado(f['json']);
      if (p != null) out.add(p);
    }
    return out;
  }

  @override
  Future<Parte?> parte(String id) async {
    final f = await _db.query('parte_local', where: 'id = ?', whereArgs: [id]);
    return f.isEmpty ? null : leerParteGuardado(f.first['json']);
  }

  @override
  Future<void> guardar(Parte parte) => _db.insert('parte_local', {
    'id': parte.id,
    'folio': parte.folio,
    'estado': parte.estado.name,
    'modo': parte.modo.name,
    'seg_activo': parte.segActivo,
    'actualizado_en': DateTime.now().toIso8601String(),
    'json': jsonEncode(parte.aJson()),
  }, conflictAlgorithm: ConflictAlgorithm.replace);

  @override
  Future<void> borrar(String id) => _db.delete('parte_local', where: 'id = ?', whereArgs: [id]);

  @override
  Future<int> guardarAudio(String parteId, AudioGrabado audio) => _db.insert('audio_pendiente', {
    'parte_id': parteId,
    'formato': audio.formato,
    'duracion_ms': audio.duracion.inMilliseconds,
    'grabado_en': audio.grabadoEn.toIso8601String(),
    'bytes': audio.bytes,
  });

  @override
  Future<List<AudioPendiente>> audiosPendientes() async {
    final filas = await _db.query('audio_pendiente', orderBy: 'id');
    return [
      for (final f in filas)
        AudioPendiente(
          id: f['id'] as int,
          parteId: f['parte_id'] as String,
          audio: AudioGrabado(
            bytes: f['bytes'] as Uint8List,
            duracion: Duration(milliseconds: f['duracion_ms'] as int),
            formato: f['formato'] as String,
            grabadoEn: DateTime.parse(f['grabado_en'] as String),
          ),
        ),
    ];
  }

  @override
  Future<void> borrarAudio(int id) => _db.delete('audio_pendiente', where: 'id = ?', whereArgs: [id]);
}

/// En memoria: para pruebas y como valor por defecto si SQLite no abre.
class RepositorioMemoria implements RepositorioLocal {
  RepositorioMemoria([List<Parte> iniciales = const []]) {
    for (final p in iniciales) {
      _partes[p.id] = p;
    }
  }
  final _partes = <String, Parte>{};
  final _audios = <int, AudioPendiente>{};
  int _sig = 1;

  @override
  Future<List<Parte>> partes() async => _partes.values.toList().reversed.toList();
  @override
  Future<Parte?> parte(String id) async => _partes[id];
  @override
  Future<void> guardar(Parte parte) async => _partes[parte.id] = parte;
  @override
  Future<void> borrar(String id) async => _partes.remove(id);
  @override
  Future<int> guardarAudio(String parteId, AudioGrabado audio) async {
    final id = _sig++;
    _audios[id] = AudioPendiente(id: id, parteId: parteId, audio: audio);
    return id;
  }

  @override
  Future<List<AudioPendiente>> audiosPendientes() async => _audios.values.toList();
  @override
  Future<void> borrarAudio(int id) async => _audios.remove(id);
}

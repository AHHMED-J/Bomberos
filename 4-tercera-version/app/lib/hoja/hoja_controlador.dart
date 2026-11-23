import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../datos/modelos.dart';
import '../servicios/ia/servicio_llenado_campos.dart';
import '../servicios/proveedores.dart';

String _dosDigitos(int n) => n.toString().padLeft(2, '0');
String horaDe(DateTime t) => '${_dosDigitos(t.hour)}:${_dosDigitos(t.minute)}';
String fechaDe(DateTime t) => '${_dosDigitos(t.day)}/${_dosDigitos(t.month)}/${t.year}';

/// Una foto o el croquis que el parte nombra pero ya no está en este teléfono.
class ImagenFaltante implements Exception {
  const ImagenFaltante(this.que);
  final String que;
  @override
  String toString() => 'Falta $que en este teléfono. Quítala o vuelve a tomarla.';
}

String sha256Hex(Uint8List bytes) => sha256.convert(bytes).toString();

/// El parte abierto en la Hoja. Cada cambio se guarda en SQLite si está en progreso o devuelto.
class HojaControlador extends Notifier<Parte?> {
  /// Reloj inyectable para las pruebas del tiempo activo.
  DateTime Function() reloj = DateTime.now;

  @override
  Parte? build() => null;

  void abrir(Parte p) => state = p;
  void cerrar() => state = null;

  Future<Parte> nuevo(Usuario u) async {
    final ahora = reloj();
    final folio = await _folioOProvisional(ahora);
    ValorCampo auto(String v) => ValorCampo(valor: v, origen: OrigenCampo.auto);
    final p = Parte(
      id: 'loc-${ahora.microsecondsSinceEpoch}',
      folio: folio,
      estado: EstadoParte.enProgreso,
      elaboroId: u.id,
      elaboroNombre: u.nombre,
      division: u.division,
      creadoEn: ahora,
      modo: ref.read(configProvider).modoNuevoParte,
      ultimaActividad: ahora,
      campos: {
        'fecha': auto(fechaDe(ahora)),
        'unidad': auto('Pipa 04'),
        'turno': auto('A'),
        'hora_salida': ValorCampo(valor: horaDe(ahora)),
      },
    );
    state = p;
    await _guardar();
    return p;
  }

  bool get editable {
    final e = state?.estado;
    return e == EstadoParte.enProgreso || e == EstadoParte.devuelto;
  }

  void _actualizar(Parte Function(Parte) f) {
    final p = state;
    if (p == null || !editable) return;
    state = f(p).conActividad(reloj());
    _guardar();
  }

  /// El folio real si hay señal; si no, uno provisional del teléfono para poder empezar sin internet.
  Future<String> _folioOProvisional(DateTime ahora) async {
    if (!ref.read(enLineaProvider)) return folioProvisional(ahora);
    try {
      return await ref.read(repositorioRemotoProvider).nuevoFolio();
    } catch (_) {
      // Se cayó la red a medio camino: igual se puede empezar.
      return folioProvisional(ahora);
    }
  }

  /// Cambia el folio provisional por el real del servidor (antes de firmar y enviar). Devuelve el parte.
  Future<Parte> asegurarFolioReal() async {
    final p = state!;
    if (!esFolioProvisional(p.folio)) return p;
    final folio = await ref.read(repositorioRemotoProvider).nuevoFolio();
    state = p.copiar(folio: folio);
    await _guardar();
    return state!;
  }

  /// Antes de firmar: saca el SHA-256 del croquis y de cada foto y los deja en el parte, para que el reto (y con
  /// él la firma y el sello) cubra las imágenes. Sin archivos en el teléfono (partes de ejemplo) no hay nada
  /// que cubrir y el parte queda como estaba. Devuelve el parte.
  Future<Parte> prepararAdjuntos() async {
    final p = state!;
    final adjuntos = <Adjunto>[];
    final croquis = p.croquisPng;
    if (croquis != null) {
      final bytes = await ref.read(almacenCroquisProvider).leer(croquis);
      if (bytes == null) throw const ImagenFaltante('el croquis');
      adjuntos.add(Adjunto(tipo: Adjunto.croquis, sha256: sha256Hex(bytes), ruta: croquis));
    }
    for (final ruta in p.fotosRutas) {
      final bytes = await ref.read(almacenFotosProvider).leer(ruta);
      if (bytes == null) throw const ImagenFaltante('una foto');
      adjuntos.add(Adjunto(tipo: Adjunto.foto, sha256: sha256Hex(bytes), ruta: ruta));
    }
    state = p.copiar(adjuntos: adjuntos, fotos: p.fotosRutas.isEmpty ? p.fotos : p.fotosRutas.length);
    await _guardar();
    return state!;
  }

  /// Sube al servidor las imágenes de [p] (la lista que dejó [prepararAdjuntos]), antes de enviar el parte.
  Future<void> subirAdjuntos(Parte p) async {
    final remoto = ref.read(repositorioRemotoProvider);
    for (final a in p.adjuntos) {
      final ruta = a.ruta;
      if (ruta == null) continue;
      final bytes = a.tipo == Adjunto.croquis
          ? await ref.read(almacenCroquisProvider).leer(ruta)
          : await ref.read(almacenFotosProvider).leer(ruta);
      if (bytes == null) throw ImagenFaltante(a.tipo == Adjunto.croquis ? 'el croquis' : 'una foto');
      await remoto.subirAdjunto(p.folio, tipo: a.tipo, sha256: a.sha256, bytes: bytes);
    }
  }

  Future<void> _guardar() async {
    final p = state;
    if (p == null) return;
    await ref.read(repositorioLocalProvider).guardar(p);
  }

  // ---------- Edición a mano ----------

  /// Escribir a mano confirma el campo y quita la marca de la IA.
  void escribir(String campoId, String valor) => _actualizar(
    (p) => p.copiar(
      campos: {
        ...p.campos,
        campoId: ValorCampo(valor: valor, origen: OrigenCampo.manual, confirmado: true),
      },
    ),
  );

  /// Una foto nueva, ya guardada en el teléfono. Si el parte traía fotos de ejemplo sin archivo, `fotos` pasa
  /// a ser cuántas hay de verdad.
  void agregarFoto(String ruta) =>
      _actualizar((p) => p.copiar(fotosRutas: [...p.fotosRutas, ruta], fotos: p.fotosRutas.length + 1));

  /// Quita una foto del parte y borra su archivo.
  void quitarFoto(String ruta) {
    _actualizar((p) {
      final rutas = [
        for (final r in p.fotosRutas)
          if (r != ruta) r,
      ];
      return p.copiar(fotosRutas: rutas, fotos: rutas.length);
    });
    ref.read(almacenFotosProvider).borrar(ruta);
  }

  void croquis(String rutaPng) => _actualizar((p) => p.copiar(croquisPng: rutaPng));
  void firmas(Firmas Function(Firmas) f) => _actualizar((p) => p.copiar(firmas: f(p.firmas)));

  // ---------- Dictado ----------

  /// Las propuestas entran SIN confirmar. Una corrección guarda el valor anterior.
  void aplicarPropuestas(ResultadoLlenado r) => _actualizar((p) {
    final campos = {...p.campos};
    for (final pr in r.propuestas) {
      final antes = campos[pr.campoId] ?? const ValorCampo();
      if (pr.estado == EstadoIa.falta) {
        // Falta: sólo se marca si sigue vacío; no toca lo que ya había.
        if (antes.vacio) {
          campos[pr.campoId] = const ValorCampo(
            origen: OrigenCampo.dictado,
            estadoIa: EstadoIa.falta,
            confirmado: false,
          );
        }
        continue;
      }
      if (!antes.vacio && antes.valor == pr.valor && antes.confirmado) continue; // nada nuevo
      final hayPrevio = !antes.vacio && antes.valor != pr.valor;
      campos[pr.campoId] = ValorCampo(
        valor: pr.valor,
        origen: OrigenCampo.dictado,
        estadoIa: hayPrevio ? EstadoIa.corregido : pr.estado,
        confianza: pr.confianza,
        valorAnterior: hayPrevio ? (pr.valorAnterior ?? antes.valor) : null,
        confirmado: false,
      );
    }
    return p.copiar(campos: campos, modo: p.modo);
  });

  /// «Confirmar» / «Aceptar los cambios»: todo lo propuesto pasa a ser del bombero.
  void confirmarTodo() => _actualizar(
    (p) => p.copiar(
      campos: {
        for (final e in p.campos.entries)
          e.key: e.value.pendienteDeConfirmar ? e.value.copiar(confirmado: true, quitarValorAnterior: true) : e.value,
      },
    ),
  );

  void confirmarCampo(String id) => _actualizar((p) {
    final v = p.campo(id);
    return p.copiar(campos: {...p.campos, id: v.copiar(confirmado: true, quitarValorAnterior: true)});
  });

  /// «Dejar como estaba»: vuelve al valor anterior (o vacía) cada propuesta sin confirmar.
  void descartarPropuestas() => _actualizar((p) {
    final campos = <String, ValorCampo>{};
    for (final e in p.campos.entries) {
      final v = e.value;
      if (!v.pendienteDeConfirmar) {
        campos[e.key] = v;
      } else if (v.valorAnterior != null) {
        campos[e.key] = ValorCampo(valor: v.valorAnterior!, confirmado: true);
      }
    }
    return p.copiar(campos: campos);
  });

  void reemplazar(Parte p) {
    state = p;
    _guardar();
  }
}

final hojaProvider = NotifierProvider<HojaControlador, Parte?>(HojaControlador.new);

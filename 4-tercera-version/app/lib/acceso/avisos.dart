import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../datos/modelos.dart';
import '../hoja/pantalla_documentos.dart';
import '../revision/revision_controlador.dart';
import '../servicios/proveedores.dart';
import 'sesion.dart';

class EstadoAvisos {
  const EstadoAvisos({this.lista = const [], this.nuevos = const []});
  final List<Notificacion> lista;

  /// Los que llegaron en la última consulta (no en la primera). La pantalla de inicio los muestra como aviso.
  final List<Notificacion> nuevos;

  int get sinLeer => lista.where((n) => !n.leida).length;
}

/// Los avisos de quien está dentro: se piden al entrar y cada [cada] mientras la sesión siga abierta.
/// Si un aviso es de un parte, se refrescan también la bandeja del capitán y «Mis documentos».
class AvisosNotifier extends Notifier<EstadoAvisos> {
  static const cada = Duration(seconds: 20);
  Timer? _timer;
  bool _primera = true;

  @override
  EstadoAvisos build() {
    final id = ref.watch(sesionProvider.select((s) => s.sinConexion ? null : s.usuario?.id));
    ref.onDispose(() => _timer?.cancel());
    _primera = true;
    if (id == null) return const EstadoAvisos();
    _timer = Timer.periodic(cada, (_) => actualizar());
    scheduleMicrotask(actualizar);
    return const EstadoAvisos();
  }

  String? get _usuarioId => ref.read(sesionProvider).usuario?.id;

  Future<void> actualizar() async {
    final id = _usuarioId;
    if (id == null) return;
    try {
      final lista = await ref.read(repositorioRemotoProvider).notificaciones(id);
      if (!ref.mounted || _usuarioId != id) return;
      final vistos = state.lista.map((n) => n.id).toSet();
      final nuevos = _primera
          ? <Notificacion>[]
          : [
              for (final n in lista)
                if (!n.leida && !vistos.contains(n.id)) n,
            ];
      _primera = false;
      state = EstadoAvisos(lista: lista, nuevos: nuevos);
      if (nuevos.any((n) => n.folio != null)) {
        ref.invalidate(bandejaProvider);
        ref.invalidate(misDocumentosProvider);
      }
    } catch (_) {
      // Sin señal un momento: se vuelve a intentar en el siguiente turno.
    }
  }

  Future<void> marcarLeido(int id) async {
    final usuario = _usuarioId;
    if (usuario == null) return;
    state = EstadoAvisos(lista: [for (final n in state.lista) n.id == id ? n.copiar(leida: true) : n]);
    try {
      await ref.read(repositorioRemotoProvider).marcarAvisoLeido(id, usuarioId: usuario);
    } catch (_) {
      await actualizar();
    }
  }

  Future<void> marcarTodosLeidos() async {
    final usuario = _usuarioId;
    if (usuario == null) return;
    state = EstadoAvisos(lista: [for (final n in state.lista) n.copiar(leida: true)]);
    try {
      await ref.read(repositorioRemotoProvider).marcarAvisosLeidos(usuarioId: usuario);
    } catch (_) {
      await actualizar();
    }
  }
}

final avisosProvider = NotifierProvider<AvisosNotifier, EstadoAvisos>(AvisosNotifier.new);

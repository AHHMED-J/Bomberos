import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../acceso/sesion.dart';
import '../datos/modelos.dart';
import '../datos/repositorio_remoto.dart';
import '../servicios/proveedores.dart';

/// R2 · partes de la división del capitán.
final bandejaProvider = FutureProvider.autoDispose<List<Parte>>((ref) async {
  final u = ref.watch(usuarioActualProvider);
  return ref.watch(repositorioRemotoProvider).bandeja(u.division);
});

class EstadoRevision {
  const EstadoRevision({this.parte, this.reto, this.firma, this.contrasena, this.simulada = false});
  final Parte? parte;
  final String? reto;

  /// Confirmación del capitán, que se pide en CADA revisión (C1): la firma de la llave de su celular
  /// (biometría) o su contraseña. Sólo viene una de las dos.
  final String? firma;
  final String? contrasena;
  final bool simulada;

  bool get confirmado => firma != null || contrasena != null;
}

class RevisionControlador extends Notifier<EstadoRevision> {
  @override
  EstadoRevision build() => const EstadoRevision();

  void abrir(Parte p) => state = EstadoRevision(parte: p);

  /// C1 · «Confirma que eres tú» con la biometría: pide reto al servidor y lo firma la llave del celular.
  Future<String?> autenticar() async {
    final p = state.parte;
    if (p == null) return 'Sin parte';
    try {
      final reto = await ref.read(repositorioRemotoProvider).retoFirma(p);
      final r = await ref.read(firmaProvider).firmar(reto, motivo: 'Abre tu firma para validar ${p.folio}');
      if (r.cancelada) return 'Cancelado';
      if (!r.ok) return r.error ?? 'No se pudo firmar';
      state = EstadoRevision(parte: p, reto: reto, firma: r.firma, simulada: r.simulada);
      return null;
    } catch (e) {
      return mensajeDeError(e);
    }
  }

  /// C1 · «Confirma que eres tú» con la contraseña. El servidor la revisa al validar.
  Future<String?> autenticarConContrasena(String contrasena) async {
    final p = state.parte;
    if (p == null) return 'Sin parte';
    try {
      final reto = await ref.read(repositorioRemotoProvider).retoFirma(p);
      state = EstadoRevision(parte: p, reto: reto, contrasena: contrasena);
      return null;
    } catch (e) {
      return mensajeDeError(e);
    }
  }

  /// C2 · «Firmar y validar»: el servidor pone en el parte la firma en trazo de la cuenta del revisor,
  /// comprueba la confirmación y sella el parte.
  Future<void> validar() async {
    final s = state;
    final u = ref.read(usuarioActualProvider);
    try {
      final r = await ref
          .read(repositorioRemotoProvider)
          .validar(s.parte!.folio, reto: s.reto!, firma: s.firma, contrasena: s.contrasena, revisor: u);
      state = EstadoRevision(parte: r, reto: s.reto, firma: s.firma, simulada: s.simulada);
      ref.invalidate(bandejaProvider);
    } catch (_) {
      // La confirmación sirve una sola vez: si falló, hay que volver a confirmar.
      state = EstadoRevision(parte: s.parte);
      rethrow;
    }
  }

  /// R4 · devolver con nota y sección.
  Future<void> devolver(String nota, String seccion) async {
    final u = ref.read(usuarioActualProvider);
    final r = await ref
        .read(repositorioRemotoProvider)
        .devolver(state.parte!.folio, nota: nota, seccion: seccion, revisor: u);
    state = EstadoRevision(parte: r);
    ref.invalidate(bandejaProvider);
  }
}

final revisionProvider = NotifierProvider<RevisionControlador, EstadoRevision>(RevisionControlador.new);

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../acceso/sesion.dart';
import '../datos/modelos.dart';
import '../servicios/proveedores.dart';

/// R2 · partes de la división del capitán.
final bandejaProvider = FutureProvider.autoDispose<List<Parte>>((ref) async {
  final u = ref.watch(usuarioActualProvider);
  return ref.watch(repositorioRemotoProvider).bandeja(u.division);
});

class EstadoRevision {
  const EstadoRevision({this.parte, this.reto, this.firma, this.simulada = false});
  final Parte? parte;
  final String? reto;

  /// Firma de credencial del capitán: se pide con Face ID en CADA revisión (C1).
  final String? firma;
  final bool simulada;
}

class RevisionControlador extends Notifier<EstadoRevision> {
  @override
  EstadoRevision build() => const EstadoRevision();

  void abrir(Parte p) => state = EstadoRevision(parte: p);

  /// C1 · «Confirma que eres tú»: pide reto al servidor y lo firma con Face ID.
  Future<String?> autenticar() async {
    final p = state.parte;
    if (p == null) return 'Sin parte';
    final reto = await ref.read(repositorioRemotoProvider).retoFirma(p);
    final r = await ref.read(firmaProvider).firmar(reto, motivo: 'Abre tu firma para validar ${p.folio}');
    if (r.cancelada) return 'Cancelado';
    if (!r.ok) return r.error ?? 'No se pudo firmar';
    state = EstadoRevision(parte: p, reto: reto, firma: r.firma, simulada: r.simulada);
    return null;
  }

  /// C2 · «Firmar y validar»: credencial + trazo entran al sello.
  Future<void> validar(String trazo) async {
    final s = state;
    final u = ref.read(usuarioActualProvider);
    final r = await ref
        .read(repositorioRemotoProvider)
        .validar(s.parte!.folio, reto: s.reto!, firma: s.firma!, trazo: trazo, revisor: u);
    state = EstadoRevision(parte: r, reto: s.reto, firma: s.firma, simulada: s.simulada);
    ref.invalidate(bandejaProvider);
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

/// Firma de trazo guardada en el perfil del capitán. TODO: guardarla en el servidor/SQLite.
class TrazoPerfil extends Notifier<String?> {
  @override
  String? build() => null;
  void guardar(String t) => state = t;
}

final trazoPerfilProvider = NotifierProvider<TrazoPerfil, String?>(TrazoPerfil.new);

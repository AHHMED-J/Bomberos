import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../datos/datos_ejemplo.dart';
import '../datos/modelos.dart';
import '../servicios/proveedores.dart';

class EstadoSesion {
  const EstadoSesion({this.usuario, this.firmaSimulada = false});
  final Usuario? usuario;

  /// La última firma no usó el chip seguro (se avisa en la pantalla de inicio).
  final bool firmaSimulada;
}

/// Quién está dentro. Entrar = el servidor manda un reto al azar y la app lo firma con Face ID.
class SesionNotifier extends Notifier<EstadoSesion> {
  @override
  EstadoSesion build() => const EstadoSesion();

  /// Usuario dueño de la llave de este teléfono. Cambia con el alta.
  /// TODO: guardarlo en el teléfono (hoy arranca con el usuario de ejemplo y se pierde al cerrar la app).
  Usuario usuarioDelTelefono = usuarioEditorPrincipal;

  Future<String?> entrarConCredencial() async {
    final remoto = ref.read(repositorioRemotoProvider);
    final firma = ref.read(firmaProvider);
    try {
      final id = usuarioDelTelefono.id;
      final reto = await remoto.retoAcceso(id);
      final r = await firma.firmar(reto, motivo: 'Entra al parte digital');
      if (r.cancelada) return 'Cancelado';
      if (!r.ok) return r.error ?? 'No se pudo firmar';
      final u = await remoto.verificarAcceso(id, reto, r.firma!);
      state = EstadoSesion(usuario: u, firmaSimulada: r.simulada);
      return null;
    } catch (e) {
      return 'No se pudo entrar: $e';
    }
  }

  /// Alta con el código de un solo uso de la Dirección: crea la llave y registra la pública.
  Future<String?> darDeAlta(String codigo) async {
    try {
      final llave = await ref.read(firmaProvider).crearLlave();
      if (llave.llavePublica == null) return llave.error ?? 'No se creó la llave';
      final u = await ref.read(repositorioRemotoProvider).alta(codigo, llave.llavePublica!);
      usuarioDelTelefono = u;
      state = EstadoSesion(usuario: u, firmaSimulada: llave.simulada);
      return null;
    } catch (e) {
      return 'No se pudo dar de alta: $e';
    }
  }

  /// Sólo depuración: saltar de rol sin login real.
  void entrarComo(Usuario u) => state = EstadoSesion(usuario: u, firmaSimulada: true);

  void salir() => state = const EstadoSesion();
}

final sesionProvider = NotifierProvider<SesionNotifier, EstadoSesion>(SesionNotifier.new);

/// Atajo: el usuario actual (o lanza si no hay sesión).
final usuarioActualProvider = Provider<Usuario>((ref) {
  final u = ref.watch(sesionProvider).usuario;
  if (u == null) throw StateError('Sin sesión');
  return u;
});

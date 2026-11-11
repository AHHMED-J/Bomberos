import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../datos/modelos.dart';
import '../datos/repositorio_remoto.dart';
import '../servicios/proveedores.dart';

class EstadoSesion {
  const EstadoSesion({this.usuario, this.firmaSimulada = false});
  final Usuario? usuario;

  /// La última firma no usó el chip seguro (se avisa en la pantalla de inicio).
  final bool firmaSimulada;
}

/// Quién está dentro.
///
/// La primera vez en un celular se entra con el número de empleado y la contraseña que entrega Dirección.
/// Ahí mismo la app registra la llave del chip seguro de ese celular, y desde entonces también se puede
/// entrar con la biometría: el servidor manda un reto al azar y el celular lo firma.
class SesionNotifier extends Notifier<EstadoSesion> {
  @override
  EstadoSesion build() => const EstadoSesion();

  /// El usuario que ya entró con su contraseña en este teléfono (para ofrecerle la biometría).
  /// Lo recuerda memoriaTelefonoProvider entre aperturas; null = nadie ha entrado aquí.
  Usuario? usuarioDelTelefono;

  /// Lee quién usa este teléfono. Se llama al abrir la pantalla de acceso.
  Future<void> cargarTelefono() async {
    usuarioDelTelefono ??= await ref.read(memoriaTelefonoProvider).leer();
  }

  Future<void> _recordar(Usuario u) async {
    usuarioDelTelefono = u;
    await ref.read(memoriaTelefonoProvider).guardar(u);
  }

  /// ¿Se puede ofrecer «Entrar con mi biometría» en este teléfono?
  Future<bool> puedeEntrarConBiometria() async {
    if (usuarioDelTelefono == null) return false;
    try {
      return await ref.read(firmaProvider).tieneLlave();
    } catch (_) {
      return false;
    }
  }

  /// Entrada manual. Devuelve el mensaje de error, o null si entró.
  Future<String?> entrarConContrasena(String noEmpleado, String contrasena) async {
    try {
      var u = await ref.read(repositorioRemotoProvider).entrar(noEmpleado, contrasena);
      final simulada = await _registrarEsteCelular(u);
      if (simulada != null) u = u.copiar(tieneLlave: true);
      await _recordar(u);
      state = EstadoSesion(usuario: u, firmaSimulada: simulada ?? false);
      return null;
    } catch (e) {
      return mensajeDeError(e);
    }
  }

  /// Si la cuenta todavía no tiene celular, crea la llave en el chip seguro de este y registra la pública.
  /// Devuelve si la llave es simulada, o null si no se registró (entonces confirma con su contraseña).
  /// Un fallo aquí no impide entrar.
  Future<bool?> _registrarEsteCelular(Usuario u) async {
    if (u.tieneLlave) return null;
    try {
      final llave = await ref.read(firmaProvider).crearLlave();
      if (llave.llavePublica == null) return null;
      // Sin biometría de verdad (llave simulada) sólo se registra en depuración: en la app real, ese
      // celular confirma con la contraseña.
      if (llave.simulada && !kDebugMode) return null;
      await ref.read(repositorioRemotoProvider).registrarLlave(llave.llavePublica!);
      return llave.simulada;
    } catch (e) {
      debugPrint('No se registró la llave de este celular ($e)');
      return null;
    }
  }

  /// Entrada con la biometría del celular.
  Future<String?> entrarConCredencial() async {
    final remoto = ref.read(repositorioRemotoProvider);
    final firma = ref.read(firmaProvider);
    final id = usuarioDelTelefono?.id;
    if (id == null) return 'Entra primero con tu número de empleado y tu contraseña';
    try {
      final reto = await remoto.retoAcceso(id);
      final r = await firma.firmar(reto, motivo: 'Entra al parte digital');
      if (r.cancelada) return 'Cancelado';
      if (!r.ok) return r.error ?? 'No se pudo firmar';
      if (r.simulada && !kDebugMode) return 'Este celular no tiene biometría; entra con tu contraseña';
      final u = await remoto.verificarAcceso(id, reto, r.firma!);
      state = EstadoSesion(usuario: u, firmaSimulada: r.simulada);
      return null;
    } catch (e) {
      return mensajeDeError(e);
    }
  }

  /// Sube la firma en trazo del usuario y la deja en la sesión.
  Future<String?> guardarTrazo(String trazo) async {
    try {
      final u = await ref.read(repositorioRemotoProvider).guardarTrazo(trazo);
      // Se conserva al usuario de la sesión (en depuración no es el que conoce el servidor).
      state = EstadoSesion(usuario: (state.usuario ?? u).copiar(trazo: trazo), firmaSimulada: state.firmaSimulada);
      return null;
    } catch (e) {
      return mensajeDeError(e);
    }
  }

  Future<String?> cambiarContrasena({required String actual, required String nueva}) async {
    try {
      await ref.read(repositorioRemotoProvider).cambiarContrasena(actual: actual, nueva: nueva);
      return null;
    } catch (e) {
      return mensajeDeError(e);
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

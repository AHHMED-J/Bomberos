// ÚNICO punto de inyección de dependencias.
// Para cambiar una pieza falsa por la real se cambia aquí (o la bandera de Config), nada más.
// En pruebas se sustituye con ProviderScope(overrides: [...]).
import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../acceso/memoria_telefono.dart';
import '../croquis/almacen_croquis.dart';
import '../datos/api_cliente.dart';
import '../datos/repositorio_local.dart';
import '../datos/repositorio_remoto.dart';
import 'config.dart';
import 'firma/servicio_firma.dart';
import 'grabadora_audio.dart';
import 'grabadora_real.dart';
import 'ia/servicio_llenado_campos.dart';
import 'ia/servicio_resumen.dart';
import 'ia/servicio_transcripcion.dart';
import 'ubicacion.dart';

class ConfigNotifier extends Notifier<Config> {
  @override
  Config build() => const Config();
  void cambiar(Config Function(Config) f) => state = f(state);
}

final configProvider = NotifierProvider<ConfigNotifier, Config>(ConfigNotifier.new);

final apiProvider = Provider<ApiCliente>((ref) => ApiCliente(ref.watch(configProvider.select((c) => c.urlServidor))));

/// Pregunta si el servidor contesta. null = la app no depende del servidor (todo falso): siempre en línea.
/// En pruebas se sustituye por null o por una función controlada.
final sondaServidorProvider = Provider<Future<bool> Function()?>((ref) {
  final c = ref.watch(configProvider);
  if (c.datos == Fuente.falsa && c.ia == Fuente.falsa) return null;
  final url = Uri.parse('${c.urlServidor}/api/salud');
  return () async {
    try {
      final r = await http.get(url).timeout(const Duration(seconds: 4));
      return r.statusCode == 200;
    } catch (_) {
      return false;
    }
  };
});

/// ¿Hay señal con el servidor? Se comprueba al abrir la app y cada [RedNotifier.cada]. Lo que importa
/// no es tener Wi-Fi sino que nuestro servidor conteste. La bandera de Depuración «Sin señal» lo fuerza.
class RedNotifier extends Notifier<bool> {
  static const cada = Duration(seconds: 15);
  Timer? _timer;

  @override
  bool build() {
    final simulada = ref.watch(configProvider.select((c) => c.sinConexionSimulada));
    final sonda = ref.watch(sondaServidorProvider);
    ref.onDispose(() => _timer?.cancel());
    if (simulada) return false;
    if (sonda == null) return true;
    _timer = Timer.periodic(cada, (_) => comprobar());
    scheduleMicrotask(comprobar);
    return stateOrNull ?? true;
  }

  /// Pregunta ya (p. ej. al tocar «Reintentar»). Devuelve si hay señal.
  Future<bool> comprobar() async {
    if (ref.read(configProvider).sinConexionSimulada) return false;
    final sonda = ref.read(sondaServidorProvider);
    final ok = sonda == null ? true : await sonda();
    if (ref.mounted) state = ok;
    return ok;
  }
}

final enLineaProvider = NotifierProvider<RedNotifier, bool>(RedNotifier.new);

// ---------- Las dos IAs (TODO(IA): hoy son falsas o el servidor responde fijo) ----------

final transcripcionProvider = Provider<ServicioTranscripcion>((ref) {
  return switch (ref.watch(configProvider.select((c) => c.ia))) {
    Fuente.falsa => FalsoTranscripcion(),
    Fuente.servidor => ServidorTranscripcion(ref.watch(apiProvider)),
  };
});

final llenadoCamposProvider = Provider<ServicioLlenadoCampos>((ref) {
  return switch (ref.watch(configProvider.select((c) => c.ia))) {
    Fuente.falsa => FalsoLlenadoCampos(),
    Fuente.servidor => ServidorLlenadoCampos(ref.watch(apiProvider)),
  };
});

final resumenProvider = Provider<ServicioResumen>((ref) {
  return switch (ref.watch(configProvider.select((c) => c.ia))) {
    Fuente.falsa => FalsoResumen(),
    Fuente.servidor => ServidorResumen(ref.watch(apiProvider)),
  };
});

// ---------- Micrófono y firma ----------

/// Micrófono real salvo que en Depuración se pida simulado (o bloqueado, para ver la pantalla D7).
final grabadoraProvider = Provider<GrabadoraAudio>((ref) {
  final (bloqueado, simulado) = ref.watch(
    configProvider.select((c) => (c.microfonoBloqueadoSimulado, c.microfonoSimulado)),
  );
  if (bloqueado || simulado) return GrabadoraFalsa(bloqueada: bloqueado);
  final real = GrabadoraReal();
  ref.onDispose(real.liberar);
  return real;
});

final firmaProvider = Provider<ServicioFirma>((ref) {
  final respaldo = FirmaSimulada();
  if (ref.watch(configProvider.select((c) => c.firmaSimulada))) return respaldo;
  return FirmaConRespaldo(real: FirmaEnclave(), respaldo: respaldo);
});

// ---------- Datos ----------

/// Se sustituye en main.dart por RepositorioSqlite ya abierto.
final repositorioLocalProvider = Provider<RepositorioLocal>((ref) => RepositorioMemoria());

// ---------- Croquis ----------

/// GPS real del iPhone. En pruebas: UbicacionFija.
final ubicacionProvider = Provider<ServicioUbicacion>((ref) => UbicacionReal());

/// Teselas de OpenStreetMap en el mapa del croquis. En pruebas se apaga (no hay internet).
final teselasMapaProvider = Provider<bool>((ref) => true);

/// PNG del croquis en la carpeta de la app. En pruebas: en memoria.
final almacenCroquisProvider = Provider<AlmacenCroquis>((ref) => AlmacenCroquisArchivos());

// ---------- Acceso ----------

/// Qué usuario ya entró con su contraseña en este teléfono (archivo en la carpeta de la app).
/// En pruebas: en memoria.
final memoriaTelefonoProvider = Provider<MemoriaTelefono>((ref) => MemoriaTelefonoArchivo());

/// Un solo servidor falso para toda la sesión, así lo que envía quien elabora le llega al capitán.
final _remotoFalsoProvider = Provider<RemotoFalso>((ref) => RemotoFalso());

final repositorioRemotoProvider = Provider<RepositorioRemoto>((ref) {
  return switch (ref.watch(configProvider.select((c) => c.datos))) {
    Fuente.falsa => ref.watch(_remotoFalsoProvider),
    Fuente.servidor => RemotoHttp(ref.watch(apiProvider)),
  };
});

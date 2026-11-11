// ÚNICO punto de inyección de dependencias.
// Para cambiar una pieza falsa por la real se cambia aquí (o la bandera de Config), nada más.
// En pruebas se sustituye con ProviderScope(overrides: [...]).
import 'package:flutter_riverpod/flutter_riverpod.dart';

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

/// ¿Hay señal? Hoy sale de la bandera simulada. TODO: detector de red real.
final enLineaProvider = Provider<bool>((ref) => !ref.watch(configProvider.select((c) => c.sinConexionSimulada)));

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

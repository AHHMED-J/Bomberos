// Parte digital · Bomberos de Ensenada (UABC FIAD, Tecnologías Emergentes).
// Esqueleto navegable con datos de ejemplo. Las dos IAs están marcadas con TODO(IA).
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'compartido/tema.dart';
import 'datos/datos_ejemplo.dart';
import 'datos/repositorio_local.dart';
import 'rutas.dart';
import 'servicios/proveedores.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  RepositorioLocal local;
  try {
    local = await RepositorioSqlite.abrir();
    // Primera vez: deja un parte en progreso de ejemplo para ver la pantalla G4.
    if ((await local.partes()).isEmpty) await local.guardar(parteEnProgresoEjemplo());
  } catch (e) {
    debugPrint('SQLite no abrió ($e); uso memoria.');
    local = RepositorioMemoria([parteEnProgresoEjemplo()]);
  }
  runApp(ProviderScope(overrides: [repositorioLocalProvider.overrideWithValue(local)], child: const AppBomberos()));
}

class AppBomberos extends ConsumerWidget {
  const AppBomberos({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => MaterialApp.router(
    title: 'Parte digital',
    debugShowCheckedModeBanner: false,
    theme: temaBomberos(),
    routerConfig: ref.watch(rutasProvider),
    locale: const Locale('es', 'MX'),
    supportedLocales: const [Locale('es', 'MX'), Locale('es')],
    localizationsDelegates: GlobalMaterialLocalizations.delegates,
  );
}

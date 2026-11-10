import 'dart:convert';

import 'package:bomberos_parte/datos/datos_ejemplo.dart';
import 'package:bomberos_parte/datos/repositorio_local.dart';
import 'package:bomberos_parte/dictado/dictado_controlador.dart';
import 'package:bomberos_parte/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'apoyo.dart';

void main() {
  test('Lee un parte guardado antes del cambio «encargado» → «elaboró»', () {
    final j = parteEnProgresoEjemplo().aJson();
    final viejo = Map<String, dynamic>.from(j)
      ..remove('elaboro_id')
      ..remove('elaboro_nombre')
      ..['encargado_id'] = j['elaboro_id']
      ..['encargado_nombre'] = j['elaboro_nombre'];
    final firmas = Map<String, dynamic>.from(j['firmas'] as Map)
      ..remove('elaboro')
      ..['encargado'] = 'FIRMA';
    viejo['firmas'] = firmas;

    final p = leerParteGuardado(jsonEncode(viejo))!;
    expect(p.elaboroId, j['elaboro_id']);
    expect(p.elaboroNombre, j['elaboro_nombre']);
    expect(p.firmas.elaboro, 'FIRMA');
  });

  test('Un parte guardado ilegible se salta en vez de tumbar el almacenamiento', () {
    expect(leerParteGuardado('{"id": 1}'), isNull);
    expect(leerParteGuardado('no es json'), isNull);
  });

  testWidgets('Si la app se va a segundo plano mientras graba, se detiene y usa lo grabado', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    late ProviderContainer c;
    await tester.pumpWidget(
      ProviderScope(
        overrides: overridesDePrueba(),
        child: Consumer(
          builder: (context, ref, _) {
            c = ProviderScope.containerOf(context);
            return const AppBomberos();
          },
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Depuración: entrar como…', skipOffstage: false));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Depuración: entrar como…'));
    await tester.pumpAndSettle();
    await tester.tap(find.textContaining('Jalife'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('nuevo-parte')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('boton-dictar')));
    await tester.pump();
    expect(c.read(dictadoProvider).fase, FaseDictado.grabando);

    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    for (var i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 50));
    }
    expect(c.read(dictadoProvider).fase, isNot(FaseDictado.grabando));
    expect(c.read(dictadoProvider).fase, FaseDictado.resultado);
    // Volver al frente con la secuencia real de iOS: oculta → inactiva → activa.
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
  });
}

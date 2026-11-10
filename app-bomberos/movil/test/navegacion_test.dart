import 'package:bomberos_parte/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'apoyo.dart';

void main() {
  testWidgets('Acceso → depuración (Editor) → nuevo parte → Hoja con «Dictar» → Enviar muestra lo que falta', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(ProviderScope(overrides: overridesDePrueba(), child: const AppBomberos()));
    await tester.pumpAndSettle();
    expect(find.text('Usar mi credencial'), findsOneWidget);

    await tester.ensureVisible(find.text('Depuración: entrar como…', skipOffstage: false));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Depuración: entrar como…'));
    await tester.pumpAndSettle();
    await tester.tap(find.textContaining('Jalife'));
    await tester.pumpAndSettle();
    expect(find.text('DIVISIÓN ESTRUCTURAL'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('nuevo-parte')));
    await tester.pumpAndSettle();
    expect(find.text('HOJA DE INCIDENTE'), findsOneWidget);
    expect(find.byKey(const ValueKey('boton-dictar')), findsOneWidget);

    // Dictar: grabar y detener → la hoja queda con marcas y barra Confirmar (D5).
    await tester.tap(find.byKey(const ValueKey('boton-dictar')));
    await tester.pump();
    expect(find.byKey(const ValueKey('detener-y-usar')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('detener-y-usar')));
    for (var i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 50));
    }
    expect(find.byKey(const ValueKey('confirmar-dictado')), findsOneWidget);
    expect(find.textContaining('ENTENDIDOS'), findsOneWidget);
    expect(find.textContaining('POR REVISAR'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('confirmar-dictado')));
    await tester.pumpAndSettle();

    final enviar = find.byKey(const ValueKey('boton-enviar'));
    await tester.scrollUntilVisible(enviar, 400, scrollable: find.byType(Scrollable).first);
    await tester.tap(enviar);
    await tester.pumpAndSettle();
    expect(find.text('Antes de enviar faltan:'), findsOneWidget);
  });

  testWidgets('Capitán ve la bandeja con partes por revisar', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(ProviderScope(overrides: overridesDePrueba(), child: const AppBomberos()));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Depuración: entrar como…', skipOffstage: false));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Depuración: entrar como…'));
    await tester.pumpAndSettle();
    await tester.tap(find.textContaining('Capitán · encargado de turno'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Bandeja de revisión'));
    await tester.pumpAndSettle();
    expect(find.text('PE-2026-0150'), findsOneWidget);

    await tester.tap(find.text('PE-2026-0150'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('validar')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('usar-face-id')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('firmar-y-validar')), findsOneWidget);
  });
}

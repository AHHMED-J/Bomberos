import 'package:bomberos_parte/compartido/campo_con_estado.dart';
import 'package:bomberos_parte/datos/catalogo_campos.dart';
import 'package:bomberos_parte/datos/modelos.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('al elegir una opción se ve de inmediato, sin pasar a otro campo', (tester) async {
    var valor = '';
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) => CampoConEstado(
              def: campoDef('estacion'),
              valor: ValorCampo(valor: valor),
              alCambiar: (v) => setState(() => valor = v),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(const ValueKey('campo-estacion')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('5'));
    await tester.pumpAndSettle();

    expect(valor, '5');
    final campo = tester.widget<TextField>(find.byKey(const ValueKey('campo-estacion')));
    expect(campo.controller!.text, '5');
  });
}

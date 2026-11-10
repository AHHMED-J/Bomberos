import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:bomberos_parte/compartido/tema.dart';
import 'package:bomberos_parte/croquis/almacen_croquis.dart';
import 'package:bomberos_parte/croquis/control_croquis.dart';
import 'package:bomberos_parte/croquis/seccion_croquis.dart';
import 'package:bomberos_parte/datos/datos_ejemplo.dart';
import 'package:bomberos_parte/datos/modelos.dart';
import 'package:bomberos_parte/hoja/hoja_controlador.dart';
import 'package:bomberos_parte/servicios/ubicacion.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'apoyo.dart';

Future<ui.Image> _imagenLisa(int ancho, int alto) {
  final g = ui.PictureRecorder();
  Canvas(g).drawRect(Rect.fromLTWH(0, 0, ancho.toDouble(), alto.toDouble()), Paint()..color = Colors.white);
  return g.endRecording().toImage(ancho, alto);
}

/// Color RGBA de un pixel de un PNG.
Future<Color> _pixel(Uint8List png, int x, int y) async {
  final codec = await ui.instantiateImageCodec(png);
  final img = (await codec.getNextFrame()).image;
  final datos = (await img.toByteData(format: ui.ImageByteFormat.rawRgba))!;
  final i = (y * img.width + x) * 4;
  return Color.fromARGB(datos.getUint8(i + 3), datos.getUint8(i), datos.getUint8(i + 1), datos.getUint8(i + 2));
}

void main() {
  group('ControlCroquis', () {
    test('deshacer y rehacer; un trazo nuevo borra lo que se podía rehacer', () {
      final c = ControlCroquis();
      c
        ..empezar(const Offset(1, 1))
        ..seguir(const Offset(5, 5))
        ..empezar(const Offset(9, 9));
      expect(c.trazos, hasLength(2));
      c.deshacer();
      expect(c.trazos, hasLength(1));
      expect(c.puedeRehacer, isTrue);
      c.rehacer();
      expect(c.trazos, hasLength(2));
      c
        ..deshacer()
        ..empezar(const Offset(2, 2));
      expect(c.puedeRehacer, isFalse);
    });

    test('el color nuevo aplica a los trazos siguientes, no a los anteriores', () {
      final c = ControlCroquis()..empezar(Offset.zero);
      const azul = Color(0xFF1E63D6);
      c
        ..cambiarColor(azul)
        ..empezar(const Offset(3, 3));
      expect(c.trazos.first.color, coloresCroquis.first.$2);
      expect(c.trazos.last.color, azul);
    });
  });

  testWidgets('el PNG sale del tamaño original de la captura, aunque el recuadro mida otra cosa', (tester) async {
    await tester.runAsync(() async {
      final base = await _imagenLisa(300, 150); // captura a 3× de un recuadro de 100×50
      final c = ControlCroquis()..grosor = 4;
      c
        ..empezar(const Offset(10, 10))
        ..seguir(const Offset(90, 10)); // línea roja horizontal en y = 10 del recuadro
      final png = await exportarPng(base, c.trazos, const Size(100, 50));
      expect(medidasPng(png), (300, 150));
      // y = 10 en el recuadro → y = 30 en el original; x = 50 → 150.
      final enLinea = await _pixel(png, 150, 30);
      expect(enLinea.r, greaterThan(.8));
      expect(enLinea.g, lessThan(.4));
      final fuera = await _pixel(png, 150, 120);
      expect(fuera, const Color(0xFFFFFFFF));
    });
  });

  group('Sección Croquis en la hoja', () {
    late ProviderContainer cont;
    late AlmacenCroquisMemoria almacen;

    Future<void> montar(WidgetTester tester, {ServicioUbicacion? ubicacion}) async {
      tester.view.physicalSize = const Size(1170, 2532);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      almacen = AlmacenCroquisMemoria();
      cont = ProviderContainer.test(
        overrides: overridesDePrueba(croquis: almacen, ubicacion: ubicacion),
      );
      cont.read(hojaProvider.notifier).abrir(parteEnProgresoEjemplo());
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: cont,
          child: MaterialApp(
            theme: temaBomberos(),
            home: Scaffold(
              body: Consumer(
                builder: (_, ref, _) => ListView(
                  padding: const EdgeInsets.all(16),
                  children: [SeccionCroquis(parte: ref.watch(hojaProvider)!, editable: true)],
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    /// Deja correr lo que usa el motor de verdad (toImage, PNG) y luego dibuja.
    Future<void> esperarMotor(WidgetTester tester) async {
      await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 300)));
      await tester.pumpAndSettle();
    }

    testWidgets('muestra «Captura» y el mapa con la ubicación en tiempo real', (tester) async {
      await montar(tester);
      expect(find.byKey(const ValueKey('boton-captura')), findsOneWidget);
      expect(find.text('Tu ubicación · en tiempo real'), findsOneWidget);
      expect(find.text('31.86670, -116.59640 · ±8 m'), findsOneWidget);
      expect(find.textContaining('Generar con IA'), findsNothing);
    });

    testWidgets('sin permiso de ubicación lo dice en el mapa', (tester) async {
      await montar(tester, ubicacion: UbicacionFija(estado: EstadoUbicacion.sinPermiso));
      expect(find.textContaining('Sin permiso de ubicación'), findsOneWidget);
    });

    testWidgets('Captura → lápiz, color, deshacer/rehacer, zoom → Terminar guarda el PNG', (tester) async {
      await montar(tester);
      await tester.tap(find.byKey(const ValueKey('boton-captura')));
      await esperarMotor(tester);

      // Modo Captura: herramientas arriba, «Terminar captura» abajo.
      expect(find.text('CAPTURA'), findsOneWidget);
      expect(find.byKey(const ValueKey('terminar-captura')), findsOneWidget);
      InteractiveViewer zoom() => tester.widget(find.byKey(const ValueKey('zoom-captura')));

      // Lápiz apagado: se puede hacer zoom con dos dedos, dentro del mismo recuadro.
      expect(zoom().scaleEnabled, isTrue);
      final marco = find.byKey(const ValueKey('zoom-captura'));
      final antes = tester.getSize(marco);
      final centro = tester.getCenter(marco);
      final d1 = await tester.startGesture(centro - const Offset(20, 0));
      final d2 = await tester.startGesture(centro + const Offset(20, 0));
      for (var i = 1; i <= 6; i++) {
        await d1.moveTo(centro - Offset(20 + i * 12.0, 0));
        await d2.moveTo(centro + Offset(20 + i * 12.0, 0));
        await tester.pump();
      }
      await d1.up();
      await d2.up();
      await tester.pumpAndSettle();
      expect(find.textContaining('×'), findsOneWidget); // indicador de zoom
      expect(tester.getSize(marco), antes); // no ocupa más pantalla
      await tester.tap(find.byKey(const ValueKey('boton-lapiz')));
      await tester.pump();
      // Lápiz activo: el zoom se apaga para que el dedo dibuje.
      expect(zoom().scaleEnabled, isFalse);
      expect(zoom().panEnabled, isFalse);

      final lienzo = find.byKey(const ValueKey('lienzo-captura'));
      await tester.drag(lienzo, const Offset(80, 20));
      await tester.pump();
      final deshacer = find.byKey(const ValueKey('boton-deshacer'));
      final rehacer = find.byKey(const ValueKey('boton-rehacer'));
      Icon icono(Finder f) => tester.widget<Icon>(find.descendant(of: f, matching: find.byType(Icon)));
      expect(icono(deshacer).color, Colors.white);
      expect(icono(rehacer).color, Colors.white38);

      await tester.tap(deshacer);
      await tester.pump();
      expect(icono(rehacer).color, Colors.white);
      await tester.tap(rehacer);
      await tester.pump();

      // Color: se ve el actual y se cambia ahí mismo.
      BoxDecoration actual() =>
          tester.widget<Container>(find.byKey(const ValueKey('color-actual'))).decoration! as BoxDecoration;
      expect(actual().color, coloresCroquis.first.$2);
      await tester.tap(find.byKey(const ValueKey('boton-color')));
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('color-Azul')));
      await tester.pump();
      expect(actual().color, const Color(0xFF1E63D6));
      expect(find.byKey(const ValueKey('color-Azul')), findsNothing); // la paleta se cierra

      await tester.tap(find.byKey(const ValueKey('terminar-captura')));
      await esperarMotor(tester);

      // De vuelta en la hoja: la captura guardada como PNG.
      final ruta = cont.read(hojaProvider)!.croquisPng;
      expect(ruta, isNotNull);
      final png = almacen.archivos[ruta]!;
      // Tamaño original = mapa de la hoja × densidad 3, no el recuadro agrandado de la captura.
      final (ancho, alto) = medidasPng(png);
      expect((ancho, alto), ((390 - 32 - 2) * 3, (200 - 2) * 3)); // recuadro sin su borde de 1 px
      expect(find.text('Captura guardada · PNG'), findsOneWidget);
      expect(find.text('Croquis guardado como PNG'), findsOneWidget);
    });

    testWidgets('con captura guardada, «Captura» vuelve al mapa y la nueva reemplaza a la anterior', (tester) async {
      await montar(tester);
      final png = (await tester.runAsync(
        () async => exportarPng(await _imagenLisa(30, 15), const [], const Size(10, 5)),
      ))!;
      final anterior = await almacen.guardar('x', png);
      cont.read(hojaProvider.notifier).croquis(anterior);
      await esperarMotor(tester);
      expect(find.text('Captura guardada · PNG'), findsOneWidget);
      expect(find.text('Tu ubicación · en tiempo real'), findsNothing);

      await tester.tap(find.byKey(const ValueKey('boton-captura')));
      await tester.pumpAndSettle();
      expect(find.text('Tu ubicación · en tiempo real'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('boton-captura')));
      await esperarMotor(tester);
      await tester.tap(find.byKey(const ValueKey('terminar-captura')));
      await esperarMotor(tester);

      final nueva = cont.read(hojaProvider)!.croquisPng;
      expect(nueva, isNot(anterior));
      expect(almacen.archivos.containsKey(anterior), isFalse);
      expect(almacen.archivos.containsKey(nueva), isTrue);
    });

    testWidgets('Cancelar no guarda nada', (tester) async {
      await montar(tester);
      await tester.tap(find.byKey(const ValueKey('boton-captura')));
      await esperarMotor(tester);
      await tester.tap(find.byKey(const ValueKey('cancelar-captura')));
      await tester.pumpAndSettle();
      expect(cont.read(hojaProvider)!.croquisPng, isNull);
      expect(almacen.archivos, isEmpty);
    });
  });

  test('el croquis viaja en el JSON del parte; el campo viejo «croquis_dibujado» se ignora', () {
    final p = parteEnProgresoEjemplo().copiar(croquisPng: 'croquis/a.png');
    expect(Parte.deJson(p.aJson()).croquisPng, 'croquis/a.png');
    final viejo = parteEnProgresoEjemplo().aJson()
      ..remove('croquis_png')
      ..['croquis_dibujado'] = true;
    expect(Parte.deJson(viejo).croquisPng, isNull);
  });
}

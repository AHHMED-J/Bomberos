import 'dart:typed_data';

import 'package:bomberos_parte/croquis/almacen_croquis.dart';
import 'package:bomberos_parte/datos/api_cliente.dart';
import 'package:bomberos_parte/datos/datos_ejemplo.dart';
import 'package:bomberos_parte/datos/modelos.dart';
import 'package:bomberos_parte/datos/repositorio_remoto.dart';
import 'package:bomberos_parte/hoja/almacen_fotos.dart';
import 'package:bomberos_parte/hoja/hoja_controlador.dart';
import 'package:bomberos_parte/servicios/firma/servicio_firma.dart';
import 'package:bomberos_parte/servicios/proveedores.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

Uint8List _png() => Uint8List.fromList([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
Uint8List _jpg(int n) => Uint8List.fromList([0xff, 0xd8, 0xff, 0xe0, n, n + 1, n + 2]);

void main() {
  group('Contenido firmado con imágenes (igual que servidor/src/validacion.js)', () {
    Parte base(List<Adjunto> adjuntos) => Parte(
      id: 'x',
      folio: 'PE-2026-0999',
      estado: EstadoParte.enProgreso,
      elaboroId: 'u-1',
      elaboroNombre: 'N',
      division: 'D',
      creadoEn: DateTime(2026),
      campos: {
        'b': const ValorCampo(valor: 'y'),
        'a': const ValorCampo(valor: 'x'),
      },
      fotos: 1,
      adjuntos: adjuntos,
    );
    final a = 'a' * 64;
    final b = 'b' * 64;

    test('sin imágenes no aparece la llave «adjuntos» y el hash es el de siempre', () {
      expect(base(const []).contenidoParaFirmar().containsKey('adjuntos'), isFalse);
      // Mismo valor que calcula el servidor con el mismo parte (hashContenido en validacion.js).
      expect(
        hashContenido(base(const []).contenidoParaFirmar()),
        '8a2310c726d60db6e64b21e3f09e4083e6fba435a4e09b12f4608d98c0ea4467',
      );
    });

    test('con imágenes entran por su hash, en el mismo orden que el servidor, sin importar cómo vengan', () {
      final uno = base([Adjunto(tipo: 'foto', sha256: b), Adjunto(tipo: 'croquis', sha256: a)]);
      final otro = base([Adjunto(tipo: 'croquis', sha256: a, ruta: 'croquis/x.png'), Adjunto(tipo: 'foto', sha256: b)]);
      expect(
        hashContenido(uno.contenidoParaFirmar()),
        '85797c0fde914ad1e4fc0bc28fee91c75ccdaabcb7116ecd56433d73bc527f29',
      );
      expect(hashContenido(otro.contenidoParaFirmar()), hashContenido(uno.contenidoParaFirmar()));
    });

    test('cambiar una imagen cambia lo que se firma', () {
      final uno = base([Adjunto(tipo: 'foto', sha256: b)]);
      final otro = base([Adjunto(tipo: 'foto', sha256: a)]);
      expect(hashContenido(uno.contenidoParaFirmar()), isNot(hashContenido(otro.contenidoParaFirmar())));
    });

    test('las imágenes viajan en el JSON del parte, y un parte viejo sin ellas se lee igual', () {
      final p = Parte.deJson(
        base([Adjunto(tipo: 'foto', sha256: b, ruta: 'fotos/1.jpg')]).copiar(fotosRutas: ['fotos/1.jpg']).aJson(),
      );
      expect(p.adjuntos.single.sha256, b);
      expect(p.fotosRutas, ['fotos/1.jpg']);
      final viejo = Parte.deJson(
        {...base(const []).aJson()}
          ..remove('adjuntos')
          ..remove('fotos_rutas'),
      );
      expect(viejo.adjuntos, isEmpty);
      expect(viejo.fotosRutas, isEmpty);
    });
  });

  group('Fotos y croquis del parte (servidor falso con las mismas reglas)', () {
    late ProviderContainer c;
    late AlmacenFotosMemoria fotos;
    late AlmacenCroquisMemoria croquis;

    setUp(() {
      fotos = AlmacenFotosMemoria();
      croquis = AlmacenCroquisMemoria();
      c = ProviderContainer(
        overrides: [almacenFotosProvider.overrideWithValue(fotos), almacenCroquisProvider.overrideWithValue(croquis)],
      );
      addTearDown(c.dispose);
      c.read(hojaProvider.notifier).abrir(parteEnProgresoEjemplo());
    });

    test('agregar y quitar fotos mantiene el conteo y borra el archivo', () async {
      final hoja = c.read(hojaProvider.notifier);
      final r1 = await fotos.guardar('x', _jpg(1));
      final r2 = await fotos.guardar('x', _jpg(2));
      hoja.agregarFoto(r1);
      hoja.agregarFoto(r2);
      expect(c.read(hojaProvider)!.fotos, 2);
      expect(c.read(hojaProvider)!.fotosRutas, [r1, r2]);
      hoja.quitarFoto(r1);
      await Future<void>.delayed(Duration.zero);
      expect(c.read(hojaProvider)!.fotosRutas, [r2]);
      expect(c.read(hojaProvider)!.fotos, 1);
      expect(fotos.archivos.containsKey(r1), isFalse);
    });

    test('prepararAdjuntos saca el hash de cada imagen y subirlas las deja en el servidor', () async {
      final hoja = c.read(hojaProvider.notifier);
      hoja.agregarFoto(await fotos.guardar('x', _jpg(7)));
      hoja.croquis(await croquis.guardar('x', _png()));
      final p = await hoja.prepararAdjuntos();
      expect(p.adjuntos.map((a) => a.tipo).toSet(), {'foto', 'croquis'});
      expect(p.adjuntos.every((a) => a.sha256.length == 64), isTrue);
      expect(p.fotos, 1);
      await hoja.subirAdjuntos(p);
      final remoto = c.read(repositorioRemotoProvider);
      for (final a in p.adjuntos) {
        expect((await remoto.leerAdjunto(p.folio, a.sha256)).isNotEmpty, isTrue);
      }
    });

    test('el servidor rechaza un parte cuyas imágenes no se subieron', () async {
      final hoja = c.read(hojaProvider.notifier);
      hoja.agregarFoto(await fotos.guardar('x', _jpg(9)));
      final p = await hoja.prepararAdjuntos();
      final remoto = c.read(repositorioRemotoProvider);
      final reto = await remoto.retoFirma(p);
      await expectLater(
        remoto.enviar(p, reto: reto, firma: 'SIMULADA:x'),
        throwsA(isA<ErrorApi>().having((e) => e.codigo, 'codigo', 'adjunto_faltante')),
      );
      await hoja.subirAdjuntos(p);
      // Ya subidas, lo único que lo detiene son los campos obligatorios del ejemplo, no las imágenes.
      await expectLater(remoto.enviar(p, reto: reto, firma: 'SIMULADA:x'), throwsA(isA<EnvioRechazado>()));
    });

    test('si falta el archivo de una foto, avisa en vez de enviar sin ella', () async {
      c.read(hojaProvider.notifier).agregarFoto('fotos/no-existe.jpg');
      await expectLater(c.read(hojaProvider.notifier).prepararAdjuntos(), throwsA(isA<ImagenFaltante>()));
    });
  });
}

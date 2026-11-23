// Trabajo sin señal: detector de red, folio provisional y entrada sin conexión.
import 'package:bomberos_parte/acceso/memoria_telefono.dart';
import 'package:bomberos_parte/acceso/sesion.dart';
import 'package:bomberos_parte/datos/datos_ejemplo.dart';
import 'package:bomberos_parte/datos/modelos.dart';
import 'package:bomberos_parte/datos/repositorio_local.dart';
import 'package:bomberos_parte/hoja/hoja_controlador.dart';
import 'package:bomberos_parte/servicios/firma/servicio_firma.dart';
import 'package:bomberos_parte/servicios/proveedores.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'apoyo.dart';

/// Sonda controlada por la prueba: contesta lo que diga [hay].
class SondaPrueba {
  bool hay = true;
  int llamadas = 0;
  Future<bool> call() async {
    llamadas++;
    return hay;
  }
}

ProviderContainer conRed(SondaPrueba sonda, {MemoriaTelefono? memoria, ServicioFirma? firma}) => ProviderContainer.test(
  overrides: overridesDePrueba(sonda: sonda.call, memoria: memoria, firma: firma),
);

void main() {
  group('Detector de red', () {
    test('sin sonda (todo falso) siempre está en línea', () {
      final c = contenedor();
      expect(c.read(enLineaProvider), isTrue);
    });

    test('pregunta al servidor al abrir y refleja si contesta', () async {
      final sonda = SondaPrueba()..hay = false;
      final c = conRed(sonda);
      c.listen(enLineaProvider, (_, _) {});
      await esperarA(() => c.read(enLineaProvider) == false);
      expect(sonda.llamadas, greaterThan(0));

      sonda.hay = true;
      expect(await c.read(enLineaProvider.notifier).comprobar(), isTrue);
      expect(c.read(enLineaProvider), isTrue);
    });

    test('la bandera de Depuración «Sin señal» gana aunque el servidor conteste', () {
      final c = conRed(SondaPrueba());
      c.read(configProvider.notifier).cambiar((x) => x.copiar(sinConexionSimulada: true));
      expect(c.read(enLineaProvider), isFalse);
    });
  });

  group('Folio provisional', () {
    test('sin señal el parte empieza con folio LOCAL- y se guarda en el teléfono', () async {
      final local = RepositorioMemoria();
      final c = contenedor(local: local);
      c.read(configProvider.notifier).cambiar((x) => x.copiar(sinConexionSimulada: true));

      final p = await c.read(hojaProvider.notifier).nuevo(usuarioEditorPrincipal);
      expect(esFolioProvisional(p.folio), isTrue);
      expect((await local.parte(p.id))?.folio, p.folio);
    });

    test('al volver la señal recibe el folio real antes de enviar, sin perder lo escrito', () async {
      final local = RepositorioMemoria();
      final c = contenedor(local: local);
      final config = c.read(configProvider.notifier);
      final hoja = c.read(hojaProvider.notifier);
      config.cambiar((x) => x.copiar(sinConexionSimulada: true));
      final p = await hoja.nuevo(usuarioEditorPrincipal);
      hoja.escribir('descripcion', 'Incendio de pastizal');

      config.cambiar((x) => x.copiar(sinConexionSimulada: false));
      final real = await hoja.asegurarFolioReal();
      expect(esFolioProvisional(real.folio), isFalse);
      expect(real.folio, startsWith('PE-'));
      expect(real.id, p.id);
      expect(real.valor('descripcion'), 'Incendio de pastizal');
      expect((await local.parte(p.id))?.folio, real.folio);

      // Si ya es real, no pide otro.
      expect((await hoja.asegurarFolioReal()).folio, real.folio);
    });

    test('con señal el parte nace con folio real', () async {
      final c = contenedor();
      final p = await c.read(hojaProvider.notifier).nuevo(usuarioEditorPrincipal);
      expect(esFolioProvisional(p.folio), isFalse);
    });
  });

  group('Entrar sin conexión', () {
    test('nadie ha entrado en este teléfono: no se puede', () async {
      final c = conRed(SondaPrueba()..hay = false);
      final sesion = c.read(sesionProvider.notifier);
      await sesion.cargarTelefono();
      expect(await sesion.entrarSinConexion(), isNotNull);
      expect(c.read(sesionProvider).usuario, isNull);
    });

    test('sin biometría registrada en este celular: no se puede', () async {
      final c = conRed(
        SondaPrueba()..hay = false,
        memoria: MemoriaTelefonoMemoria(usuarioEditorPrincipal),
        firma: FirmaSimulada(retardo: Duration.zero),
      );
      final sesion = c.read(sesionProvider.notifier);
      await sesion.cargarTelefono();
      expect(await sesion.entrarSinConexion(), contains('biometría'));
    });

    test('quien ya entró aquí y tiene su biometría entra en modo sin conexión', () async {
      final firma = FirmaSimulada(retardo: Duration.zero);
      await firma.crearLlave();
      final c = conRed(
        SondaPrueba()..hay = false,
        memoria: MemoriaTelefonoMemoria(usuarioEditorPrincipal),
        firma: firma,
      );
      final sesion = c.read(sesionProvider.notifier);
      await sesion.cargarTelefono();
      expect(await sesion.entrarSinConexion(), isNull);
      final s = c.read(sesionProvider);
      expect(s.usuario?.id, usuarioEditorPrincipal.id);
      expect(s.sinConexion, isTrue);
    });
  });
}

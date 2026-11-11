import 'package:bomberos_parte/datos/datos_ejemplo.dart';
import 'package:bomberos_parte/datos/modelos.dart';
import 'package:bomberos_parte/datos/repositorio_local.dart';
import 'package:bomberos_parte/dictado/dictado_controlador.dart';
import 'package:bomberos_parte/hoja/hoja_controlador.dart';
import 'package:bomberos_parte/hoja/validacion_envio.dart';
import 'package:bomberos_parte/servicios/proveedores.dart';
import 'package:flutter_test/flutter_test.dart';

import 'apoyo.dart';

void main() {
  group('Máquina de estados del dictado (D1–D8)', () {
    test('D1 → D2 → D4 → D5: el primer dictado deja campos marcados y SIN confirmar', () async {
      final c = contenedor();
      await c.read(hojaProvider.notifier).nuevo(usuarioEditorPrincipal);
      final d = c.read(dictadoProvider.notifier);
      expect(c.read(dictadoProvider).fase, FaseDictado.inactivo);

      await d.iniciar();
      expect(c.read(dictadoProvider).fase, FaseDictado.grabando);

      await d.detenerYUsar();
      expect(c.read(dictadoProvider).fase, FaseDictado.resultado);
      expect(c.read(dictadoProvider).resumen, isNotNull, reason: 'el resumen vive en memoria');

      final p = c.read(hojaProvider)!;
      expect(p.campo('tipo_servicio').estadoIa, EstadoIa.entendido);
      expect(p.campo('lugar_servicio').estadoIa, EstadoIa.revisar);
      expect(p.campo('propietario').estadoIa, EstadoIa.falta);
      expect(p.campo('tipo_servicio').confirmado, isFalse);
      expect(camposSinConfirmar(p), 4);
    });

    test('D8: no se puede enviar con campos dictados sin confirmar; Confirmar los libera', () async {
      final c = contenedor();
      await c.read(hojaProvider.notifier).nuevo(usuarioEditorPrincipal);
      final d = c.read(dictadoProvider.notifier);
      await d.iniciar();
      await d.detenerYUsar();
      d.cerrar(); // se cierra la barra sin confirmar

      expect(
        pendientesParaEnviar(c.read(hojaProvider)!).where((x) => x.tipo == TipoPendiente.sinConfirmar),
        hasLength(4),
      );

      d.confirmar();
      expect(camposSinConfirmar(c.read(hojaProvider)!), 0);
      expect(c.read(dictadoProvider).fase, FaseDictado.inactivo);
    });

    test('D7: micrófono bloqueado', () async {
      final c = contenedor(grabadora: GrabadoraPrueba(bloqueada: true));
      await c.read(dictadoProvider.notifier).iniciar();
      expect(c.read(dictadoProvider).fase, FaseDictado.microfonoBloqueado);
    });

    test('D6: audio casi vacío', () async {
      final c = contenedor(grabadora: GrabadoraPrueba(duracion: const Duration(milliseconds: 800)));
      await c.read(hojaProvider.notifier).nuevo(usuarioEditorPrincipal);
      final d = c.read(dictadoProvider.notifier);
      await d.iniciar();
      await d.detenerYUsar();
      expect(c.read(dictadoProvider).fase, FaseDictado.audioInvalido);
    });

    test('D3: sin señal se guarda el audio y se manda solo al volver; luego se borra', () async {
      final local = RepositorioMemoria();
      final c = contenedor(local: local);
      await c.read(hojaProvider.notifier).nuevo(usuarioEditorPrincipal);
      c.read(configProvider.notifier).cambiar((x) => x.copiar(sinConexionSimulada: true));
      final d = c.read(dictadoProvider.notifier);
      await d.iniciar();
      await d.detenerYUsar();
      expect(c.read(dictadoProvider).fase, FaseDictado.guardadoSinConexion);
      expect(await local.audiosPendientes(), hasLength(1));

      c.read(configProvider.notifier).cambiar((x) => x.copiar(sinConexionSimulada: false));
      await esperarA(() => c.read(dictadoProvider).fase == FaseDictado.resultado);
      expect(await local.audiosPendientes(), isEmpty, reason: 'el audio se borra al transcribirse');
    });

    test('G6: el segundo dictado suma y marca la corrección con el valor anterior', () async {
      final c = contenedor();
      final hoja = c.read(hojaProvider.notifier);
      await hoja.nuevo(usuarioEditorPrincipal);
      final d = c.read(dictadoProvider.notifier);
      await d.iniciar();
      await d.detenerYUsar();
      d.confirmar();
      hoja.escribir('hora_llegada', '14:20');

      await d.dictarMas();
      await d.detenerYUsar();
      final p = c.read(hojaProvider)!;
      expect(c.read(dictadoProvider).numeroDictado, 2);
      expect(p.campo('hora_llegada').estadoIa, EstadoIa.corregido);
      expect(p.campo('hora_llegada').valorAnterior, '14:20');
      expect(p.valor('tipo_servicio'), 'Incendio de pastizal', reason: 'lo anterior no se pierde');

      d.dejarComoEstaba();
      final q = c.read(hojaProvider)!;
      expect(q.valor('hora_llegada'), '14:20');
      expect(q.campo('hora_llegada').confirmado, isTrue);
      expect(q.campo('propietario').vacio, isTrue);
    });

    test('Cancelar vuelve a D1 sin tocar la hoja', () async {
      final c = contenedor();
      await c.read(hojaProvider.notifier).nuevo(usuarioEditorPrincipal);
      final antes = c.read(hojaProvider)!.campos.length;
      final d = c.read(dictadoProvider.notifier);
      await d.iniciar();
      await d.cancelar();
      expect(c.read(dictadoProvider).fase, FaseDictado.inactivo);
      expect(c.read(hojaProvider)!.campos.length, antes);
    });
  });
}

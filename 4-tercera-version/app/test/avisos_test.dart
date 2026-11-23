import 'package:bomberos_parte/datos/api_cliente.dart';
import 'package:bomberos_parte/datos/datos_ejemplo.dart';
import 'package:bomberos_parte/datos/modelos.dart';
import 'package:bomberos_parte/datos/repositorio_remoto.dart';
import 'package:bomberos_parte/hoja/validacion_envio.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Avisos (servidor falso, mismas reglas que el real)', () {
    late RemotoFalso remoto;
    setUp(() => remoto = RemotoFalso(retardo: Duration.zero));

    Future<Parte> enviado() async {
      final base = partesServidorEjemplo().first;
      final p = base.copiar(estado: EstadoParte.devuelto);
      final reto = await remoto.retoFirma(p);
      return remoto.enviar(p, reto: reto, firma: 'SIMULADA:x');
    }

    test('al enviar, el capitán recibe un aviso y quien envió, no', () async {
      final p = await enviado();
      final cap = await remoto.notificaciones(usuarioCapitan.id);
      expect(cap.map((n) => n.tipo), [TipoAviso.partePorRevisar]);
      expect(cap.single.folio, p.folio);
      expect(await remoto.notificaciones(p.elaboroId), isEmpty);
    });

    test('devolver avisa a quien lo elaboró, con la nota', () async {
      final p = await enviado();
      await remoto.devolver(p.folio, nota: 'Falta la hora', seccion: 'Datos del servicio', revisor: usuarioCapitan);
      final mios = await remoto.notificaciones(p.elaboroId);
      expect(mios.single.tipo, TipoAviso.parteDevuelto);
      expect(mios.single.texto, contains('Falta la hora'));
    });

    test('validar avisa a quien lo elaboró; marcar leído baja el contador', () async {
      final p = await enviado();
      await remoto.validar(p.folio, reto: 'x:y', contrasena: 'c', revisor: usuarioCapitan);
      var mios = await remoto.notificaciones(p.elaboroId);
      expect(mios.single.tipo, TipoAviso.parteValidado);
      expect(mios.single.leida, isFalse);
      await remoto.marcarAvisoLeido(mios.single.id, usuarioId: p.elaboroId);
      mios = await remoto.notificaciones(p.elaboroId);
      expect(mios.single.leida, isTrue);
    });

    test('cada quien ve sólo los suyos', () async {
      final p = await enviado();
      await remoto.marcarAvisosLeidos(usuarioId: p.elaboroId);
      expect((await remoto.notificaciones(usuarioCapitan.id)).single.leida, isFalse);
    });

    test('guardar la firma pide la contraseña', () async {
      await remoto.entrar(usuarioEditor.matricula, 'x');
      await expectLater(
        remoto.guardarTrazo('1.0,1.0 2.0,2.0 3.0,3.0', contrasena: ''),
        throwsA(isA<ErrorApi>().having((e) => e.codigo, 'codigo', 'contrasena_incorrecta')),
      );
      final u = await remoto.guardarTrazo('1.0,1.0 2.0,2.0 3.0,3.0', contrasena: 'x');
      expect(u.trazo, isNotNull);
      expect((await remoto.notificaciones(usuarioEditor.id)).single.tipo, TipoAviso.firmaCambiada);
    });
  });
}

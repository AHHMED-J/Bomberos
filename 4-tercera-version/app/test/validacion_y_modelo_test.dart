import 'package:bomberos_parte/datos/datos_ejemplo.dart';
import 'package:bomberos_parte/datos/catalogo_campos.dart';
import 'package:bomberos_parte/datos/modelos.dart';
import 'package:bomberos_parte/datos/repositorio_remoto.dart';
import 'package:bomberos_parte/hoja/validacion_envio.dart';
import 'package:bomberos_parte/servicios/firma/servicio_firma.dart';
import 'package:flutter_test/flutter_test.dart';

Parte _vacio() => Parte(
  id: 'x',
  folio: 'PE-PRUEBA',
  estado: EstadoParte.enProgreso,
  elaboroId: 'u',
  elaboroNombre: 'U',
  division: divisionEjemplo,
  creadoEn: DateTime(2026, 11, 9),
);

void main() {
  group('Validación de Enviar', () {
    test('un parte vacío pide todos los campos (todos son obligatorios)', () {
      final tipos = pendientesDeLaHoja(_vacio()).map((p) => p.tipo).toSet();
      expect(tipos, {TipoPendiente.obligatorio});
      expect(
        pendientesDeLaHoja(_vacio()).where((p) => p.tipo == TipoPendiente.obligatorio),
        hasLength(catalogoCampos.length),
      );
    });

    test('el No. de incidente de C-5 tienen que ser 6 números', () {
      final base = partesServidorEjemplo().firstWhere((p) => p.folio == 'PE-2026-0150');
      Parte con(String n) => base.copiar(campos: {...base.campos, 'no_incidente_c5': ValorCampo(valor: n)});
      expect(pendientesDeLaHoja(con('118842')), isEmpty);
      expect(pendientesDeLaHoja(con('11884')).single.campoId, 'no_incidente_c5');
      expect(pendientesDeLaHoja(con('ENS-26-118842')).single.campoId, 'no_incidente_c5');
    });

    test('un parte completo y firmado no tiene pendientes', () {
      final p = partesServidorEjemplo().firstWhere((p) => p.folio == 'PE-2026-0150');
      expect(pendientesParaEnviar(p), isEmpty);
    });

    test('un campo dictado sin confirmar bloquea; «Falta» no cuenta como sin confirmar', () {
      final base = partesServidorEjemplo().firstWhere((p) => p.folio == 'PE-2026-0150');
      final p = base.copiar(
        campos: {
          ...base.campos,
          'propietario': const ValorCampo(
            valor: 'Manuel Torres',
            origen: OrigenCampo.dictado,
            estadoIa: EstadoIa.revisar,
            confirmado: false,
          ),
          'voluntarios': const ValorCampo(origen: OrigenCampo.dictado, estadoIa: EstadoIa.falta, confirmado: false),
        },
      );
      // «Falta» deja el campo vacío: cuenta como obligatorio vacío, no como sin confirmar.
      final pend = pendientesParaEnviar(p).where((x) => x.tipo == TipoPendiente.sinConfirmar);
      expect(pend, hasLength(1));
      expect(pend.single.campoId, 'propietario');
    });

    test('firmas: falta credencial y peritaje', () {
      expect(pendientesDeFirmas(_vacio()).map((p) => p.tipo), [TipoPendiente.firma, TipoPendiente.peritaje]);
    });

    test('el servidor falso rechaza un envío con pendientes', () async {
      final r = RemotoFalso(retardo: Duration.zero);
      final p = _vacio();
      final reto = await r.retoFirma(p);
      expect(() => r.enviar(p, reto: reto, firma: 'x'), throwsA(isA<EnvioRechazado>()));
    });
  });

  group('Modelo', () {
    test('tiempo activo: los huecos de más de 30 s cuentan 30 s', () {
      final t0 = DateTime(2026, 11, 9, 14, 0, 0);
      var p = _vacio().conActividad(t0);
      p = p.conActividad(t0.add(const Duration(seconds: 10)));
      p = p.conActividad(t0.add(const Duration(minutes: 5)));
      expect(p.segActivo, 40);
    });

    test('ida y vuelta por JSON conserva estado de IA, valor anterior y modo', () {
      final p = _vacio().copiar(
        modo: ModoCaptura.teclado,
        campos: {
          'hora_llegada': const ValorCampo(
            valor: '14:35',
            origen: OrigenCampo.dictado,
            estadoIa: EstadoIa.corregido,
            valorAnterior: '14:20',
            confianza: .88,
            confirmado: false,
          ),
        },
      );
      final q = Parte.deJson(p.aJson());
      expect(q.modo, ModoCaptura.teclado);
      expect(q.campo('hora_llegada').estadoIa, EstadoIa.corregido);
      expect(q.campo('hora_llegada').valorAnterior, '14:20');
      expect(q.campo('hora_llegada').pendienteDeConfirmar, isTrue);
    });

    test('el hash coincide con el del servidor (src/validacion.js) byte a byte', () {
      final p = _vacio().copiar(
        fotos: 2,
        campos: {
          'tipo_servicio': const ValorCampo(valor: 'Incendio de pastizal'),
          'descripcion': const ValorCampo(valor: 'Se sofocó el fuego · "pitón" de niebla'),
          'fecha': const ValorCampo(valor: '09/11/2026'),
        },
        firmas: const Firmas(propietarioNombre: 'Peña', requierePeritaje: false),
      );
      // Calculado con: node -e "require('./src/validacion')…" (ver informe).
      expect(
        hashContenido(p.contenidoParaFirmar()),
        '4fd3752e7fd40e950650a2e5917a1f73ee510cb93756e528513cbf1d42b32742',
      );
    });

    test('el hash del contenido cambia si cambia un campo', () {
      final a = _vacio();
      final b = a.copiar(campos: {'descripcion': const ValorCampo(valor: 'otra cosa')});
      expect(hashContenido(a.contenidoParaFirmar()), isNot(hashContenido(b.contenidoParaFirmar())));
      expect(hashContenido(a.contenidoParaFirmar()), hasLength(64));
    });
  });
}

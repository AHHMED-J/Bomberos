import '../../datos/api_cliente.dart';
import '../../datos/modelos.dart';

/// IA 2 (mismo modelo que el llenado) · resumen informal para WhatsApp.
/// No es documento oficial y NO se guarda. Contrato: servidor/CONTRATOS-IA.md § 3.
abstract interface class ServicioResumen {
  Future<String> resumir({required Map<String, ValorCampo> campos, String? transcripcion});
}

class FalsoResumen implements ServicioResumen {
  FalsoResumen({this.retardo = const Duration(milliseconds: 600)});
  final Duration retardo;

  @override
  Future<String> resumir({required Map<String, ValorCampo> campos, String? transcripcion}) async {
    await Future<void>.delayed(retardo);
    String v(String id, String porDefecto) {
      final x = campos[id]?.valor ?? '';
      return x.isEmpty ? porDefecto : x;
    }

    final regreso = v('hora_regreso', '');
    return '🚒 ${v('tipo_servicio', 'Servicio')} en ${v('lugar_servicio', 'lugar por confirmar')}\n'
        '${v('unidad', 'La unidad')} llegó a las ${v('hora_llegada', '--:--')}. '
        '${v('descripcion', '')}'
        '${regreso.isEmpty ? '' : '\nRegreso a base $regreso.'}\n'
        '(Texto de ejemplo generado sin IA)';
  }
}

/// Llama a POST /api/ia/resumen. TODO(IA): el servidor llamará al modelo de resumen.
class ServidorResumen implements ServicioResumen {
  ServidorResumen(this.api);
  final ApiCliente api;

  @override
  Future<String> resumir({required Map<String, ValorCampo> campos, String? transcripcion}) async {
    final r = await api.post('/api/ia/resumen', {
      'campos': {
        for (final e in campos.entries)
          if (!e.value.vacio) e.key: e.value.valor,
      },
      'transcripcion': ?transcripcion,
    });
    return r['texto'] as String;
  }
}

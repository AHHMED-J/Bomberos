import '../../datos/api_cliente.dart';
import '../../datos/catalogo_campos.dart';
import '../../datos/modelos.dart';

/// IA 2 · acomoda la transcripción en las casillas. Contrato: servidor/CONTRATOS-IA.md § 2.
class PropuestaCampo {
  const PropuestaCampo({
    required this.campoId,
    required this.valor,
    required this.estado,
    required this.confianza,
    this.valorAnterior,
    this.evidencia,
  });

  final String campoId;

  /// Vacío cuando estado = falta.
  final String valor;
  final EstadoIa estado;
  final double confianza;

  /// Sólo cuando estado = corregido: lo que había antes.
  final String? valorAnterior;

  /// Fragmento de la transcripción de donde salió el valor.
  final String? evidencia;

  factory PropuestaCampo.deJson(Map<String, dynamic> j) => PropuestaCampo(
    campoId: j['campo'] as String,
    valor: j['valor'] as String? ?? '',
    estado: EstadoIa.values.byName(j['estado'] as String),
    confianza: (j['confianza'] as num?)?.toDouble() ?? 0,
    valorAnterior: j['valor_anterior'] as String?,
    evidencia: j['evidencia'] as String?,
  );
}

class ResultadoLlenado {
  const ResultadoLlenado({required this.propuestas, required this.modelo});
  final List<PropuestaCampo> propuestas;
  final String modelo;

  Iterable<PropuestaCampo> de(EstadoIa e) => propuestas.where((p) => p.estado == e);
  bool get tieneCorrecciones => propuestas.any((p) => p.estado == EstadoIa.corregido);
}

abstract interface class ServicioLlenadoCampos {
  Future<ResultadoLlenado> llenar({
    required String transcripcion,
    required Map<String, ValorCampo> camposActuales,
    List<CampoDef> catalogo = catalogoCampos,
  });
}

/// Respuestas de ejemplo que reproducen las pantallas D5 (primer dictado) y G6 (segundo).
class FalsoLlenadoCampos implements ServicioLlenadoCampos {
  FalsoLlenadoCampos({this.retardo = const Duration(milliseconds: 900)});
  final Duration retardo;

  @override
  Future<ResultadoLlenado> llenar({
    required String transcripcion,
    required Map<String, ValorCampo> camposActuales,
    List<CampoDef> catalogo = catalogoCampos,
  }) async {
    await Future<void>.delayed(retardo);
    final yaHabiaDictado = (camposActuales['tipo_servicio']?.valor ?? '').isNotEmpty;
    if (!yaHabiaDictado) {
      return const ResultadoLlenado(
        modelo: 'falso',
        propuestas: [
          PropuestaCampo(
            campoId: 'tipo_servicio',
            valor: 'Incendio de pastizal',
            estado: EstadoIa.entendido,
            confianza: .96,
            evidencia: 'Incendio de pastizal',
          ),
          PropuestaCampo(
            campoId: 'unidad',
            valor: 'E7 · Estación 3',
            estado: EstadoIa.entendido,
            confianza: .93,
            evidencia: 'Unidad E7 de la estación 3',
          ),
          PropuestaCampo(campoId: 'hora_llegada', valor: '', estado: EstadoIa.falta, confianza: 0),
          PropuestaCampo(
            campoId: 'lugar_servicio',
            valor: 'Calle López Mateos, El Sauzal',
            estado: EstadoIa.revisar,
            confianza: .64,
            evidencia: 'Calle López Mateos, El Sauzal',
          ),
          PropuestaCampo(campoId: 'propietario', valor: '', estado: EstadoIa.falta, confianza: 0),
          PropuestaCampo(
            campoId: 'descripcion',
            valor: 'Se sofocó el fuego con pitón de niebla. No hubo lesionados.',
            estado: EstadoIa.revisar,
            confianza: .71,
          ),
        ],
      );
    }
    final llegadaAntes = camposActuales['hora_llegada']?.valor ?? '';
    return ResultadoLlenado(
      modelo: 'falso',
      propuestas: [
        llegadaAntes.isEmpty
            ? const PropuestaCampo(campoId: 'hora_llegada', valor: '14:35', estado: EstadoIa.revisar, confianza: .8)
            : PropuestaCampo(
                campoId: 'hora_llegada',
                valor: '14:35',
                estado: EstadoIa.corregido,
                confianza: .88,
                valorAnterior: llegadaAntes,
                evidencia: 'Corrijo, llegamos a las 14:35',
              ),
        const PropuestaCampo(
          campoId: 'propietario',
          valor: 'Manuel Torres',
          estado: EstadoIa.revisar,
          confianza: .7,
          evidencia: 'El propietario es Manuel Torres',
        ),
        const PropuestaCampo(
          campoId: 'personal_turno',
          valor: 'R. Cota, D. Mora',
          estado: EstadoIa.revisar,
          confianza: .66,
          evidencia: 'Iban R. Cota y D. Mora',
        ),
      ],
    );
  }
}

/// Llama a POST /api/ia/llenar-campos. TODO(IA): el servidor llamará al modelo de llenado.
class ServidorLlenadoCampos implements ServicioLlenadoCampos {
  ServidorLlenadoCampos(this.api);
  final ApiCliente api;

  @override
  Future<ResultadoLlenado> llenar({
    required String transcripcion,
    required Map<String, ValorCampo> camposActuales,
    List<CampoDef> catalogo = catalogoCampos,
  }) async {
    final r = await api.post('/api/ia/llenar-campos', {
      'transcripcion': {'texto': transcripcion, 'idioma': 'es'},
      'campos_actuales': {
        for (final e in camposActuales.entries)
          if (!e.value.vacio) e.key: {'valor': e.value.valor, 'confirmado': e.value.confirmado},
      },
      'catalogo': [for (final c in catalogo) c.aJson()],
    });
    return ResultadoLlenado(
      modelo: r['modelo'] as String? ?? '?',
      propuestas: [for (final p in (r['campos'] as List)) PropuestaCampo.deJson(p as Map<String, dynamic>)],
    );
  }
}

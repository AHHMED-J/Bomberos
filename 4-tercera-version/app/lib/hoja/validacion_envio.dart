import '../datos/catalogo_campos.dart';
import '../datos/modelos.dart';

enum TipoPendiente { obligatorio, regreso, foto, sinConfirmar, firma, peritaje }

class Pendiente {
  const Pendiente(this.tipo, this.mensaje, {this.campoId, this.seccion});
  final TipoPendiente tipo;
  final String mensaje;
  final String? campoId;
  final SeccionHoja? seccion;

  @override
  String toString() => mensaje;
}

/// Lo que falta para poder pasar a Firmas (pantalla P4 «Antes de enviar faltan»).
/// El servidor repite la misma revisión: nunca se confía sólo en la pantalla.
List<Pendiente> pendientesDeLaHoja(Parte p) {
  final r = <Pendiente>[];
  if (p.valor('hora_regreso').trim().isEmpty) {
    r.add(
      const Pendiente(
        TipoPendiente.regreso,
        'Hora de regreso · presiona Regreso',
        campoId: 'hora_regreso',
        seccion: SeccionHoja.datosServicio,
      ),
    );
  }
  for (final c in catalogoCampos.where((c) => c.obligatorio)) {
    if (p.campo(c.id).vacio) {
      r.add(Pendiente(TipoPendiente.obligatorio, c.etiqueta, campoId: c.id, seccion: c.seccion));
    }
  }
  if (p.fotos < 1) {
    r.add(const Pendiente(TipoPendiente.foto, 'Al menos 1 foto', seccion: SeccionHoja.descripcion));
  }
  for (final e in p.campos.entries.where((e) => e.value.pendienteDeConfirmar)) {
    final def = campoPorId[e.key];
    r.add(
      Pendiente(
        TipoPendiente.sinConfirmar,
        'Sin confirmar: ${def?.etiqueta ?? e.key}',
        campoId: e.key,
        seccion: def?.seccion,
      ),
    );
  }
  return r;
}

/// Lo que falta en la pantalla de Firmas (P5).
List<Pendiente> pendientesDeFirmas(Parte p) {
  final r = <Pendiente>[];
  if (p.firmas.elaboro == null) {
    r.add(const Pendiente(TipoPendiente.firma, 'Firma de quien elabora, con credencial'));
  }
  if (p.firmas.requierePeritaje == null) {
    r.add(const Pendiente(TipoPendiente.peritaje, '¿Requiere peritaje?'));
  }
  return r;
}

/// Todo junto: si está vacío, se puede enviar.
List<Pendiente> pendientesParaEnviar(Parte p) => [...pendientesDeLaHoja(p), ...pendientesDeFirmas(p)];

int camposSinConfirmar(Parte p) => p.campos.values.where((v) => v.pendienteDeConfirmar).length;

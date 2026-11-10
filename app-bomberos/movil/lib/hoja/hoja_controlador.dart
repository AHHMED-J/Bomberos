import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../datos/modelos.dart';
import '../servicios/ia/servicio_llenado_campos.dart';
import '../servicios/proveedores.dart';

String _dosDigitos(int n) => n.toString().padLeft(2, '0');
String horaDe(DateTime t) => '${_dosDigitos(t.hour)}:${_dosDigitos(t.minute)}';
String fechaDe(DateTime t) => '${_dosDigitos(t.day)}/${_dosDigitos(t.month)}/${t.year}';

/// El parte abierto en la Hoja. Cada cambio se guarda en SQLite si está en progreso o devuelto.
class HojaControlador extends Notifier<Parte?> {
  /// Reloj inyectable para las pruebas del tiempo activo.
  DateTime Function() reloj = DateTime.now;

  @override
  Parte? build() => null;

  void abrir(Parte p) => state = p;
  void cerrar() => state = null;

  Future<Parte> nuevo(Usuario u) async {
    final folio = await ref.read(repositorioRemotoProvider).nuevoFolio();
    final ahora = reloj();
    ValorCampo auto(String v) => ValorCampo(valor: v, origen: OrigenCampo.auto);
    final p = Parte(
      id: 'loc-${ahora.microsecondsSinceEpoch}',
      folio: folio,
      estado: EstadoParte.enProgreso,
      elaboroId: u.id,
      elaboroNombre: u.nombre,
      division: u.division,
      creadoEn: ahora,
      modo: ref.read(configProvider).modoNuevoParte,
      ultimaActividad: ahora,
      campos: {
        'fecha': auto(fechaDe(ahora)),
        'unidad': auto('Pipa 04'),
        'turno': auto('A'),
        'estacion': auto(u.estacion),
        'hora_salida': ValorCampo(valor: horaDe(ahora)),
        'personal_turno': ValorCampo(valor: u.nombre),
      },
    );
    state = p;
    await _guardar();
    return p;
  }

  bool get editable {
    final e = state?.estado;
    return e == EstadoParte.enProgreso || e == EstadoParte.devuelto;
  }

  void _actualizar(Parte Function(Parte) f) {
    final p = state;
    if (p == null || !editable) return;
    state = f(p).conActividad(reloj());
    _guardar();
  }

  Future<void> _guardar() async {
    final p = state;
    if (p == null) return;
    await ref.read(repositorioLocalProvider).guardar(p);
  }

  // ---------- Edición a mano ----------

  /// Escribir a mano confirma el campo y quita la marca de la IA.
  void escribir(String campoId, String valor) => _actualizar(
    (p) => p.copiar(
      campos: {
        ...p.campos,
        campoId: ValorCampo(valor: valor, origen: OrigenCampo.manual, confirmado: true),
      },
    ),
  );

  void llegada() => escribir('hora_llegada', horaDe(reloj()));
  void regreso() => escribir('hora_regreso', horaDe(reloj()));
  void agregarFoto() => _actualizar((p) => p.copiar(fotos: p.fotos + 1));
  void croquis(String rutaPng) => _actualizar((p) => p.copiar(croquisPng: rutaPng));
  void firmas(Firmas Function(Firmas) f) => _actualizar((p) => p.copiar(firmas: f(p.firmas)));

  // ---------- Dictado ----------

  /// Las propuestas entran SIN confirmar. Una corrección guarda el valor anterior.
  void aplicarPropuestas(ResultadoLlenado r) => _actualizar((p) {
    final campos = {...p.campos};
    for (final pr in r.propuestas) {
      final antes = campos[pr.campoId] ?? const ValorCampo();
      if (pr.estado == EstadoIa.falta) {
        // Falta: sólo se marca si sigue vacío; no toca lo que ya había.
        if (antes.vacio) {
          campos[pr.campoId] = const ValorCampo(
            origen: OrigenCampo.dictado,
            estadoIa: EstadoIa.falta,
            confirmado: false,
          );
        }
        continue;
      }
      if (!antes.vacio && antes.valor == pr.valor && antes.confirmado) continue; // nada nuevo
      final hayPrevio = !antes.vacio && antes.valor != pr.valor;
      campos[pr.campoId] = ValorCampo(
        valor: pr.valor,
        origen: OrigenCampo.dictado,
        estadoIa: hayPrevio ? EstadoIa.corregido : pr.estado,
        confianza: pr.confianza,
        valorAnterior: hayPrevio ? (pr.valorAnterior ?? antes.valor) : null,
        confirmado: false,
      );
    }
    return p.copiar(campos: campos, modo: p.modo);
  });

  /// «Confirmar» / «Aceptar los cambios»: todo lo propuesto pasa a ser del bombero.
  void confirmarTodo() => _actualizar(
    (p) => p.copiar(
      campos: {
        for (final e in p.campos.entries)
          e.key: e.value.pendienteDeConfirmar ? e.value.copiar(confirmado: true, quitarValorAnterior: true) : e.value,
      },
    ),
  );

  void confirmarCampo(String id) => _actualizar((p) {
    final v = p.campo(id);
    return p.copiar(campos: {...p.campos, id: v.copiar(confirmado: true, quitarValorAnterior: true)});
  });

  /// «Dejar como estaba»: vuelve al valor anterior (o vacía) cada propuesta sin confirmar.
  void descartarPropuestas() => _actualizar((p) {
    final campos = <String, ValorCampo>{};
    for (final e in p.campos.entries) {
      final v = e.value;
      if (!v.pendienteDeConfirmar) {
        campos[e.key] = v;
      } else if (v.valorAnterior != null) {
        campos[e.key] = ValorCampo(valor: v.valorAnterior!, confirmado: true);
      }
    }
    return p.copiar(campos: campos);
  });

  void reemplazar(Parte p) {
    state = p;
    _guardar();
  }
}

final hojaProvider = NotifierProvider<HojaControlador, Parte?>(HojaControlador.new);

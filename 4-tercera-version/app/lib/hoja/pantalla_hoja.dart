import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../acceso/sesion.dart';
import '../compartido/campo_con_estado.dart';
import '../compartido/tema.dart';
import '../croquis/seccion_croquis.dart';
import '../compartido/widgets.dart';
import '../datos/catalogo_campos.dart';
import '../datos/modelos.dart';
import '../dictado/dictado_controlador.dart';
import '../dictado/panel_dictado.dart';
import '../servicios/proveedores.dart';
import 'hoja_controlador.dart';
import 'validacion_envio.dart';

String nombreEstado(EstadoParte e) => switch (e) {
  EstadoParte.enProgreso => 'en curso',
  EstadoParte.enviado => 'enviado',
  EstadoParte.devuelto => 'devuelta',
  EstadoParte.validado => 'firmado',
};

/// P2 · Hoja de incidente completa + botón flotante «Dictar» (D1–D8) + P7 (devuelta).
class PantallaHoja extends ConsumerStatefulWidget {
  const PantallaHoja({super.key});
  @override
  ConsumerState<PantallaHoja> createState() => _PantallaHojaState();
}

class _PantallaHojaState extends ConsumerState<PantallaHoja> {
  /// Botón lateral, llamada o cambio de app a media grabación: se detiene y se usa lo grabado
  /// (si no hay señal, queda guardado para enviarlo después). Así no se pierde el dictado.
  late final AppLifecycleListener _ciclo = AppLifecycleListener(
    onHide: () {
      if (ref.read(dictadoProvider).fase == FaseDictado.grabando) {
        ref.read(dictadoProvider.notifier).detenerYUsar();
      }
    },
  );

  @override
  void initState() {
    super.initState();
    _ciclo; // se crea con la pantalla
  }

  @override
  void dispose() {
    _ciclo.dispose();
    super.dispose();
  }

  void _enviar(Parte p) {
    // P4 si falta algo; si no, directo a Firmas (P5).
    context.push(pendientesDeLaHoja(p).isEmpty ? '/inicio/hoja/firmas' : '/inicio/hoja/enviar');
  }

  @override
  Widget build(BuildContext context) {
    final parte = ref.watch(hojaProvider);
    if (parte == null) return const Scaffold(body: Center(child: Text('No hay parte abierto')));
    final usuario = ref.watch(usuarioActualProvider);
    final dictado = ref.watch(dictadoProvider);
    final enLinea = ref.watch(enLineaProvider);
    final hoja = ref.read(hojaProvider.notifier);
    final editable = hoja.editable;
    final esAutor = parte.elaboroId == usuario.id && editable;
    final grabando = dictado.fase == FaseDictado.grabando;

    // El segundo dictado (o más) abre la pantalla de correcciones G6.
    ref.listen<EstadoDictado>(dictadoProvider, (antes, ahora) {
      if (antes?.fase != FaseDictado.resultado && ahora.fase == FaseDictado.resultado && ahora.numeroDictado >= 2) {
        context.push('/inicio/hoja/segundo-dictado');
      }
      if (ahora.mensaje != null && ahora.fase == FaseDictado.inactivo && antes?.mensaje != ahora.mensaje) {
        avisar(context, ahora.mensaje!);
      }
    });

    Widget campo(String id) => CampoConEstado(
      def: campoDef(id),
      valor: parte.campo(id),
      grabando: grabando,
      editable: editable && !(campoDef(id).soloAutor && !esAutor),
      alCambiar: (v) => hoja.escribir(id, v),
      alConfirmar: () => hoja.confirmarCampo(id),
      // Rojo: lo que sigue vacío en una hoja devuelta (todos los campos son obligatorios).
      resaltarError: editable && parte.campo(id).vacio && parte.estado == EstadoParte.devuelto,
    );

    final muestraDictar =
        editable &&
        parte.modo == ModoCaptura.dictado &&
        const {FaseDictado.inactivo, FaseDictado.audioInvalido, FaseDictado.guardadoSinConexion}.contains(dictado.fase);

    return Scaffold(
      appBar: Encabezado(
        titulo: 'Hoja de incidente',
        subtitulo: '${parte.folio} · ${nombreEstado(parte.estado)}${editable ? '' : ' · sólo lectura'}',
      ),
      floatingActionButton: muestraDictar ? const BotonDictar() : null,
      bottomNavigationBar: editable ? panelDictado(context, ref, dictado, parte, esAutor: esAutor) : null,
      body: Column(
        children: [
          if (!enLinea)
            Container(
              width: double.infinity,
              color: Colores.tinta,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: const Row(
                children: [
                  Icon(Icons.wifi_off, color: Colores.blanco, size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Sin conexión. Lo escrito se guarda en el teléfono y se enviará al volver la señal.',
                      style: TextStyle(color: Colores.blanco, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
              children: [
                if (parte.nota != null && parte.estado == EstadoParte.devuelto)
                  Aviso(
                    tono: TonoAviso.rojo,
                    icono: Icons.undo,
                    child: Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: 'Devuelta por ${parte.nota!.revisor}',
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          if (parte.nota!.texto.trim().isNotEmpty)
                            TextSpan(
                              text: '\n«${parte.nota!.texto}»',
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                        ],
                      ),
                    ),
                  ),
                if (parte.estado == EstadoParte.validado) AvisoFirmado(parte),
                if (parte.modo == ModoCaptura.teclado && editable)
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: ChipBomberos('Experimento A/B · grupo teclado', tono: TonoChip.azul, grande: true),
                  ),
                const SizedBox(height: 12),
                ...casillasDeLaHoja(
                  parte: parte,
                  campo: campo,
                  editable: editable,
                  // TODO: geolocalización real (geolocator). Hoy pone un texto de ejemplo.
                  usarUbicacion: editable
                      ? () => hoja.escribir('lugar_servicio', 'Ubicación actual (ejemplo) 31.866, -116.596')
                      : null,
                ),
                const SizedBox(height: 16),
                if (esAutor)
                  FilledButton(
                    key: const ValueKey('boton-enviar'),
                    onPressed: camposSinConfirmar(parte) > 0 ? null : () => _enviar(parte),
                    child: Text(parte.estado == EstadoParte.devuelto ? 'Reenviar hoja' : 'Enviar hoja de incidente'),
                  ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () => context.push('/inicio/hoja/resumen'),
                  icon: const Icon(Icons.chat_outlined),
                  label: const Text('Ficha para WhatsApp'),
                ),
                const SizedBox(height: 12),
                Text(
                  'Modo: ${parte.modo.name} · tiempo activo: ${parte.segActivo ~/ 60}:${(parte.segActivo % 60).toString().padLeft(2, '0')}',
                  style: Textos.chico,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Las casillas de la hoja, en orden y sin títulos de sección. Las usan la Hoja (P2) y la revisión del
/// Capitán (R3), para que el Capitán vea la misma hoja que llenó el bombero.
List<Widget> casillasDeLaHoja({
  required Parte parte,
  required Widget Function(String id) campo,
  required bool editable,
  VoidCallback? usarUbicacion,
}) {
  Widget fila(List<String> ids) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      for (final (i, id) in ids.indexed) ...[if (i > 0) const SizedBox(width: 8), Expanded(child: campo(id))],
    ],
  );
  return [
    campo('no_incidente_c5'),
    fila(['fecha', 'unidad']),
    fila(['hora_salida', 'hora_llegada']),
    fila(['hora_regreso', 'turno']),
    fila(['estacion', 'zona']),
    campo('tipo_servicio'),
    campo('lugar_servicio'),
    if (usarUbicacion != null)
      Align(
        alignment: Alignment.centerLeft,
        child: TextButton.icon(
          onPressed: usarUbicacion,
          icon: const Icon(Icons.place_outlined, color: Colores.rojo),
          label: const Text(
            'Usar mi ubicación actual',
            style: TextStyle(color: Colores.rojo, decoration: TextDecoration.underline),
          ),
        ),
      ),
    campo('propietario'),
    campo('telefono_propietario'),
    campo('descripcion'),
    campo('personal_turno'),
    campo('voluntarios'),
    campo('unidades_apoyo'),
    campo('instituciones_apoyo'),
    const Text('Croquis', style: Textos.etiqueta),
    const SizedBox(height: 6),
    SeccionCroquis(parte: parte, editable: editable),
  ];
}

/// En un parte firmado por el Capitán: si ya se envió a Dirección o todavía no.
class AvisoFirmado extends StatelessWidget {
  const AvisoFirmado(this.parte, {super.key});
  final Parte parte;
  @override
  Widget build(BuildContext context) {
    final enviado = parte.enviadoDireccionEn;
    final quien = parte.firmas.revisorNombre;
    final firmo = quien == null || quien.isEmpty ? 'Firmado' : 'Firmado por $quien';
    return Aviso(
      key: const ValueKey('aviso-firmado'),
      tono: enviado != null ? TonoAviso.verde : TonoAviso.ambar,
      icono: enviado != null ? Icons.send : Icons.schedule,
      child: Text(
        enviado != null
            ? '$firmo · enviado a Dirección el ${fechaDe(enviado.toLocal())} a las ${horaDe(enviado.toLocal())}'
            : '$firmo · todavía no se envía a Dirección',
      ),
    );
  }
}

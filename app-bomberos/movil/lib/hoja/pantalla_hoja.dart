import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../acceso/sesion.dart';
import '../compartido/campo_con_estado.dart';
import '../compartido/lienzo_firma.dart';
import '../compartido/tema.dart';
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
  EstadoParte.validado => 'validado',
};

/// P2 · Hoja de incidente completa + botón flotante «Dictar» (D1–D8) + P7 (devuelta).
class PantallaHoja extends ConsumerStatefulWidget {
  const PantallaHoja({super.key});
  @override
  ConsumerState<PantallaHoja> createState() => _PantallaHojaState();
}

class _PantallaHojaState extends ConsumerState<PantallaHoja> {
  late final ControlFirma _croquis = ControlFirma();

  @override
  void initState() {
    super.initState();
    // TODO: guardar los trazos del croquis; hoy sólo se marca que se dibujó.
    _croquis.addListener(() {
      final p = ref.read(hojaProvider);
      if (!_croquis.vacio && p != null && !p.croquisDibujado) ref.read(hojaProvider.notifier).croquis(true);
    });
  }

  @override
  void dispose() {
    _croquis.dispose();
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
      // Rojo: obligatorio todavía vacío (y, si la hoja fue devuelta, lo que pidió el Capitán).
      resaltarError:
          editable &&
          parte.campo(id).vacio &&
          (campoDef(id).obligatorio ||
              (parte.nota != null &&
                  parte.estado == EstadoParte.devuelto &&
                  campoDef(id).seccion.titulo == parte.nota!.seccion)),
    );
    Widget fila(List<String> ids) => Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final (i, id) in ids.indexed) ...[if (i > 0) const SizedBox(width: 8), Expanded(child: campo(id))],
      ],
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
                            text: 'Nota de ${parte.nota!.revisor}\n',
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          TextSpan(
                            text: '«${parte.nota!.texto}»\n',
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          TextSpan(text: 'Sección: ${parte.nota!.seccion}', style: const TextStyle(fontSize: 12)),
                        ],
                      ),
                    ),
                  ),
                if (parte.modo == ModoCaptura.teclado && editable)
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: ChipBomberos('Experimento A/B · grupo teclado', tono: TonoChip.azul, grande: true),
                  ),

                // ---------- Datos del servicio ----------
                TituloSeccion(SeccionHoja.datosServicio.titulo),
                if (esAutor) ...[
                  Row(
                    children: [
                      Expanded(
                        child: _BotonHora(
                          texto: 'Llegada',
                          detalle: parte.valor('hora_llegada'),
                          alTocar: hoja.llegada,
                          ayuda: 'Hora y lugar',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _BotonHora(
                          key: const ValueKey('boton-regreso'),
                          texto: 'Regreso',
                          detalle: parte.valor('hora_regreso'),
                          alTocar: hoja.regreso,
                          ayuda: 'Hora',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                ] else if (editable)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 12),
                    child: Aviso(tono: TonoAviso.gris, child: Text('Llegada y Regreso: sólo quien elabora el parte')),
                  ),
                campo('no_incidente_c5'),
                fila(['fecha', 'unidad']),
                fila(['hora_salida', 'hora_regreso']),
                fila(['turno', 'estacion']),
                campo('tipo_servicio'),
                campo('zona'),
                campo('hora_control_fuego'),

                // ---------- Lugar y propietario ----------
                TituloSeccion(SeccionHoja.lugarPropietario.titulo),
                campo('lugar_servicio'),
                if (editable)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      // TODO: geolocalización real (geolocator). Hoy pone un texto de ejemplo.
                      onPressed: () => hoja.escribir('lugar_servicio', 'Ubicación actual (ejemplo) 31.866, -116.596'),
                      icon: const Icon(Icons.place_outlined, color: Colores.rojo),
                      label: const Text(
                        'Usar mi ubicación actual',
                        style: TextStyle(color: Colores.rojo, decoration: TextDecoration.underline),
                      ),
                    ),
                  ),
                campo('propietario'),
                campo('telefono_propietario'),

                // ---------- Descripción + evidencia ----------
                TituloSeccion(SeccionHoja.descripcion.titulo),
                campo('descripcion'),
                const Row(
                  children: [
                    Flexible(child: Text('Evidencia fotográfica', style: Textos.etiqueta)),
                    SizedBox(width: 6),
                    ChipBomberos('Al menos 1', tono: TonoChip.rojo),
                  ],
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (var i = 0; i < parte.fotos; i++)
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          gradient: const LinearGradient(colors: [Color(0xFF6B4A35), Color(0xFF2E2420)]),
                        ),
                        child: const Icon(Icons.image, color: Colors.white54),
                      ),
                    if (editable)
                      InkWell(
                        // TODO: cámara real (image_picker). Hoy suma una foto de ejemplo.
                        onTap: hoja.agregarFoto,
                        child: Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            border: Border.all(color: Colores.borde),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.photo_camera_outlined),
                              Text('Agregar', style: TextStyle(fontSize: 12)),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),

                // ---------- Personal y apoyo ----------
                TituloSeccion(SeccionHoja.personal.titulo),
                campo('personal_turno'),
                campo('voluntarios'),
                TituloSeccion(SeccionHoja.apoyo.titulo),
                campo('unidades_apoyo'),
                campo('instituciones_apoyo'),

                // ---------- Croquis ----------
                TituloSeccion(
                  SeccionHoja.croquis.titulo,
                  extra: const ChipBomberos('Generar con IA · después', tono: TonoChip.neutro),
                ),
                LienzoFirma(
                  control: _croquis,
                  alto: 160,
                  soloLectura: !editable,
                  ayuda: 'Dibuja con el dedo el lugar, las unidades y los puntos de referencia',
                ),

                // ---------- Firmas y envío ----------
                const TituloSeccion('Firmas'),
                const Text('Se firman al presionar Enviar.', style: Textos.chico),
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
                  label: const Text('Resumen para WhatsApp'),
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

class _BotonHora extends StatelessWidget {
  const _BotonHora({super.key, required this.texto, required this.detalle, required this.alTocar, required this.ayuda});
  final String texto;
  final String detalle;
  final VoidCallback alTocar;
  final String ayuda;
  @override
  Widget build(BuildContext context) {
    final hecho = detalle.isNotEmpty;
    return Material(
      color: hecho ? Colores.rojo : Colores.blanco,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: const BorderSide(color: Colores.rojo, width: 1.5),
      ),
      child: InkWell(
        onTap: alTocar,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Column(
            children: [
              Text(
                texto,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: hecho ? Colores.blanco : Colores.rojo,
                ),
              ),
              Text(
                hecho ? detalle : ayuda,
                style: TextStyle(fontSize: 12, color: hecho ? Colores.blanco : Colores.gris),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

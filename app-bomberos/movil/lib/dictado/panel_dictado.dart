import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../compartido/tema.dart';
import '../compartido/widgets.dart';
import '../datos/modelos.dart';
import '../hoja/hoja_controlador.dart';
import '../hoja/validacion_envio.dart';
import 'dictado_controlador.dart';

String mmss(int s) => '${s ~/ 60}:${(s % 60).toString().padLeft(2, '0')}';

/// Botón flotante «Dictar» (D1). Siempre visible dentro de la Hoja si el parte es del grupo dictado.
class BotonDictar extends ConsumerWidget {
  const BotonDictar({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => FloatingActionButton.extended(
    key: const ValueKey('boton-dictar'),
    backgroundColor: Colores.rojo,
    foregroundColor: Colores.blanco,
    onPressed: () => ref.read(dictadoProvider.notifier).iniciar(),
    icon: const Icon(Icons.mic),
    label: const Text('Dictar', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 17)),
  );
}

/// El panel inferior de cada fase (D2–D8). `null` = no hay panel.
Widget? panelDictado(BuildContext context, WidgetRef ref, EstadoDictado e, Parte parte, {required bool esAutor}) {
  final ctrl = ref.read(dictadoProvider.notifier);
  switch (e.fase) {
    case FaseDictado.grabando:
      final faltan = faltaMencionar(parte);
      return PanelInferior(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const ChipBomberos('● Grabando', tono: TonoChip.rojo, grande: true),
                const Spacer(),
                Text(mmss(e.segundos), key: const ValueKey('cronometro'), style: Textos.grande),
              ],
            ),
            const SizedBox(height: 8),
            OndaAudio(niveles: e.niveles),
            if (faltan.isNotEmpty) ...[
              const SizedBox(height: 8),
              const Text('Te falta mencionar:', style: Textos.etiqueta),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [for (final c in faltan.take(6)) ChipBomberos(c.etiqueta, tono: TonoChip.ambar)],
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colores.tinta,
                      side: const BorderSide(color: Colores.borde),
                    ),
                    onPressed: ctrl.cancelar,
                    child: const Text('Cancelar'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.icon(
                    key: const ValueKey('detener-y-usar'),
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                    onPressed: ctrl.detenerYUsar,
                    icon: const Icon(Icons.stop),
                    label: const Text('Detener y usar'),
                  ),
                ),
              ],
            ),
          ],
        ),
      );

    case FaseDictado.guardadoSinConexion:
      final t = e.audioGuardadoEn;
      return PanelInferior(
        color: const Color(0xFFFFFAEA),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const ChipBomberos('Audio guardado', tono: TonoChip.ambar, grande: true),
                const SizedBox(width: 8),
                Text(
                  '${mmss(e.audioGuardadoDuracion?.inSeconds ?? 0)}${t == null ? '' : ' · ${horaDe(t)}'}',
                  style: Textos.chico,
                ),
                const Spacer(),
                IconButton(tooltip: 'Seguir llenando', onPressed: ctrl.cerrar, icon: const Icon(Icons.close)),
              ],
            ),
            Text(
              e.mensaje ?? 'Sin conexión. Se enviará solo cuando vuelva la señal. Puedes seguir llenando la hoja.',
              style: Textos.chico,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: Colores.crema,
                      foregroundColor: Colores.tinta,
                      minimumSize: const Size.fromHeight(48),
                    ),
                    onPressed: () => avisar(context, 'Escuchar: pendiente (no hay audio real todavía)'),
                    child: const Text('Escuchar'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton(onPressed: ctrl.borrarAudioGuardado, child: const Text('Borrar')),
                ),
              ],
            ),
          ],
        ),
      );

    case FaseDictado.procesando:
      Widget paso(PasoProceso p, String texto) {
        final hecho = e.paso.index > p.index;
        final actual = e.paso == p;
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              Icon(
                hecho ? Icons.check_circle : (actual ? Icons.radio_button_checked : Icons.circle),
                color: hecho ? Colores.verde : (actual ? Colores.rojo : Colores.borde),
                size: 20,
              ),
              const SizedBox(width: 10),
              Text(texto, style: TextStyle(color: hecho || actual ? Colores.tinta : Colores.gris, fontSize: 15)),
            ],
          ),
        );
      }
      return PanelInferior(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Procesando tu dictado', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
            const SizedBox(height: 6),
            paso(PasoProceso.enviado, 'Audio enviado'),
            paso(PasoProceso.transcribiendo, 'Transcribiendo'),
            paso(PasoProceso.ordenando, 'Ordenando en la hoja'),
            paso(PasoProceso.resumen, 'Armando el resumen'),
            const SizedBox(height: 6),
            const Text('Puedes seguir llenando la hoja. El audio se borra al transcribir.', style: Textos.chico),
          ],
        ),
      );

    case FaseDictado.resultado:
      final pendientes = parte.campos.values;
      final ent = pendientes.where((v) => v.pendienteDeConfirmar && v.estadoIa == EstadoIa.entendido).length;
      final rev = pendientes
          .where((v) => v.pendienteDeConfirmar && (v.estadoIa == EstadoIa.revisar || v.estadoIa == EstadoIa.corregido))
          .length;
      final fal = pendientes.where((v) => v.estadoIa == EstadoIa.falta && v.vacio).length;
      return PanelInferior(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                ChipBomberos('$ent entendidos', tono: TonoChip.verde),
                ChipBomberos('$rev por revisar', tono: TonoChip.ambar),
                ChipBomberos('$fal faltan', tono: TonoChip.rojo),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: ctrl.dictarMas,
                    icon: const Icon(Icons.mic_none),
                    label: const Text('Dictar más'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.icon(
                    key: const ValueKey('confirmar-dictado'),
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                    onPressed: ctrl.confirmar,
                    icon: const Icon(Icons.check),
                    label: const Text('Confirmar'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Toca un campo para corregirlo. Nada es oficial hasta que confirmes.',
                    style: Textos.chico,
                  ),
                ),
                TextButton(
                  onPressed: () => context.push('/inicio/hoja/resumen'),
                  child: const Text('Resumen WhatsApp'),
                ),
              ],
            ),
          ],
        ),
      );

    case FaseDictado.audioInvalido:
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 90),
        child: Aviso(
          tono: TonoAviso.rojo,
          icono: Icons.error_outline,
          child: Row(
            children: [
              Expanded(
                child: Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: '${e.mensaje ?? 'Casi no se escuchó nada'}\n',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const TextSpan(text: 'Acércate al micrófono o busca un lugar con menos ruido y vuelve a dictar.'),
                    ],
                  ),
                ),
              ),
              IconButton(onPressed: ctrl.cerrar, icon: const Icon(Icons.close, size: 18)),
            ],
          ),
        ),
      );

    case FaseDictado.microfonoBloqueado:
      return PanelInferior(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Row(
              children: [
                CircleAvatar(
                  backgroundColor: Colores.crema,
                  child: Icon(Icons.mic_off, color: Colores.gris),
                ),
                SizedBox(width: 10),
                Text('El micrófono está bloqueado', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              'Para dictar, permite el micrófono a esta app en Ajustes de iOS. Mientras tanto puedes escribir la hoja a mano.',
              style: Textos.chico,
            ),
            const SizedBox(height: 12),
            FilledButton(
              // TODO(audio): abrir 'app-settings:' con url_launcher cuando haya micrófono real.
              onPressed: () => avisar(context, 'Abrir Ajustes: pendiente (micrófono simulado)'),
              child: const Text('Abrir Ajustes'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: ctrl.cerrar, child: const Text('Escribir a mano')),
          ],
        ),
      );

    case FaseDictado.inactivo:
      final n = camposSinConfirmar(parte);
      if (n == 0) return null;
      // D8 · el envío queda bloqueado mientras haya campos dictados sin confirmar.
      return PanelInferior(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Aviso(
              child: Text(
                'Hay $n ${n == 1 ? 'campo' : 'campos'} sin confirmar. Revísalos antes de enviar el parte.',
                key: const ValueKey('aviso-sin-confirmar'),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(onPressed: ctrl.confirmar, child: const Text('Confirmar todo')),
                ),
                if (esAutor) ...[
                  const SizedBox(width: 10),
                  const Expanded(child: FilledButton(onPressed: null, child: Text('Enviar'))),
                ],
              ],
            ),
          ],
        ),
      );
  }
}

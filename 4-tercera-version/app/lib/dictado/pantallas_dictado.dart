import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../compartido/tema.dart';
import '../compartido/widgets.dart';
import '../datos/catalogo_campos.dart';
import '../datos/modelos.dart';
import '../hoja/hoja_controlador.dart';
import 'dictado_controlador.dart';

/// G5 · Resumen informal para WhatsApp. No es documento oficial y NO se guarda.
class PantallaResumen extends ConsumerStatefulWidget {
  const PantallaResumen({super.key});
  @override
  ConsumerState<PantallaResumen> createState() => _PantallaResumenState();
}

class _PantallaResumenState extends ConsumerState<PantallaResumen> {
  bool _cargando = false;

  @override
  void initState() {
    super.initState();
    if (ref.read(dictadoProvider).resumen == null) _regenerar();
  }

  Future<void> _regenerar() async {
    setState(() => _cargando = true);
    await ref.read(dictadoProvider.notifier).regenerarResumen();
    if (mounted) setState(() => _cargando = false);
  }

  @override
  Widget build(BuildContext context) {
    final texto = ref.watch(dictadoProvider).resumen;
    return Scaffold(
      appBar: const Encabezado(titulo: 'Resumen', subtitulo: 'Para compartir en WhatsApp'),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Align(
            alignment: Alignment.centerLeft,
            child: ChipBomberos('Borrador · revísalo antes de enviarlo', tono: TonoChip.ambar, grande: true),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF3F8F1),
              border: Border.all(color: Colores.borde),
              borderRadius: BorderRadius.circular(12),
            ),
            child: _cargando || texto == null
                ? const Center(
                    child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()),
                  )
                : SelectableText(
                    texto,
                    key: const ValueKey('texto-resumen'),
                    style: const TextStyle(fontSize: 17, height: 1.5),
                  ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Es un texto informal para el grupo. No forma parte del parte oficial ni se guarda como documento.',
            style: Textos.chico,
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: texto == null
                ? null
                : () async {
                    await Clipboard.setData(ClipboardData(text: texto));
                    if (context.mounted) avisar(context, 'Resumen copiado');
                  },
            icon: const Icon(Icons.copy),
            label: const Text('Copiar resumen'),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  // TODO: hoja de compartir de iOS (share_plus). Hoy copia el texto.
                  onPressed: texto == null
                      ? null
                      : () async {
                          await Clipboard.setData(ClipboardData(text: texto));
                          if (context.mounted) avisar(context, 'Compartir: pendiente. Se copió el texto.');
                        },
                  child: const Text('Compartir'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: Colores.crema,
                    foregroundColor: Colores.tinta,
                    minimumSize: const Size.fromHeight(52),
                  ),
                  onPressed: _cargando ? null : _regenerar,
                  child: const Text('Regenerar'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// G6 · Segundo dictado: suma información y muestra lo que corrige. Nada se borra sin confirmar.
class PantallaSegundoDictado extends ConsumerWidget {
  const PantallaSegundoDictado({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = ref.watch(hojaProvider);
    if (p == null) return const Scaffold();
    final pendientes = p.campos.entries.where((e) => e.value.pendienteDeConfirmar).toList();
    final corregidos = pendientes.where((e) => e.value.estadoIa == EstadoIa.corregido).toList();
    final nuevos = pendientes.where((e) => e.value.estadoIa != EstadoIa.corregido).toList();
    final ctrl = ref.read(dictadoProvider.notifier);

    Widget tarjeta(MapEntry<String, ValorCampo> e) {
      final v = e.value;
      final etiqueta = campoPorId[e.key]?.etiqueta ?? e.key;
      return Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFFFFAEA),
            border: Border.all(color: const Color(0xFFE2C66B)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(child: Text(etiqueta, style: Textos.etiqueta)),
                  ChipBomberos(
                    v.estadoIa == EstadoIa.corregido
                        ? 'Corregido'
                        : (v.estadoIa == EstadoIa.entendido ? 'Entendido' : 'Revisar'),
                    tono: v.estadoIa == EstadoIa.entendido ? TonoChip.verde : TonoChip.ambar,
                    grande: true,
                  ),
                ],
              ),
              if (v.valorAnterior != null)
                Text(
                  v.valorAnterior!,
                  style: const TextStyle(decoration: TextDecoration.lineThrough, color: Colores.gris),
                ),
              const SizedBox(height: 4),
              Text(v.valor, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: const Encabezado(titulo: 'Hoja de incidente', subtitulo: 'Segundo dictado'),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Wrap(
            spacing: 8,
            children: [
              ChipBomberos(
                '${corregidos.length} corregido${corregidos.length == 1 ? '' : 's'}',
                tono: TonoChip.ambar,
                grande: true,
              ),
              ChipBomberos(
                '${nuevos.length} nuevo${nuevos.length == 1 ? '' : 's'}',
                tono: TonoChip.verde,
                grande: true,
              ),
            ],
          ),
          if (corregidos.isNotEmpty) ...[const TituloSeccion('Corrige lo anterior'), ...corregidos.map(tarjeta)],
          if (nuevos.isNotEmpty) ...[const TituloSeccion('Información nueva'), ...nuevos.map(tarjeta)],
          const SizedBox(height: 8),
          const Text(
            'El segundo audio suma a lo que ya tenías. Si detectamos que corrige algo, te lo mostramos con el valor anterior. Nada se borra sin tu confirmación.',
            style: Textos.chico,
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            key: const ValueKey('aceptar-cambios'),
            onPressed: () {
              ctrl.confirmar();
              context.pop();
            },
            icon: const Icon(Icons.check),
            label: const Text('Aceptar los cambios'),
          ),
          const SizedBox(height: 10),
          OutlinedButton(
            onPressed: () {
              ctrl.dejarComoEstaba();
              context.pop();
            },
            child: const Text('Dejar como estaba'),
          ),
        ],
      ),
    );
  }
}

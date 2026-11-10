import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../acceso/sesion.dart';
import '../compartido/tema.dart';
import '../compartido/widgets.dart';
import '../datos/catalogo_campos.dart';
import '../datos/modelos.dart';
import '../dictado/dictado_controlador.dart';
import '../servicios/proveedores.dart';
import 'hoja_controlador.dart';
import 'validacion_envio.dart';

/// Partes del usuario: los que están en el teléfono (en progreso / devueltos en edición) y los del servidor.
final misDocumentosProvider = FutureProvider.autoDispose<List<Parte>>((ref) async {
  final u = ref.watch(usuarioActualProvider);
  final locales = (await ref.watch(repositorioLocalProvider).partes()).where((p) => p.elaboroId == u.id).toList();
  List<Parte> remotos;
  try {
    remotos = await ref.watch(repositorioRemotoProvider).misPartes(u.id);
  } catch (_) {
    remotos = const []; // sin señal: sólo lo local
  }
  final folios = {for (final p in locales) p.folio};
  return [...locales, ...remotos.where((p) => !folios.contains(p.folio))];
});

/// E6 + G4 · Mis documentos, con los partes en progreso guardados en el teléfono.
class PantallaDocumentos extends ConsumerWidget {
  const PantallaDocumentos({super.key});

  Future<void> _abrir(BuildContext context, WidgetRef ref, Parte p) async {
    ref.read(dictadoProvider.notifier).reiniciar();
    ref.read(hojaProvider.notifier).abrir(p);
    await context.push('/inicio/hoja');
    ref.invalidate(misDocumentosProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final docs = ref.watch(misDocumentosProvider);
    return Scaffold(
      appBar: const Encabezado(titulo: 'Mis documentos'),
      body: docs.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('No se pudo cargar: $e')),
        data: (lista) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(misDocumentosProvider),
          child: lista.isEmpty
              ? ListView(
                  children: const [
                    SizedBox(height: 120),
                    Center(child: Text('Todavía no tienes documentos.', style: Textos.chico)),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: lista.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (_, i) {
                    final p = lista[i];
                    return p.estado == EstadoParte.enProgreso
                        ? _EnProgreso(
                            parte: p,
                            alContinuar: () => _abrir(context, ref, p),
                            alEliminar: () async {
                              final ok = await showDialog<bool>(
                                context: context,
                                builder: (c) => AlertDialog(
                                  title: const Text('¿Eliminar este parte en progreso?'),
                                  content: const Text('Sólo está en este teléfono. No se puede recuperar.'),
                                  actions: [
                                    TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancelar')),
                                    TextButton(onPressed: () => Navigator.pop(c, true), child: const Text('Eliminar')),
                                  ],
                                ),
                              );
                              if (ok == true) {
                                await ref.read(repositorioLocalProvider).borrar(p.id);
                                ref.invalidate(misDocumentosProvider);
                              }
                            },
                          )
                        : _Fila(parte: p, alTocar: () => _abrir(context, ref, p));
                  },
                ),
        ),
      ),
    );
  }
}

class _EnProgreso extends StatelessWidget {
  const _EnProgreso({required this.parte, required this.alContinuar, required this.alEliminar});
  final Parte parte;
  final VoidCallback alContinuar;
  final VoidCallback alEliminar;

  @override
  Widget build(BuildContext context) {
    final faltan = pendientesDeLaHoja(parte);
    // Obligatorios + regreso + al menos una foto.
    final total = catalogoCampos.where((c) => c.obligatorio).length + 2;
    final avance = (1 - faltan.length / total).clamp(0.05, 1.0);
    final tipo = parte.valor('tipo_servicio');
    return Tarjeta(
      borde: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  tipo.isEmpty ? 'Hoja de incidente' : tipo,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
              ),
              if (faltan.isNotEmpty) ChipBomberos('Faltan ${faltan.length}', tono: TonoChip.rojo, grande: true),
            ],
          ),
          const SizedBox(height: 4),
          Text('${parte.folio} · ${parte.valor('fecha')} · ${parte.valor('estacion')}', style: Textos.chico),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: avance,
              minHeight: 7,
              color: Colores.rojo,
              backgroundColor: Colores.crema,
            ),
          ),
          const SizedBox(height: 10),
          const ChipBomberos(
            'Guardado en este teléfono',
            tono: TonoChip.ambar,
            icono: Icons.warning_amber_rounded,
            grande: true,
          ),
          const SizedBox(height: 12),
          FilledButton(onPressed: alContinuar, child: const Text('Continuar ahora')),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: alEliminar,
            style: OutlinedButton.styleFrom(
              foregroundColor: Colores.gris,
              side: const BorderSide(color: Colores.borde),
            ),
            child: const Text('Eliminar este parte en progreso'),
          ),
        ],
      ),
    );
  }
}

class _Fila extends StatelessWidget {
  const _Fila({required this.parte, required this.alTocar});
  final Parte parte;
  final VoidCallback alTocar;

  @override
  Widget build(BuildContext context) {
    final (IconData icono, Color color, String texto, TonoChip tono) = switch (parte.estado) {
      EstadoParte.enviado => (Icons.schedule_send, Colores.azul, 'Enviado · por revisar', TonoChip.azul),
      EstadoParte.validado => (Icons.verified_user, Colores.verde, 'Validado · sellado', TonoChip.verde),
      EstadoParte.devuelto => (Icons.undo, Colores.rojo, 'Corregir', TonoChip.rojo),
      EstadoParte.enProgreso => (Icons.edit, Colores.ambar, 'En progreso', TonoChip.ambar),
    };
    return Tarjeta(
      alTocar: alTocar,
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: color,
            child: Icon(icono, color: Colores.blanco, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Hoja de incidente', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                Text('${parte.folio} · ${parte.valor('tipo_servicio')}', style: Textos.chico),
                if (parte.nota != null)
                  Text(
                    '«${parte.nota!.texto}»',
                    style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Colores.rojo),
                  ),
                const SizedBox(height: 4),
                ChipBomberos(texto, tono: tono),
              ],
            ),
          ),
          const Icon(Icons.chevron_right),
        ],
      ),
    );
  }
}

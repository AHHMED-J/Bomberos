import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../acceso/sesion.dart';
import '../compartido/tema.dart';
import '../compartido/widgets.dart';
import '../datos/modelos.dart';
import '../dictado/dictado_controlador.dart';
import '../revision/revision_controlador.dart';
import 'hoja_controlador.dart';

/// E1 (Editor) y R1 (Capitán): menú de la división.
class PantallaInicio extends ConsumerWidget {
  const PantallaInicio({super.key});

  Future<void> _nuevoParte(BuildContext context, WidgetRef ref, Usuario u) async {
    ref.read(dictadoProvider.notifier).reiniciar();
    await ref.read(hojaProvider.notifier).nuevo(u);
    if (context.mounted) context.push('/inicio/hoja');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sesion = ref.watch(sesionProvider);
    final u = sesion.usuario;
    if (u == null) return const SizedBox.shrink();
    final esCapitan = u.rol == Rol.capitan;
    final porRevisar = esCapitan
        ? ref.watch(bandejaProvider).value?.where((p) => p.estado == EstadoParte.enviado).length
        : null;

    return Scaffold(
      body: Column(
        children: [
          Material(
            color: Colores.rojo,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 8, 22),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(u.division.toUpperCase(), style: Textos.tituloPantalla.copyWith(fontSize: 38)),
                          const SizedBox(height: 4),
                          Text(
                            '${u.nombre} · ${switch (u.rol) {
                              Rol.editor => 'Editor',
                              Rol.capitan => 'Capitán · revisor',
                            }}',
                            style: const TextStyle(color: Colores.blanco),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Avisos (pendiente)',
                      icon: const Icon(Icons.notifications_none, color: Colores.blanco),
                      onPressed: () => avisar(context, 'Avisos: pendiente de diseñar'),
                    ),
                    IconButton(
                      tooltip: 'Salir',
                      icon: const Icon(Icons.logout, color: Colores.blanco),
                      onPressed: () {
                        ref.read(sesionProvider.notifier).salir();
                        context.go('/');
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (sesion.firmaSimulada)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 12),
                    child: Aviso(
                      icono: Icons.info_outline,
                      child: Text('Firma simulada: este teléfono no usó el chip seguro.'),
                    ),
                  ),
                if (esCapitan) ...[
                  BotonMenu(
                    texto: 'Bandeja de revisión',
                    icono: Icons.inbox_outlined,
                    contador: porRevisar,
                    alTocar: () => context.push('/inicio/bandeja'),
                  ),
                ],
                BotonMenu(
                  texto: 'Mis documentos',
                  icono: Icons.folder_outlined,
                  alTocar: () => context.push('/inicio/documentos'),
                ),
                const SizedBox(height: 6),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: .78,
                  children: [
                    _Mosaico(
                      key: const ValueKey('nuevo-parte'),
                      texto: 'Hoja de\nincidente',
                      icono: Icons.assignment_outlined,
                      activo: true,
                      alTocar: () => _nuevoParte(context, ref, u),
                    ),
                    const _Mosaico(texto: 'Lista de\nasistencia', icono: Icons.how_to_reg_outlined),
                    const _Mosaico(texto: 'Notas', icono: Icons.edit_note),
                    const _Mosaico(texto: 'Revisión\nmecánica', icono: Icons.build_outlined),
                  ],
                ),
                const SizedBox(height: 10),
                const Text('Lista de asistencia, Notas y Revisión mecánica llegan en el hito 6.', style: Textos.chico),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Mosaico extends StatelessWidget {
  const _Mosaico({super.key, required this.texto, required this.icono, this.activo = false, this.alTocar});
  final String texto;
  final IconData icono;
  final bool activo;
  final VoidCallback? alTocar;
  @override
  Widget build(BuildContext context) => Tarjeta(
    alTocar: activo ? alTocar : null,
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        CircleAvatar(
          radius: 34,
          backgroundColor: activo ? Colores.rojo : const Color(0xFFE5A9A4),
          child: Icon(icono, size: 32, color: Colores.blanco),
        ),
        const SizedBox(height: 10),
        Text(
          texto,
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 17, color: activo ? Colores.tinta : Colores.gris, height: 1.15),
        ),
        if (!activo) const Padding(padding: EdgeInsets.only(top: 4), child: ChipBomberos('Hito 6')),
      ],
    ),
  );
}

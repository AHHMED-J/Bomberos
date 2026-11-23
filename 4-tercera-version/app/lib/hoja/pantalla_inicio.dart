import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../acceso/avisos.dart';
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
    final sinLeer = ref.watch(avisosProvider.select((a) => a.sinLeer));
    // Un aviso que llega con la app abierta se ve aquí, sin tener que abrir la campana.
    ref.listen(avisosProvider.select((a) => a.nuevos), (_, nuevos) {
      if (nuevos.isEmpty) return;
      avisar(
        context,
        nuevos.length == 1 ? '${nuevos.first.titulo}: ${nuevos.first.texto}' : '${nuevos.length} avisos nuevos',
      );
    });
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
                      key: const ValueKey('avisos'),
                      tooltip: sinLeer == 0 ? 'Avisos' : 'Avisos ($sinLeer sin leer)',
                      icon: Badge(
                        isLabelVisible: sinLeer > 0,
                        label: Text(sinLeer > 9 ? '9+' : '$sinLeer'),
                        backgroundColor: Colores.blanco,
                        textColor: Colores.rojo,
                        child: Icon(
                          sinLeer > 0 ? Icons.notifications : Icons.notifications_none,
                          color: Colores.blanco,
                        ),
                      ),
                      onPressed: () => context.push('/inicio/avisos'),
                    ),
                    IconButton(
                      key: const ValueKey('mi-cuenta'),
                      tooltip: 'Mi cuenta',
                      icon: const Icon(Icons.account_circle_outlined, color: Colores.blanco),
                      onPressed: () => context.push('/inicio/cuenta'),
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
                if (u.trazo == null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Tarjeta(
                      key: const ValueKey('falta-firma'),
                      borde: true,
                      alTocar: () => context.push('/inicio/cuenta'),
                      child: const Row(
                        children: [
                          Icon(Icons.draw_outlined, color: Colores.rojo),
                          SizedBox(width: 12),
                          Expanded(child: Text('Guarda tu firma en Mi cuenta. Sin ella no puedes firmar partes.')),
                          Icon(Icons.chevron_right),
                        ],
                      ),
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
                const SizedBox(height: 24),
                _Mosaico(
                  key: const ValueKey('nuevo-parte'),
                  texto: 'Hoja de incidente',
                  icono: Icons.assignment_outlined,
                  alTocar: () => _nuevoParte(context, ref, u),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Mosaico extends StatelessWidget {
  const _Mosaico({super.key, required this.texto, required this.icono, required this.alTocar});
  final String texto;
  final IconData icono;
  final VoidCallback alTocar;
  @override
  // Botón grande sin tarjeta de fondo: el círculo ocupa ~60 % del ancho (máx. 320).
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, c) {
      final diametro = (c.maxWidth * .6).clamp(160.0, 320.0);
      return InkWell(
        onTap: alTocar,
        borderRadius: BorderRadius.circular(24),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            children: [
              Container(
                width: diametro,
                height: diametro,
                decoration: const BoxDecoration(color: Colores.rojo, shape: BoxShape.circle),
                child: Icon(icono, size: diametro * .45, color: Colores.blanco),
              ),
              const SizedBox(height: 18),
              Text(
                texto,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w600, color: Colores.tinta),
              ),
            ],
          ),
        ),
      );
    },
  );
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../compartido/tema.dart';
import '../compartido/widgets.dart';
import '../datos/modelos.dart';
import 'avisos.dart';
import 'sesion.dart';

/// Avisos: lo que pasó con mis partes (validado, devuelto) o, para el capitán, lo que llegó a su bandeja.
class PantallaAvisos extends ConsumerWidget {
  const PantallaAvisos({super.key});

  static String _hora(DateTime d) {
    final l = d.toLocal();
    String dos(int n) => n.toString().padLeft(2, '0');
    return '${dos(l.day)}/${dos(l.month)} ${dos(l.hour)}:${dos(l.minute)}';
  }

  static (IconData, Color) _icono(TipoAviso t) => switch (t) {
    TipoAviso.parteValidado => (Icons.verified_outlined, Colores.verde),
    TipoAviso.parteDevuelto => (Icons.undo, Colores.rojo),
    TipoAviso.partePorRevisar => (Icons.inbox_outlined, Colores.azul),
    TipoAviso.firmaCambiada => (Icons.draw_outlined, Colores.gris),
  };

  /// Al tocar un aviso de un parte, va a donde se atiende: la bandeja (capitán) o sus documentos.
  void _abrir(BuildContext context, WidgetRef ref, Notificacion n) {
    ref.read(avisosProvider.notifier).marcarLeido(n.id);
    switch (n.tipo) {
      case TipoAviso.partePorRevisar:
        context.push('/inicio/bandeja');
      case TipoAviso.parteDevuelto || TipoAviso.parteValidado:
        context.push('/inicio/documentos');
      case TipoAviso.firmaCambiada:
        context.push('/inicio/cuenta');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final avisos = ref.watch(avisosProvider);
    final u = ref.watch(usuarioActualProvider);
    return Scaffold(
      appBar: Encabezado(
        titulo: 'Avisos',
        subtitulo: avisos.sinLeer == 0 ? u.nombre : '${avisos.sinLeer} sin leer',
        acciones: [
          if (avisos.sinLeer > 0)
            TextButton(
              onPressed: ref.read(avisosProvider.notifier).marcarTodosLeidos,
              child: const Text('Marcar leídos', style: TextStyle(color: Colores.blanco)),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: ref.read(avisosProvider.notifier).actualizar,
        child: avisos.lista.isEmpty
            ? ListView(
                padding: const EdgeInsets.all(32),
                children: const [
                  SizedBox(height: 40),
                  Icon(Icons.notifications_none, size: 56, color: Colores.gris),
                  SizedBox(height: 12),
                  Text(
                    'Todavía no tienes avisos. Aquí verás cuando un parte se valide o te lo devuelvan.',
                    textAlign: TextAlign.center,
                    style: Textos.chico,
                  ),
                ],
              )
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: avisos.lista.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (_, i) {
                  final n = avisos.lista[i];
                  final (icono, color) = _icono(n.tipo);
                  return Tarjeta(
                    key: ValueKey('aviso-${n.id}'),
                    borde: !n.leida,
                    alTocar: () => _abrir(context, ref, n),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: color.withValues(alpha: .12),
                          child: Icon(icono, color: color),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      n.titulo,
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: n.leida ? FontWeight.w500 : FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  if (!n.leida) const Icon(Icons.circle, size: 10, color: Colores.rojo),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(n.texto, style: Textos.cuerpo.copyWith(fontSize: 14)),
                              const SizedBox(height: 4),
                              Text(_hora(n.creadaEn), style: Textos.chico),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
      ),
    );
  }
}

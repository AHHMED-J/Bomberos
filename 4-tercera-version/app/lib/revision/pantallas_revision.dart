import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../acceso/confirmar_identidad.dart';
import '../acceso/sesion.dart';
import '../compartido/campo_con_estado.dart';
import '../compartido/tema.dart';
import '../compartido/widgets.dart';
import '../datos/catalogo_campos.dart';
import '../datos/modelos.dart';
import '../datos/repositorio_remoto.dart';
import '../hoja/hoja_controlador.dart';
import '../hoja/pantalla_hoja.dart';
import 'revision_controlador.dart';

/// Título de una hoja por revisar: su número de incidente de C-5 (o el folio si todavía no lo tiene).
String tituloIncidente(Parte p) {
  final n = p.valor('no_incidente_c5').trim();
  return n.isEmpty ? p.folio : n;
}

/// R2 · Bandeja de revisión, filtrada por la división del capitán.
class PantallaBandeja extends ConsumerWidget {
  const PantallaBandeja({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final u = ref.watch(usuarioActualProvider);
    final bandeja = ref.watch(bandejaProvider);
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: Encabezado(titulo: 'Bandeja de revisión', subtitulo: u.division),
        body: bandeja.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('No se pudo cargar: $e')),
          data: (lista) {
            List<Parte> de(EstadoParte e) => lista.where((p) => p.estado == e).toList();
            final pestanas = [de(EstadoParte.enviado), de(EstadoParte.devuelto), de(EstadoParte.validado)];
            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Container(
                    decoration: BoxDecoration(color: Colores.crema, borderRadius: BorderRadius.circular(10)),
                    child: TabBar(
                      labelColor: Colores.tinta,
                      unselectedLabelColor: Colores.gris,
                      indicatorSize: TabBarIndicatorSize.tab,
                      dividerHeight: 0,
                      indicator: BoxDecoration(color: Colores.blanco, borderRadius: BorderRadius.circular(8)),
                      tabs: [
                        Tab(text: 'Por revisar · ${pestanas[0].length}'),
                        Tab(text: 'Devueltos · ${pestanas[1].length}'),
                        Tab(text: 'Firmados · ${pestanas[2].length}'),
                      ],
                    ),
                  ),
                ),
                Expanded(
                  child: TabBarView(
                    children: [
                      for (final l in pestanas)
                        ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            for (final p in l)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: Tarjeta(
                                  alTocar: () {
                                    ref.read(revisionProvider.notifier).abrir(p);
                                    context.push('/inicio/bandeja/parte/${p.folio}');
                                  },
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              tituloIncidente(p),
                                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                                            ),
                                          ),
                                          if (p.estado == EstadoParte.enviado)
                                            const ChipBomberos('Nuevo', tono: TonoChip.rojo),
                                          if (p.estado == EstadoParte.validado)
                                            p.enviadoDireccionEn != null
                                                ? const ChipBomberos('Enviado a Dirección', tono: TonoChip.verde)
                                                : const ChipBomberos('Sin enviar', tono: TonoChip.ambar),
                                        ],
                                      ),
                                      Text('${p.valor('tipo_servicio')} · ${p.valor('unidad')}'),
                                      Text(
                                        '${p.folio} · ${p.elaboroNombre} · ${p.valor('fecha')}',
                                        style: Textos.chico,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            Text(
                              'Sólo ves las hojas de ${u.division}, donde tienes permiso de Revisor.',
                              style: Textos.chico,
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

/// R3 · Revisar hoja: la misma hoja que llenó el bombero y, al final, Devolver o Firmar.
class PantallaRevisar extends ConsumerStatefulWidget {
  const PantallaRevisar({super.key});
  @override
  ConsumerState<PantallaRevisar> createState() => _PantallaRevisarState();
}

class _PantallaRevisarState extends ConsumerState<PantallaRevisar> {
  bool _ocupado = false;

  /// R4 · Devolver. La nota de qué falta por corregir es opcional.
  Future<void> _devolver() async {
    final nota = TextEditingController();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (c) => Padding(
        padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + MediaQuery.viewInsetsOf(c).bottom),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('DEVOLVER HOJA', style: Textos.tituloSeccion),
            const SizedBox(height: 10),
            const Text('Qué falta por corregir (opcional)', style: Textos.etiqueta),
            const SizedBox(height: 6),
            TextField(
              key: const ValueKey('nota-devolucion'),
              controller: nota,
              autofocus: true,
              minLines: 3,
              maxLines: 5,
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: 8),
            const Text('La hoja vuelve a quien la elaboró para que la corrija.', style: Textos.chico),
            const SizedBox(height: 14),
            FilledButton.icon(
              key: const ValueKey('confirmar-devolver'),
              onPressed: () => Navigator.pop(c, true),
              icon: const Icon(Icons.undo),
              label: const Text('Devolver a quien elaboró'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancelar')),
          ],
        ),
      ),
    );
    final texto = nota.text.trim();
    nota.dispose();
    if (ok != true || !mounted) return;
    setState(() => _ocupado = true);
    try {
      await ref.read(revisionProvider.notifier).devolver(texto, '');
      if (!mounted) return;
      avisar(context, 'Devuelta a quien la elaboró');
      context.pop();
    } catch (e) {
      if (mounted) avisar(context, 'No se pudo devolver: ${mensajeDeError(e)}');
    } finally {
      if (mounted) setState(() => _ocupado = false);
    }
  }

  void _firmar(Parte p) {
    // El servidor pone en el parte la firma guardada en la cuenta del capitán.
    if (ref.read(sesionProvider).usuario?.trazo == null) {
      avisar(context, 'Primero guarda tu firma en Mi cuenta');
      context.push('/inicio/cuenta');
      return;
    }
    context.push('/inicio/bandeja/parte/${p.folio}/validar');
  }

  Future<void> _enviarADireccion() async {
    setState(() => _ocupado = true);
    try {
      await ref.read(revisionProvider.notifier).enviarADireccion();
      if (mounted) avisar(context, 'Enviado a Dirección');
    } catch (e) {
      if (mounted) avisar(context, 'No se pudo enviar: ${mensajeDeError(e)}');
    } finally {
      if (mounted) setState(() => _ocupado = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = ref.watch(revisionProvider).parte;
    if (p == null) return const Scaffold();
    final pendiente = p.estado == EstadoParte.enviado;
    Widget campo(String id) =>
        CampoConEstado(def: campoDef(id), valor: p.campo(id), editable: false, alCambiar: (_) {});
    return Scaffold(
      appBar: Encabezado(titulo: tituloIncidente(p), subtitulo: '${p.folio} · ${p.elaboroNombre}'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          if (p.estado == EstadoParte.validado) ...[
            AvisoFirmado(p),
            if (p.enviadoDireccionEn == null) ...[
              const SizedBox(height: 8),
              FilledButton.icon(
                key: const ValueKey('enviar-direccion'),
                onPressed: _ocupado ? null : _enviarADireccion,
                icon: const Icon(Icons.send),
                label: const Text('Enviar a Dirección'),
              ),
            ],
            const SizedBox(height: 12),
          ],
          if (p.estado == EstadoParte.devuelto) ...[
            Aviso(
              tono: TonoAviso.ambar,
              icono: Icons.undo,
              child: Text(
                (p.nota?.texto ?? '').trim().isEmpty ? 'Devuelta para corregir' : 'Devuelta: «${p.nota!.texto}»',
              ),
            ),
            const SizedBox(height: 12),
          ],
          ...casillasDeLaHoja(parte: p, campo: campo, editable: false),
          if (pendiente) ...[
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    key: const ValueKey('devolver'),
                    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(56)),
                    onPressed: _ocupado ? null : _devolver,
                    icon: const Icon(Icons.undo),
                    label: const Text('Devolver'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.icon(
                    key: const ValueKey('validar'),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF1F7A3A),
                      minimumSize: const Size.fromHeight(56),
                    ),
                    onPressed: _ocupado ? null : () => _firmar(p),
                    icon: const Icon(Icons.draw_outlined),
                    label: const Text('Firmar'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// C1 · Al presionar Firmar se pide de una vez la huella o la cara; abajo está la opción de contraseña.
/// En cuanto confirma, el parte queda firmado (C3).
class PantallaValidar extends ConsumerStatefulWidget {
  const PantallaValidar({super.key});
  @override
  ConsumerState<PantallaValidar> createState() => _PantallaValidarState();
}

class _PantallaValidarState extends ConsumerState<PantallaValidar> {
  bool _ocupado = false;

  @override
  void initState() {
    super.initState();
    // La huella o la cara se piden solas al abrir.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _conBiometria();
    });
  }

  Future<void> _conBiometria() async {
    setState(() => _ocupado = true);
    final error = await ref.read(revisionProvider.notifier).autenticar();
    if (!mounted) return;
    if (error != null) {
      setState(() => _ocupado = false);
      if (error != 'Cancelado') avisar(context, error);
      return;
    }
    await _firmar();
  }

  Future<void> _conContrasena() async {
    final c = await pedirContrasena(context, motivo: 'Escribe tu contraseña para firmar el parte.');
    if (c == null || !mounted) return;
    setState(() => _ocupado = true);
    final error = await ref.read(revisionProvider.notifier).autenticarConContrasena(c);
    if (!mounted) return;
    if (error != null) {
      setState(() => _ocupado = false);
      avisar(context, error);
      return;
    }
    await _firmar();
  }

  Future<void> _firmar() async {
    try {
      await ref.read(revisionProvider.notifier).validar();
      final folio = ref.read(revisionProvider).parte!.folio;
      if (mounted) context.pushReplacement('/inicio/bandeja/parte/$folio/validado');
    } catch (e) {
      if (mounted) {
        setState(() => _ocupado = false);
        avisar(context, 'No se pudo firmar: ${mensajeDeError(e)}');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = ref.watch(revisionProvider).parte!;
    return Scaffold(
      appBar: Encabezado(titulo: 'Firmar', subtitulo: tituloIncidente(p)),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Tarjeta(
            borde: true,
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                const CircleAvatar(
                  radius: 40,
                  backgroundColor: Colores.crema,
                  child: Icon(Icons.fingerprint, size: 40, color: Colores.rojo),
                ),
                const SizedBox(height: 12),
                const Text('Confirma que eres tú', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                const Text(
                  'Usa tu huella o tu cara. Se pone la firma guardada en tu cuenta.',
                  style: Textos.chico,
                  textAlign: TextAlign.center,
                ),
                if (_ocupado) ...[const SizedBox(height: 16), const CircularProgressIndicator()],
              ],
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            key: const ValueKey('usar-face-id'),
            onPressed: _ocupado ? null : _conBiometria,
            icon: const Icon(Icons.face),
            label: const Text('Usar mi huella o cara'),
          ),
          const SizedBox(height: 10),
          OutlinedButton(
            key: const ValueKey('usar-contrasena'),
            onPressed: _ocupado ? null : _conContrasena,
            child: const Text('Usar mi contraseña'),
          ),
          const SizedBox(height: 10),
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: Colores.gris,
              side: const BorderSide(color: Colores.borde),
            ),
            onPressed: _ocupado ? null : () => context.pop(),
            child: const Text('Cancelar'),
          ),
        ],
      ),
    );
  }
}

/// C3 · Parte firmado: regresar al menú o enviarlo a Dirección.
class PantallaValidado extends ConsumerStatefulWidget {
  const PantallaValidado({super.key});
  @override
  ConsumerState<PantallaValidado> createState() => _PantallaValidadoState();
}

class _PantallaValidadoState extends ConsumerState<PantallaValidado> {
  bool _ocupado = false;

  Future<void> _enviarADireccion() async {
    setState(() => _ocupado = true);
    try {
      await ref.read(revisionProvider.notifier).enviarADireccion();
    } catch (e) {
      if (mounted) avisar(context, 'No se pudo enviar: ${mensajeDeError(e)}');
    } finally {
      if (mounted) setState(() => _ocupado = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = ref.watch(revisionProvider).parte!;
    final u = ref.watch(usuarioActualProvider);
    final hoy = DateTime.now();
    final sello = p.sello ?? '';
    final enviado = p.enviadoDireccionEn != null;
    return Scaffold(
      appBar: Encabezado(titulo: 'Parte firmado', subtitulo: tituloIncidente(p), atras: false),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(child: IconoExito(icono: enviado ? Icons.send : Icons.check)),
          const SizedBox(height: 12),
          Center(
            child: Text(
              enviado ? 'Firmado y enviado a Dirección' : 'Firmado',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(height: 16),
          Tarjeta(
            borde: true,
            child: Column(
              children: [
                for (final (k, v) in [
                  ('Firmó', u.nombre),
                  ('Fecha', '${fechaDe(hoy)} · ${horaDe(hoy)}'),
                  (
                    'Sello',
                    sello.length > 12 ? '${sello.substring(0, 4)}…${sello.substring(sello.length - 4)}' : sello,
                  ),
                  ('Dirección', enviado ? 'Enviado' : 'Sin enviar'),
                ])
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 92,
                          child: Text(k, style: const TextStyle(fontWeight: FontWeight.w700)),
                        ),
                        Expanded(child: Text(v)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          if (!enviado) ...[
            FilledButton.icon(
              key: const ValueKey('enviar-direccion'),
              onPressed: _ocupado ? null : _enviarADireccion,
              icon: const Icon(Icons.send),
              label: const Text('Enviar a Dirección'),
            ),
            const SizedBox(height: 10),
          ],
          OutlinedButton.icon(
            key: const ValueKey('regresar-menu'),
            onPressed: _ocupado ? null : () => context.go('/inicio'),
            icon: const Icon(Icons.home_outlined),
            label: const Text('Regresar al menú'),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../acceso/confirmar_identidad.dart';
import '../acceso/sesion.dart';
import '../compartido/lienzo_firma.dart';
import '../compartido/tema.dart';
import '../compartido/widgets.dart';
import '../datos/catalogo_campos.dart';
import '../datos/modelos.dart';
import '../datos/repositorio_remoto.dart';
import '../hoja/hoja_controlador.dart';
import '../hoja/validacion_envio.dart';
import 'revision_controlador.dart';

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
                        const Tab(text: 'Validados'),
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
                                              p.folio,
                                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                                            ),
                                          ),
                                          if (p.estado == EstadoParte.enviado)
                                            const ChipBomberos('Nuevo', tono: TonoChip.rojo),
                                        ],
                                      ),
                                      Text('${p.valor('tipo_servicio')} · ${p.valor('unidad')}'),
                                      Text('${p.elaboroNombre} · ${p.valor('fecha')}', style: Textos.chico),
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

/// R3 · Revisar hoja: qué, cuándo, dónde, quién + revisión automática. R4 · devolver con nota.
class PantallaRevisar extends ConsumerWidget {
  const PantallaRevisar({super.key});

  Future<void> _devolver(BuildContext context, WidgetRef ref) async {
    final nota = TextEditingController();
    var seccion = SeccionHoja.datosServicio.titulo;
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (c) => StatefulBuilder(
        builder: (c, setS) => Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + MediaQuery.viewInsetsOf(c).bottom),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('DEVOLVER CON NOTA', style: Textos.tituloSeccion),
              const SizedBox(height: 10),
              const Row(
                children: [
                  Text('Qué hay que corregir', style: Textos.etiqueta),
                  SizedBox(width: 6),
                  ChipBomberos('Obligatorio', tono: TonoChip.rojo),
                ],
              ),
              const SizedBox(height: 6),
              TextField(key: const ValueKey('nota-devolucion'), controller: nota, minLines: 3, maxLines: 5),
              const SizedBox(height: 12),
              const Text('Sección a corregir', style: Textos.etiqueta),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: seccion,
                items: [for (final s in SeccionHoja.values) DropdownMenuItem(value: s.titulo, child: Text(s.titulo))],
                onChanged: (v) => setS(() => seccion = v ?? seccion),
              ),
              const SizedBox(height: 8),
              const Text('La hoja vuelve a quien la elaboró y abre directo en esa sección.', style: Textos.chico),
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: () => nota.text.trim().isEmpty ? null : Navigator.pop(c, true),
                icon: const Icon(Icons.undo),
                label: const Text('Devolver a quien elaboró'),
              ),
              const SizedBox(height: 8),
              OutlinedButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancelar')),
            ],
          ),
        ),
      ),
    );
    if (ok == true) {
      await ref.read(revisionProvider.notifier).devolver(nota.text.trim(), seccion);
      if (context.mounted) {
        avisar(context, 'Devuelto a quien elaboró');
        context.pop();
      }
    }
    nota.dispose();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = ref.watch(revisionProvider).parte;
    if (p == null) return const Scaffold();
    final faltan = pendientesParaEnviar(p);
    final vacios = catalogoCampos.where((c) => !c.obligatorio && p.campo(c.id).vacio).map((c) => c.etiqueta).take(4);
    Widget dato(String k, String v) => Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: Colores.crema, borderRadius: BorderRadius.circular(10)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              k.toUpperCase(),
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colores.gris),
            ),
            Text(v.isEmpty ? '—' : v, style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
    final pendiente = p.estado == EstadoParte.enviado;
    return Scaffold(
      appBar: Encabezado(titulo: 'Revisar hoja', subtitulo: '${p.folio} · ${p.elaboroNombre}'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              dato('Fecha', p.valor('fecha')),
              const SizedBox(width: 8),
              dato('Horario', '${p.valor('hora_salida')} – ${p.valor('hora_regreso')}'),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              dato('Unidad', p.valor('unidad')),
              const SizedBox(width: 8),
              dato('Servicio', p.valor('tipo_servicio')),
            ],
          ),
          const SizedBox(height: 8),
          Row(children: [dato('Lugar del servicio', p.valor('lugar_servicio'))]),
          const SizedBox(height: 10),
          Aviso(
            tono: faltan.isEmpty ? TonoAviso.verde : TonoAviso.rojo,
            icono: faltan.isEmpty ? Icons.check : Icons.warning_amber_rounded,
            child: Text(
              faltan.isEmpty
                  ? 'Obligatorios completos\nVacíos opcionales: ${vacios.join(', ')}.\nFirmado con credencial${p.firmas.elaboroSimulada ? ' (simulada)' : ''}.'
                  : 'Revisión automática: ${faltan.join(', ')}',
            ),
          ),
          TextButton(
            onPressed: () {
              ref.read(hojaProvider.notifier).abrir(p);
              context.push('/inicio/hoja');
            },
            child: const Text(
              'Ver hoja completa',
              style: TextStyle(color: Colores.rojo, decoration: TextDecoration.underline),
            ),
          ),
          if (p.estado == EstadoParte.validado)
            Aviso(tono: TonoAviso.verde, child: Text('Validado y sellado · ${p.sello?.substring(0, 8)}…')),
          if (p.estado == EstadoParte.devuelto)
            Aviso(tono: TonoAviso.ambar, child: Text('Devuelto: «${p.nota?.texto}»')),
        ],
      ),
      bottomNavigationBar: pendiente
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: () => _devolver(context, ref),
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
                        onPressed: () => context.push('/inicio/bandeja/parte/${p.folio}/validar'),
                        icon: const Icon(Icons.check),
                        label: const Text('Validar'),
                      ),
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }
}

/// C1 (Confirma que eres tú) → C2 (resumen + firma de trazo del perfil) → C3.
class PantallaValidar extends ConsumerStatefulWidget {
  const PantallaValidar({super.key});
  @override
  ConsumerState<PantallaValidar> createState() => _PantallaValidarState();
}

class _PantallaValidarState extends ConsumerState<PantallaValidar> {
  bool _ocupado = false;
  /// Arranca con la firma de la cuenta del capitán; si dibuja otra, se actualiza al validar.
  late final ControlFirma _trazo = ControlFirma(ref.read(sesionProvider).usuario?.trazo);

  @override
  void dispose() {
    _trazo.dispose();
    super.dispose();
  }

  Future<void> _autenticar() async {
    setState(() => _ocupado = true);
    final error = await ref.read(revisionProvider.notifier).autenticar();
    if (!mounted) return;
    setState(() => _ocupado = false);
    if (error != null) avisar(context, error);
  }

  Future<void> _conContrasena() async {
    final c = await pedirContrasena(context, motivo: 'Escribe tu contraseña para validar el parte.');
    if (c == null || !mounted) return;
    setState(() => _ocupado = true);
    final error = await ref.read(revisionProvider.notifier).autenticarConContrasena(c);
    if (!mounted) return;
    setState(() => _ocupado = false);
    if (error != null) avisar(context, error);
  }

  Future<void> _firmarYValidar() async {
    if (_trazo.vacio) return avisar(context, 'Dibuja tu firma');
    final t = _trazo.serializar();
    setState(() => _ocupado = true);
    try {
      // El servidor pone en el parte la firma de la cuenta: si dibujó otra, primero se guarda ahí.
      if (t != ref.read(sesionProvider).usuario?.trazo) {
        final error = await ref.read(sesionProvider.notifier).guardarTrazo(t);
        if (error != null) {
          if (mounted) avisar(context, error);
          return;
        }
      }
      await ref.read(revisionProvider.notifier).validar();
      final folio = ref.read(revisionProvider).parte!.folio;
      if (mounted) context.pushReplacement('/inicio/bandeja/parte/$folio/validado');
    } catch (e) {
      if (mounted) avisar(context, 'No se pudo validar: ${mensajeDeError(e)}');
    } finally {
      if (mounted) setState(() => _ocupado = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(revisionProvider);
    final p = s.parte!;
    final titulo = Encabezado(titulo: 'Validar parte', subtitulo: 'Parte C-5 ${p.valor('no_incidente_c5')}');

    if (!s.confirmado) {
      // C1 · se pide en CADA revisión.
      return Scaffold(
        appBar: titulo,
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Tarjeta(
              borde: true,
              padding: const EdgeInsets.all(20),
              child: const Column(
                children: [
                  CircleAvatar(
                    radius: 40,
                    backgroundColor: Colores.crema,
                    child: Icon(Icons.fingerprint, size: 40, color: Colores.rojo),
                  ),
                  SizedBox(height: 12),
                  Text('Confirma que eres tú', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w600)),
                  SizedBox(height: 6),
                  Text(
                    'Para poner tu firma, usa la biometría de tu celular o tu contraseña. Se pide en cada revisión.',
                    style: Textos.chico,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              key: const ValueKey('usar-face-id'),
              onPressed: _ocupado ? null : _autenticar,
              icon: const Icon(Icons.face),
              label: const Text('Usar mi biometría'),
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
              onPressed: () => context.pop(),
              child: const Text('Cancelar'),
            ),
          ],
        ),
      );
    }

    // C2 · resumen + firma de trazo.
    return Scaffold(
      appBar: titulo,
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const TituloSeccion('Resumen del parte'),
          Tarjeta(
            borde: true,
            child: Column(
              children: [
                for (final (k, v) in [
                  ('Tipo', p.valor('tipo_servicio')),
                  ('Fecha', '${p.valor('fecha')} · ${p.valor('hora_llegada')}'),
                  ('Unidad', p.valor('unidad')),
                  ('Elaboró', p.elaboroNombre),
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
          if (p.firmas.elaboroTrazo != null) ...[
            const TituloSeccion('Firma de quien elaboró'),
            FirmaGuardada(p.firmas.elaboroTrazo!),
          ],
          const TituloSeccion('Tu firma'),
          LienzoFirma(control: _trazo, alto: 150, ayuda: 'Dibuja tu firma; se guarda en tu cuenta'),
          const SizedBox(height: 6),
          Text(
            s.simulada
                ? 'Confirmado (simulado). Es la firma de tu cuenta; si quieres cambiarla, vuelve a dibujarla.'
                : 'Confirmado. Es la firma de tu cuenta; si quieres cambiarla, vuelve a dibujarla.',
            style: Textos.chico,
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            key: const ValueKey('firmar-y-validar'),
            onPressed: _ocupado ? null : _firmarYValidar,
            icon: const Icon(Icons.check),
            label: const Text('Firmar y validar'),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: Colores.crema,
                    foregroundColor: Colores.tinta,
                    minimumSize: const Size.fromHeight(50),
                  ),
                  onPressed: _trazo.limpiar,
                  child: const Text('Volver a dibujar'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colores.gris,
                    side: const BorderSide(color: Colores.borde),
                  ),
                  onPressed: () => context.pop(),
                  child: const Text('Devolver con nota'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// C3 · Parte validado y sellado.
class PantallaValidado extends ConsumerWidget {
  const PantallaValidado({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = ref.watch(revisionProvider).parte!;
    final u = ref.watch(usuarioActualProvider);
    final hoy = DateTime.now();
    final sello = p.sello ?? '';
    return Scaffold(
      appBar: Encabezado(titulo: 'Parte validado', subtitulo: 'Parte C-5 ${p.valor('no_incidente_c5')}', atras: false),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Center(child: IconoExito()),
          const SizedBox(height: 12),
          const Center(
            child: Text('Validado y sellado', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(height: 16),
          Tarjeta(
            borde: true,
            child: Column(
              children: [
                for (final (k, v) in [
                  ('Validó', u.nombre),
                  ('Fecha', '${fechaDe(hoy)} · ${horaDe(hoy)}'),
                  (
                    'Sello',
                    sello.length > 12 ? '${sello.substring(0, 4)}…${sello.substring(sello.length - 4)}' : sello,
                  ),
                  ('Resguardo', 'Hasta ${fechaDe(DateTime(hoy.year + 10, hoy.month, hoy.day))}'),
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
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => avisar(context, 'Descargar PDF: pendiente'),
            icon: const Icon(Icons.download),
            label: const Text('Descargar PDF'),
          ),
          const SizedBox(height: 10),
          FilledButton(onPressed: () => context.go('/inicio/bandeja'), child: const Text('Volver a la bandeja')),
        ],
      ),
    );
  }
}

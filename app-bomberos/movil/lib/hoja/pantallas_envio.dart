import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../acceso/sesion.dart';
import '../compartido/lienzo_firma.dart';
import '../compartido/tema.dart';
import '../compartido/widgets.dart';
import '../datos/datos_ejemplo.dart';
import '../datos/modelos.dart';
import '../datos/repositorio_remoto.dart';
import '../servicios/proveedores.dart';
import 'hoja_controlador.dart';
import 'validacion_envio.dart';

/// P4 · «Antes de enviar faltan»: qué falta y en qué sección.
class PantallaFaltan extends ConsumerWidget {
  const PantallaFaltan({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = ref.watch(hojaProvider)!;
    final faltan = pendientesDeLaHoja(p);
    String v(String id) => p.valor(id).isEmpty ? '—' : p.valor(id);
    final filas = <(String, String)>[
      ('Tipo de servicio', v('tipo_servicio')),
      ('Unidad · turno', '${v('unidad')} · ${v('turno')}'),
      ('Salida · llegada', '${v('hora_salida')} – ${v('hora_llegada')}'),
      ('Personal', v('personal_turno')),
      ('Fotos', '${p.fotos}'),
      ('Tiempo activo', '${p.segActivo ~/ 60}:${(p.segActivo % 60).toString().padLeft(2, '0')}'),
    ];
    return Scaffold(
      appBar: Encabezado(titulo: 'Enviar hoja', subtitulo: p.folio),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (faltan.isNotEmpty)
            Aviso(
              tono: TonoAviso.rojo,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Antes de enviar faltan:', style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  for (final f in faltan)
                    Text(
                      '• ${f.mensaje}${f.seccion == null ? '' : '  (${f.seccion!.titulo})'}',
                      style: const TextStyle(decoration: TextDecoration.underline),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 16),
          for (final (k, val) in filas)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  Expanded(child: Text(k, style: Textos.chico)),
                  Flexible(
                    child: Text(
                      val,
                      textAlign: TextAlign.right,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: faltan.isEmpty ? () => context.pushReplacement('/inicio/hoja/firmas') : null,
            child: const Text('Enviar hoja de incidente'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(onPressed: () => context.pop(), child: const Text('Volver a la hoja')),
        ],
      ),
    );
  }
}

/// P5 · Firmas: el elaboro firma con su credencial (Face ID) al enviar; propietario y testigo con el dedo.
class PantallaFirmas extends ConsumerStatefulWidget {
  const PantallaFirmas({super.key});
  @override
  ConsumerState<PantallaFirmas> createState() => _PantallaFirmasState();
}

class _PantallaFirmasState extends ConsumerState<PantallaFirmas> {
  late final Parte _inicial = ref.read(hojaProvider)!;
  late final _propietario = TextEditingController(
    text: _inicial.firmas.propietarioNombre.isNotEmpty
        ? _inicial.firmas.propietarioNombre
        : _inicial.valor('propietario'),
  );
  late final _testigo = TextEditingController(text: _inicial.firmas.testigoNombre);
  late final _trazoProp = ControlFirma(_inicial.firmas.propietarioTrazo);
  late final _trazoTest = ControlFirma(_inicial.firmas.testigoTrazo);
  bool _enviando = false;
  List<String> _rechazos = const [];

  @override
  void dispose() {
    for (final c in [_propietario, _testigo]) {
      c.dispose();
    }
    _trazoProp.dispose();
    _trazoTest.dispose();
    super.dispose();
  }

  Future<void> _firmarYEnviar() async {
    final hoja = ref.read(hojaProvider.notifier);
    hoja.firmas(
      (f) => f.copiar(
        propietarioNombre: _propietario.text.trim(),
        propietarioTrazo: _trazoProp.vacio ? null : _trazoProp.serializar(),
        testigoNombre: _testigo.text.trim(),
        testigoTrazo: _trazoTest.vacio ? null : _trazoTest.serializar(),
      ),
    );
    setState(() {
      _enviando = true;
      _rechazos = const [];
    });
    try {
      final remoto = ref.read(repositorioRemotoProvider);
      var p = ref.read(hojaProvider)!;
      // 1) Reto con el SHA-256 del contenido  2) Face ID firma  3) el servidor verifica y revisa pendientes.
      final reto = await remoto.retoFirma(p);
      final r = await ref.read(firmaProvider).firmar(reto, motivo: 'Firma el parte ${p.folio}');
      if (!r.ok) {
        if (mounted) avisar(context, r.cancelada ? 'Firma cancelada' : (r.error ?? 'No se pudo firmar'));
        return;
      }
      hoja.firmas((f) => f.copiar(elaboro: r.firma, elaboroSimulada: r.simulada));
      p = ref.read(hojaProvider)!;
      final enviado = await remoto.enviar(p, reto: reto, firma: r.firma!);
      await ref.read(repositorioLocalProvider).borrar(p.id); // ya no es «en progreso»
      hoja.abrir(enviado);
      if (mounted) context.go('/inicio/hoja/enviado');
    } on EnvioRechazado catch (e) {
      setState(() => _rechazos = e.pendientes);
    } catch (e) {
      if (mounted) avisar(context, 'No se pudo enviar (queda guardado en el teléfono): $e');
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = ref.watch(hojaProvider)!;
    final u = ref.watch(usuarioActualProvider);
    final peritaje = p.firmas.requierePeritaje;
    final hoja = ref.read(hojaProvider.notifier);
    return Scaffold(
      appBar: Encabezado(titulo: 'Firmas', subtitulo: p.folio),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
        children: [
          const TituloSeccion('Firma de quien elabora'),
          Aviso(
            tono: p.firmas.elaboro == null ? TonoAviso.gris : TonoAviso.verde,
            icono: Icons.verified_user_outlined,
            child: Text(
              p.firmas.elaboro == null
                  ? 'Firmas con tu credencial (Face ID) al presionar Enviar.\n${u.nombre} · ${u.matricula}'
                  : 'Firmado con credencial${p.firmas.elaboroSimulada ? ' (simulada)' : ''}\n${u.nombre} · ${u.matricula}',
            ),
          ),
          const TituloSeccion('Propietario y testigo'),
          const Text('Nombre del propietario', style: Textos.etiqueta),
          const SizedBox(height: 6),
          TextField(controller: _propietario),
          const SizedBox(height: 8),
          LienzoFirma(control: _trazoProp),
          const SizedBox(height: 14),
          const Text('Nombre del testigo', style: Textos.etiqueta),
          const SizedBox(height: 6),
          TextField(controller: _testigo),
          const SizedBox(height: 8),
          LienzoFirma(control: _trazoTest),
          const TituloSeccion('¿Requiere peritaje?'),
          _Opcion(
            titulo: 'Sí',
            detalle: 'Estoy de acuerdo en que el perito realice los trabajos de investigación.',
            elegido: peritaje == true,
            alTocar: () => hoja.firmas((f) => f.copiar(requierePeritaje: true)),
          ),
          const SizedBox(height: 8),
          _Opcion(
            titulo: 'No',
            detalle: 'No requiero el trabajo de investigación por parte de la Dirección de Bomberos.',
            elegido: peritaje == false,
            alTocar: () => hoja.firmas((f) => f.copiar(requierePeritaje: false)),
          ),
          const Padding(
            padding: EdgeInsets.only(top: 6),
            child: Text('Texto de ejemplo: la redacción legal la define la Dirección.', style: Textos.chico),
          ),
          if (_rechazos.isNotEmpty) ...[
            const SizedBox(height: 12),
            Aviso(
              tono: TonoAviso.rojo,
              child: Text('El servidor rechazó el envío:\n${_rechazos.map((r) => '• $r').join('\n')}'),
            ),
          ],
          const SizedBox(height: 20),
          FilledButton.icon(
            key: const ValueKey('firmar-y-enviar'),
            onPressed: _enviando || peritaje == null ? null : _firmarYEnviar,
            icon: _enviando
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colores.blanco),
                  )
                : const Icon(Icons.face),
            label: const Text('Firmar y enviar hoja'),
          ),
        ],
      ),
    );
  }
}

class _Opcion extends StatelessWidget {
  const _Opcion({required this.titulo, required this.detalle, required this.elegido, required this.alTocar});
  final String titulo;
  final String detalle;
  final bool elegido;
  final VoidCallback alTocar;
  @override
  Widget build(BuildContext context) => Material(
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12),
      side: BorderSide(color: elegido ? Colores.rojo : Colores.borde, width: elegido ? 2 : 1),
    ),
    child: InkWell(
      onTap: alTocar,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(
              elegido ? Icons.radio_button_checked : Icons.radio_button_off,
              color: elegido ? Colores.rojo : Colores.gris,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(titulo, style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text(detalle, style: Textos.chico),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// P6 · Enviado.
class PantallaEnviado extends ConsumerWidget {
  const PantallaEnviado({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = ref.watch(hojaProvider);
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Spacer(),
              const IconoExito(),
              const SizedBox(height: 16),
              const Text(
                'ENVIADO',
                style: TextStyle(
                  fontFamily: Fuentes.titulo,
                  fontWeight: FontWeight.w700,
                  fontSize: 40,
                  color: Color(0xFF1F7A3A),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '${usuarioCapitan.nombre} (revisor de ${p?.division ?? ''}) revisará la hoja',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 18),
              ),
              const SizedBox(height: 8),
              if (p != null)
                Text('Folio ${p.folio} · ${p.enviadoEn == null ? '' : horaDe(p.enviadoEn!)}', style: Textos.chico),
              const Spacer(),
              OutlinedButton.icon(
                // TODO: copia PDF para la estación (requisito #2).
                onPressed: () => avisar(context, 'Copia PDF: pendiente'),
                icon: const Icon(Icons.download),
                label: const Text('Copia PDF para la estación'),
              ),
              const SizedBox(height: 10),
              FilledButton(
                onPressed: () {
                  ref.read(hojaProvider.notifier).cerrar();
                  context.go('/inicio');
                },
                child: const Text('Volver al inicio'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

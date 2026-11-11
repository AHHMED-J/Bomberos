import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../compartido/tema.dart';
import '../compartido/widgets.dart';
import '../datos/modelos.dart';
import '../hoja/hoja_controlador.dart';
import '../servicios/proveedores.dart';
import 'control_croquis.dart';
import 'mapa_en_vivo.dart';
import 'pantalla_captura.dart';

/// Sección «Croquis» de la hoja (K1 y K5 del Figma): botón «Captura» y, debajo, el mapa en vivo
/// o la captura ya guardada.
class SeccionCroquis extends ConsumerStatefulWidget {
  const SeccionCroquis({super.key, required this.parte, required this.editable});
  final Parte parte;
  final bool editable;

  @override
  ConsumerState<SeccionCroquis> createState() => _SeccionCroquisState();
}

class _SeccionCroquisState extends ConsumerState<SeccionCroquis> {
  final _mapa = GlobalKey<MapaEnVivoState>();

  /// Con una captura guardada, el primer «Captura» regresa al mapa en vivo para acomodarlo.
  bool _verMapa = false;
  bool _ocupado = false;

  Future<void> _captura() async {
    if (_ocupado) return;
    if (widget.parte.croquisPng != null && !_verMapa) {
      setState(() => _verMapa = true);
      avisar(context, 'Acomoda el mapa y presiona Captura otra vez.');
      return;
    }
    setState(() => _ocupado = true);
    try {
      final imagen = await _mapa.currentState?.capturar();
      if (imagen == null || !mounted) return;
      final png = await abrirCaptura(context, imagen);
      if (png == null || !mounted) return;
      final almacen = ref.read(almacenCroquisProvider);
      final anterior = ref.read(hojaProvider)?.croquisPng;
      final nueva = await almacen.guardar(widget.parte.id, png);
      ref.read(hojaProvider.notifier).croquis(nueva);
      if (anterior != null && anterior != nueva) await almacen.borrar(anterior); // la nueva reemplaza
      if (!mounted) return;
      setState(() => _verMapa = false);
      avisar(context, 'Croquis guardado como PNG');
    } catch (e) {
      if (mounted) avisar(context, 'No se pudo guardar el croquis. Intenta otra vez.');
      debugPrint('Croquis: ${e.runtimeType}');
    } finally {
      if (mounted) setState(() => _ocupado = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ruta = widget.parte.croquisPng;
    final muestraGuardado = ruta != null && (!_verMapa || !widget.editable);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.editable) ...[
          OutlinedButton.icon(
            key: const ValueKey('boton-captura'),
            onPressed: _ocupado ? null : _captura,
            icon: const Icon(Icons.crop_free, size: 22),
            label: const Text('Captura'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colores.rojo,
              side: const BorderSide(color: Colores.rojo, width: 1.5),
              minimumSize: const Size.fromHeight(54),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              textStyle: const TextStyle(fontFamily: Fuentes.cuerpo, fontSize: 18, fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(height: 12),
        ],
        if (muestraGuardado)
          CroquisGuardado(ruta: ruta)
        else if (widget.editable)
          MapaEnVivo(key: _mapa)
        else
          Container(
            height: 80,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              border: Border.all(color: Colores.borde),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text('Sin croquis', style: Textos.chico),
          ),
        if (widget.editable) ...[
          const SizedBox(height: 8),
          Text(
            muestraGuardado
                ? 'Captura guardada como PNG. Si presionas Captura otra vez, vuelves al mapa en vivo '
                      'y la nueva captura reemplaza a esta.'
                : 'Presiona Captura para congelar el mapa y dibujar encima con el dedo.',
            style: Textos.chico,
          ),
        ],
      ],
    );
  }
}

/// El PNG guardado, con la etiqueta «Captura guardada · PNG».
class CroquisGuardado extends ConsumerStatefulWidget {
  const CroquisGuardado({super.key, required this.ruta});
  final String ruta;

  @override
  ConsumerState<CroquisGuardado> createState() => _CroquisGuardadoState();
}

class _CroquisGuardadoState extends ConsumerState<CroquisGuardado> {
  late Future<Uint8List?> _png = ref.read(almacenCroquisProvider).leer(widget.ruta);

  @override
  void didUpdateWidget(CroquisGuardado antes) {
    super.didUpdateWidget(antes);
    if (antes.ruta != widget.ruta) _png = ref.read(almacenCroquisProvider).leer(widget.ruta);
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<Uint8List?>(
    future: _png,
    builder: (context, s) {
      final bytes = s.data;
      Widget hijo;
      if (s.connectionState != ConnectionState.done) {
        hijo = const SizedBox(height: 200, child: Center(child: CircularProgressIndicator()));
      } else if (bytes == null || !_esPng(bytes)) {
        hijo = const SizedBox(
          height: 120,
          child: Center(child: Text('No se encontró la captura en este teléfono', style: Textos.chico)),
        );
      } else {
        hijo = Stack(
          children: [
            // La proporción sale del encabezado del PNG: la hoja no brinca mientras se decodifica.
            AspectRatio(
              aspectRatio: medidasPng(bytes).$1 / medidasPng(bytes).$2,
              child: Image.memory(bytes, key: const ValueKey('croquis-guardado'), fit: BoxFit.fill),
            ),
            const Positioned(top: 10, left: 10, child: ChipMapa('Captura guardada · PNG')),
          ],
        );
      }
      return Container(
        decoration: BoxDecoration(
          color: fondoMapa,
          border: Border.all(color: Colores.borde),
          borderRadius: BorderRadius.circular(12),
        ),
        child: ClipRRect(borderRadius: BorderRadius.circular(11), child: hijo),
      );
    },
  );
}

bool _esPng(Uint8List b) =>
    b.length > 24 && b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47 && medidasPng(b).$2 > 0;

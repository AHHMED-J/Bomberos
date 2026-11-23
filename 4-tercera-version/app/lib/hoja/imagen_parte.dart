import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../compartido/tema.dart';
import '../servicios/proveedores.dart';

/// Una imagen del parte (foto o croquis). Primero busca el archivo en este teléfono; si no está (el parte lo
/// elaboró otra persona, o se reinstaló la app), la baja del servidor por su SHA-256. Quien puede verla lo decide
/// el servidor: quien elaboró el parte y los capitanes de su división.
class ImagenParte extends ConsumerStatefulWidget {
  const ImagenParte({
    super.key,
    required this.folio,
    this.ruta,
    this.sha256,
    this.esCroquis = false,
    this.ancho,
    this.alto,
    this.ajuste = BoxFit.cover,
  });
  final String folio;

  /// Ruta relativa en este teléfono (puede no existir aquí).
  final String? ruta;

  /// Hash con el que el servidor la tiene, si ya se envió.
  final String? sha256;
  final bool esCroquis;
  final double? ancho;
  final double? alto;
  final BoxFit ajuste;

  @override
  ConsumerState<ImagenParte> createState() => _ImagenParteState();
}

class _ImagenParteState extends ConsumerState<ImagenParte> {
  late Future<Uint8List?> _bytes = _cargar();

  Future<Uint8List?> _cargar() async {
    final ruta = widget.ruta;
    if (ruta != null) {
      final local = widget.esCroquis
          ? await ref.read(almacenCroquisProvider).leer(ruta)
          : await ref.read(almacenFotosProvider).leer(ruta);
      if (local != null) return local;
    }
    final sha = widget.sha256;
    if (sha == null) return null;
    try {
      return await ref.read(repositorioRemotoProvider).leerAdjunto(widget.folio, sha);
    } catch (_) {
      return null;
    }
  }

  @override
  void didUpdateWidget(ImagenParte antes) {
    super.didUpdateWidget(antes);
    if (antes.ruta != widget.ruta || antes.sha256 != widget.sha256 || antes.folio != widget.folio) _bytes = _cargar();
  }

  @override
  Widget build(BuildContext context) {
    Widget caja(Widget hijo) => Container(
      width: widget.ancho,
      height: widget.alto,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        gradient: const LinearGradient(colors: [Color(0xFF6B4A35), Color(0xFF2E2420)]),
      ),
      child: hijo,
    );
    return FutureBuilder<Uint8List?>(
      future: _bytes,
      builder: (context, s) {
        if (s.connectionState != ConnectionState.done) {
          return caja(const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)));
        }
        final bytes = s.data;
        if (bytes == null) return caja(const Icon(Icons.image_not_supported_outlined, color: Colors.white54));
        return ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Image.memory(
            bytes,
            width: widget.ancho,
            height: widget.alto,
            fit: widget.ajuste,
            gaplessPlayback: true,
            errorBuilder: (_, _, _) => caja(const Icon(Icons.broken_image_outlined, color: Colors.white54)),
          ),
        );
      },
    );
  }
}

/// La imagen a pantalla completa, con zoom.
Future<void> verImagenCompleta(BuildContext context, Widget imagen) => showDialog<void>(
  context: context,
  builder: (c) => Dialog.fullscreen(
    backgroundColor: Colors.black,
    child: Stack(
      children: [
        Positioned.fill(
          child: InteractiveViewer(maxScale: 5, child: Center(child: imagen)),
        ),
        SafeArea(
          child: Align(
            alignment: Alignment.topRight,
            child: IconButton(
              tooltip: 'Cerrar',
              icon: const Icon(Icons.close, color: Colores.blanco),
              onPressed: () => Navigator.pop(c),
            ),
          ),
        ),
      ],
    ),
  ),
);

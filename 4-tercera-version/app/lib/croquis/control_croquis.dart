import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

/// Colores del lápiz (los mismos del Figma, pantalla K3).
const coloresCroquis = <(String, Color)>[
  ('Rojo', Color(0xFFE53935)),
  ('Negro', Color(0xFF1C1B19)),
  ('Blanco', Color(0xFFFFFFFF)),
  ('Azul', Color(0xFF1E63D6)),
  ('Amarillo', Color(0xFFF5B700)),
  ('Verde', Color(0xFF2E8B3D)),
];

class Trazo {
  Trazo(this.color, this.grosor, [List<Offset>? puntos]) : puntos = puntos ?? [];
  final Color color;
  final double grosor;
  final List<Offset> puntos;
}

/// Lo que se dibuja encima de la captura, con deshacer y rehacer.
///
/// Los puntos se guardan en coordenadas del recuadro SIN zoom (lo que mide la imagen en pantalla).
/// Así el zoom no cambia nada: al exportar sólo se escala del recuadro al tamaño original.
class ControlCroquis extends ChangeNotifier {
  final List<Trazo> _trazos = [];
  final List<Trazo> _deshechos = [];
  Color color = coloresCroquis.first.$2;
  double grosor = 3.5;

  List<Trazo> get trazos => List.unmodifiable(_trazos);
  bool get puedeDeshacer => _trazos.isNotEmpty;
  bool get puedeRehacer => _deshechos.isNotEmpty;

  void cambiarColor(Color c) {
    color = c;
    notifyListeners();
  }

  void empezar(Offset p) {
    _trazos.add(Trazo(color, grosor, [p]));
    _deshechos.clear(); // un trazo nuevo borra lo que se podía rehacer
    notifyListeners();
  }

  void seguir(Offset p) {
    if (_trazos.isEmpty) return;
    _trazos.last.puntos.add(p);
    notifyListeners();
  }

  void deshacer() {
    if (_trazos.isEmpty) return;
    _deshechos.add(_trazos.removeLast());
    notifyListeners();
  }

  void rehacer() {
    if (_deshechos.isEmpty) return;
    _trazos.add(_deshechos.removeLast());
    notifyListeners();
  }
}

void pintarTrazos(Canvas canvas, List<Trazo> trazos) {
  for (final t in trazos) {
    final pincel = Paint()
      ..color = t.color
      ..strokeWidth = t.grosor
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    if (t.puntos.length == 1) {
      // Un toque sin arrastrar deja un punto.
      canvas.drawCircle(t.puntos.first, t.grosor / 2, pincel..style = PaintingStyle.fill);
      continue;
    }
    final path = Path()..moveTo(t.puntos.first.dx, t.puntos.first.dy);
    for (final o in t.puntos.skip(1)) {
      path.lineTo(o.dx, o.dy);
    }
    canvas.drawPath(path, pincel);
  }
}

class PintorTrazos extends CustomPainter {
  PintorTrazos(this.control) : super(repaint: control);
  final ControlCroquis control;
  @override
  void paint(Canvas canvas, Size size) => pintarTrazos(canvas, control.trazos);
  @override
  bool shouldRepaint(PintorTrazos old) => old.control != control;
}

/// Junta la imagen capturada y los trazos en un PNG del MISMO tamaño que la imagen original,
/// sin importar el zoom ni lo que medía el recuadro en pantalla.
Future<Uint8List> exportarPng(ui.Image base, List<Trazo> trazos, Size recuadro) async {
  final grabadora = ui.PictureRecorder();
  final canvas = Canvas(grabadora);
  canvas.drawImage(base, Offset.zero, Paint());
  canvas.save();
  canvas.scale(base.width / recuadro.width, base.height / recuadro.height);
  pintarTrazos(canvas, trazos);
  canvas.restore();
  final imagen = await grabadora.endRecording().toImage(base.width, base.height);
  try {
    final datos = await imagen.toByteData(format: ui.ImageByteFormat.png);
    return datos!.buffer.asUint8List();
  } finally {
    imagen.dispose();
  }
}

/// Ancho y alto de un PNG leídos de su encabezado (IHDR).
(int, int) medidasPng(Uint8List png) {
  final d = ByteData.sublistView(png);
  return (d.getUint32(16), d.getUint32(20));
}

import 'package:flutter/material.dart';

import 'tema.dart';

/// Controla los trazos de una firma con el dedo (propietario, testigo, capitán) o del croquis.
class ControlFirma extends ChangeNotifier {
  ControlFirma([String? serializado]) {
    if (serializado != null && serializado.isNotEmpty) _trazos.addAll(deserializar(serializado));
  }
  final List<List<Offset>> _trazos = [];
  List<List<Offset>> get trazos => _trazos;
  bool get vacio => _trazos.isEmpty;

  void empezar(Offset p) {
    _trazos.add([p]);
    notifyListeners();
  }

  void seguir(Offset p) {
    if (_trazos.isEmpty) return;
    _trazos.last.add(p);
    notifyListeners();
  }

  void limpiar() {
    _trazos.clear();
    notifyListeners();
  }

  /// «x,y x,y|x,y …» redondeado: pequeño y fácil de guardar en JSON.
  String serializar() =>
      _trazos.map((t) => t.map((o) => '${o.dx.toStringAsFixed(1)},${o.dy.toStringAsFixed(1)}').join(' ')).join('|');

  static List<List<Offset>> deserializar(String s) => [
    for (final t in s.split('|'))
      [
        for (final par in t.split(' '))
          if (par.contains(',')) Offset(double.parse(par.split(',')[0]), double.parse(par.split(',')[1])),
      ],
  ];
}

class LienzoFirma extends StatelessWidget {
  const LienzoFirma({
    super.key,
    required this.control,
    this.alto = 130,
    this.ayuda = 'Toca para firmar',
    this.soloLectura = false,
  });
  final ControlFirma control;
  final double alto;
  final String ayuda;
  final bool soloLectura;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: alto,
      decoration: BoxDecoration(
        color: Colores.blanco,
        border: Border.all(color: Colores.borde),
        borderRadius: BorderRadius.circular(12),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: ListenableBuilder(
          listenable: control,
          builder: (context, _) => GestureDetector(
            onPanStart: soloLectura ? null : (d) => control.empezar(d.localPosition),
            onPanUpdate: soloLectura ? null : (d) => control.seguir(d.localPosition),
            child: CustomPaint(
              painter: _PintorFirma(control.trazos),
              child: control.vacio ? Center(child: Text(ayuda, style: Textos.chico)) : const SizedBox.expand(),
            ),
          ),
        ),
      ),
    );
  }
}

class _PintorFirma extends CustomPainter {
  _PintorFirma(this.trazos);
  final List<List<Offset>> trazos;
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = Colores.tinta
      ..strokeWidth = 2.6
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    for (final t in trazos) {
      if (t.length < 2) continue;
      final path = Path()..moveTo(t.first.dx, t.first.dy);
      for (final o in t.skip(1)) {
        path.lineTo(o.dx, o.dy);
      }
      canvas.drawPath(path, p);
    }
  }

  @override
  bool shouldRepaint(_PintorFirma old) => true;
}

/// Una firma ya guardada (la de la cuenta del usuario o la copia que quedó en un parte), sólo para verla.
class FirmaGuardada extends StatefulWidget {
  const FirmaGuardada(this.trazo, {super.key, this.alto = 150});
  final String trazo;
  final double alto;
  @override
  State<FirmaGuardada> createState() => _FirmaGuardadaState();
}

class _FirmaGuardadaState extends State<FirmaGuardada> {
  late ControlFirma _control = ControlFirma(widget.trazo);

  @override
  void didUpdateWidget(FirmaGuardada anterior) {
    super.didUpdateWidget(anterior);
    if (anterior.trazo != widget.trazo) {
      _control.dispose();
      _control = ControlFirma(widget.trazo);
    }
  }

  @override
  void dispose() {
    _control.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      LienzoFirma(control: _control, alto: widget.alto, ayuda: '', soloLectura: true);
}

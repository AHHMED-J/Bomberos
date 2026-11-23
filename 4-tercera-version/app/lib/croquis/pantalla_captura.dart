import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../compartido/tema.dart';
import 'control_croquis.dart';

const _pildora = Color(0xFF2B2A27);
const _bordePildora = Color(0xFF5A5650);

/// Abre el modo Captura encima de la hoja (que se ve oscurecida detrás).
/// Devuelve el PNG terminado, o null si se canceló.
Future<Uint8List?> abrirCaptura(BuildContext context, ui.Image imagen) => Navigator.of(context).push<Uint8List>(
  PageRouteBuilder<Uint8List>(
    opaque: false,
    barrierColor: Colors.black.withValues(alpha: .8),
    transitionDuration: const Duration(milliseconds: 220),
    reverseTransitionDuration: const Duration(milliseconds: 160),
    pageBuilder: (_, animacion, _) => FadeTransition(
      opacity: animacion,
      child: ScaleTransition(
        scale: Tween(begin: .94, end: 1.0).animate(CurvedAnimation(parent: animacion, curve: Curves.easeOutCubic)),
        child: PantallaCaptura(imagen: imagen),
      ),
    ),
  ),
);

/// Pantallas K2–K4 del Figma: la imagen se agranda, arriba (fuera de ella) van lápiz, color,
/// deshacer y rehacer; abajo «Terminar captura». Con el lápiz apagado se hace zoom DENTRO del
/// mismo recuadro. El PNG siempre sale del tamaño original de la captura, con o sin zoom.
class PantallaCaptura extends StatefulWidget {
  const PantallaCaptura({super.key, required this.imagen});
  final ui.Image imagen;

  @override
  State<PantallaCaptura> createState() => _PantallaCapturaState();
}

class _PantallaCapturaState extends State<PantallaCaptura> {
  final _control = ControlCroquis();
  final _zoom = TransformationController();
  final _anclaColor = LayerLink();
  bool _lapiz = false;
  bool _paleta = false;
  bool _guardando = false;
  Size _recuadro = Size.zero;

  @override
  void initState() {
    super.initState();
    _zoom.addListener(() => setState(() {})); // para el indicador «2×»
  }

  @override
  void dispose() {
    _control.dispose();
    _zoom.dispose();
    super.dispose();
  }

  Future<void> _terminar() async {
    setState(() => _guardando = true);
    final png = await exportarPng(widget.imagen, _control.trazos, _recuadro);
    if (mounted) Navigator.of(context).pop(png);
  }

  void _elegirColor(Color c) {
    _control.cambiarColor(c);
    setState(() {
      _paleta = false;
      _lapiz = true; // elegir color es para dibujar
    });
  }

  @override
  Widget build(BuildContext context) {
    final escala = _zoom.value.getMaxScaleOnAxis();
    return Material(
      type: MaterialType.transparency,
      child: SafeArea(
        child: LayoutBuilder(
          builder: (context, caja) {
            // «Un poco más grande» que en la hoja: 8 px de margen en vez de 16.
            final ancho = caja.maxWidth - 16;
            final alto = ancho * widget.imagen.height / widget.imagen.width;
            _recuadro = Size(ancho, alto);
            return Stack(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(12, 12, 0, 0),
                        child: Row(
                          children: [
                            const Expanded(child: Text('CAPTURA', style: Textos.tituloPantalla)),
                            TextButton(
                              key: const ValueKey('cancelar-captura'),
                              onPressed: _guardando ? null : () => Navigator.of(context).pop(),
                              child: const Text('Cancelar', style: TextStyle(color: Colors.white, fontSize: 16)),
                            ),
                          ],
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(12, 4, 12, 0),
                        child: Text(
                          _lapiz
                              ? 'Dibuja con el dedo. Apaga el lápiz para hacer zoom.'
                              : 'Pellizca para acercar o alejar. Presiona Lápiz para dibujar.',
                          style: TextStyle(color: Colors.white.withValues(alpha: .85), fontSize: 15),
                        ),
                      ),
                      const Spacer(),
                      _barra(),
                      const SizedBox(height: 12),
                      _imagen(ancho, alto, escala),
                      const SizedBox(height: 20),
                      FilledButton.icon(
                        key: const ValueKey('terminar-captura'),
                        onPressed: _guardando ? null : _terminar,
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(56),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          textStyle: const TextStyle(
                            fontFamily: Fuentes.cuerpo,
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        icon: _guardando
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.check),
                        label: const Text('Terminar captura'),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Se guarda como PNG en su tamaño original, aunque tenga zoom.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white.withValues(alpha: .7), fontSize: 13),
                      ),
                      const Spacer(),
                    ],
                  ),
                ),
                if (_paleta)
                  Positioned(
                    left: 0,
                    top: 0,
                    child: CompositedTransformFollower(
                      link: _anclaColor,
                      offset: const Offset(0, 52),
                      showWhenUnlinked: false,
                      child: _Paleta(actual: _control.color, alElegir: _elegirColor),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _barra() => ListenableBuilder(
    listenable: _control,
    builder: (context, _) => Row(
      children: [
        // En pantallas angostas (iPhone SE) lápiz y color se encogen un poco en vez de salirse.
        Expanded(
          child: FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Row(
              children: [
                _Pildora(
                  key: const ValueKey('boton-lapiz'),
                  activa: _lapiz,
                  alTocar: () => setState(() {
                    _lapiz = !_lapiz;
                    _paleta = false;
                  }),
                  children: const [
                    Icon(Icons.edit, color: Colors.white, size: 20),
                    SizedBox(width: 6),
                    Text('Lápiz', style: _textoPildora),
                  ],
                ),
                const SizedBox(width: 8),
                CompositedTransformTarget(
                  link: _anclaColor,
                  child: _Pildora(
                    key: const ValueKey('boton-color'),
                    activa: false,
                    alTocar: () => setState(() => _paleta = !_paleta),
                    children: [
                      Container(
                        key: const ValueKey('color-actual'),
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(
                          color: _control.color,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2.5),
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Text('Color', style: _textoPildora),
                      const Icon(Icons.expand_more, color: Colors.white, size: 18),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 8),
        _Circulo(
          key: const ValueKey('boton-deshacer'),
          icono: Icons.undo,
          etiqueta: 'Deshacer',
          alTocar: _control.puedeDeshacer ? _control.deshacer : null,
        ),
        const SizedBox(width: 8),
        _Circulo(
          key: const ValueKey('boton-rehacer'),
          icono: Icons.redo,
          etiqueta: 'Rehacer',
          alTocar: _control.puedeRehacer ? _control.rehacer : null,
        ),
      ],
    ),
  );

  Widget _imagen(double ancho, double alto, double escala) => Container(
    width: ancho,
    height: alto,
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: Colors.white.withValues(alpha: .9), width: 2),
      boxShadow: const [BoxShadow(color: Color(0x80000000), blurRadius: 24, offset: Offset(0, 6))],
    ),
    child: ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: Stack(
        children: [
          // El zoom crece dentro de este recuadro: no ocupa más pantalla.
          InteractiveViewer(
            key: const ValueKey('zoom-captura'),
            transformationController: _zoom,
            minScale: 1,
            maxScale: 5,
            panEnabled: !_lapiz,
            scaleEnabled: !_lapiz,
            child: SizedBox(
              width: ancho - 4,
              height: alto - 4,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  RawImage(image: widget.imagen, fit: BoxFit.fill),
                  // Los puntos llegan ya en coordenadas sin zoom (el detector está dentro del zoom).
                  GestureDetector(
                    key: const ValueKey('lienzo-captura'),
                    behavior: HitTestBehavior.opaque,
                    onTapUp: _lapiz ? (d) => _control.empezar(d.localPosition) : null,
                    onPanStart: _lapiz ? (d) => _control.empezar(d.localPosition) : null,
                    onPanUpdate: _lapiz ? (d) => _control.seguir(d.localPosition) : null,
                    child: CustomPaint(painter: PintorTrazos(_control)),
                  ),
                ],
              ),
            ),
          ),
          if (escala > 1.05)
            Positioned(
              top: 10,
              right: 10,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colores.tinta.withValues(alpha: .85),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '${escala.toStringAsFixed(escala < 10 ? 1 : 0)}×',
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ),
            ),
        ],
      ),
    ),
  );
}

const _textoPildora = TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600);

class _Pildora extends StatelessWidget {
  const _Pildora({super.key, required this.activa, required this.alTocar, required this.children});
  final bool activa;
  final VoidCallback alTocar;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Material(
    color: activa ? Colores.rojo : _pildora,
    shape: StadiumBorder(side: activa ? BorderSide.none : const BorderSide(color: _bordePildora)),
    child: InkWell(
      customBorder: const StadiumBorder(),
      onTap: alTocar,
      child: SizedBox(
        height: 44,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Row(mainAxisSize: MainAxisSize.min, children: children),
        ),
      ),
    ),
  );
}

class _Circulo extends StatelessWidget {
  const _Circulo({super.key, required this.icono, required this.etiqueta, required this.alTocar});
  final IconData icono;
  final String etiqueta;
  final VoidCallback? alTocar;
  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: etiqueta,
    child: Material(
      color: _pildora,
      shape: const CircleBorder(side: BorderSide(color: _bordePildora)),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: alTocar,
        child: SizedBox(
          width: 44,
          height: 44,
          child: Icon(icono, size: 20, color: alTocar == null ? Colors.white38 : Colors.white),
        ),
      ),
    ),
  );
}

class _Paleta extends StatelessWidget {
  const _Paleta({required this.actual, required this.alElegir});
  final Color actual;
  final ValueChanged<Color> alElegir;
  @override
  Widget build(BuildContext context) => Material(
    color: _pildora,
    elevation: 8,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
      side: const BorderSide(color: _bordePildora),
    ),
    child: Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Color del trazo',
            style: TextStyle(color: Colors.white.withValues(alpha: .8), fontSize: 13, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (final (nombre, c) in coloresCroquis)
                Padding(
                  padding: const EdgeInsets.only(right: 10),
                  child: Semantics(
                    button: true,
                    selected: c == actual,
                    label: nombre,
                    child: GestureDetector(
                      key: ValueKey('color-$nombre'),
                      onTap: () => alElegir(c),
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: c,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: c == actual ? Colors.white : const Color(0xFF8A847B),
                            width: c == actual ? 3 : 1,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    ),
  );
}

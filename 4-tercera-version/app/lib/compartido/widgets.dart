import 'package:flutter/material.dart';

import 'tema.dart';

/// Encabezado rojo con título en mayúsculas (todas las pantallas de Figma lo usan).
class Encabezado extends StatelessWidget implements PreferredSizeWidget {
  const Encabezado({
    super.key,
    required this.titulo,
    this.subtitulo,
    this.atras = true,
    this.acciones = const [],
    this.alAtras,
  });
  final String titulo;
  final String? subtitulo;
  final bool atras;
  final List<Widget> acciones;
  final VoidCallback? alAtras;

  @override
  Size get preferredSize => Size.fromHeight(subtitulo == null ? 84 : 104);

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colores.rojo,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 10, 12, 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (atras)
                IconButton(
                  tooltip: 'Atrás',
                  icon: const Icon(Icons.chevron_left, color: Colores.blanco, size: 30),
                  onPressed: alAtras ?? () => Navigator.of(context).maybePop(),
                )
              else
                const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        titulo.toUpperCase(),
                        style: Textos.tituloPantalla,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (subtitulo != null)
                        Text(
                          subtitulo!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colores.blanco, fontSize: 15),
                        ),
                    ],
                  ),
                ),
              ),
              ...acciones,
            ],
          ),
        ),
      ),
    );
  }
}

enum TonoChip { neutro, verde, ambar, rojo, azul, oscuro }

/// Etiqueta pequeña: Obligatorio, Auto, Entendido, Revisar, Falta, Corregido, Nuevo…
class ChipBomberos extends StatelessWidget {
  const ChipBomberos(this.texto, {super.key, this.tono = TonoChip.neutro, this.icono, this.grande = false});
  final String texto;
  final TonoChip tono;
  final IconData? icono;
  final bool grande;

  @override
  Widget build(BuildContext context) {
    final (fondo, tinta) = switch (tono) {
      TonoChip.neutro => (const Color(0xFFE4E1DC), const Color(0xFF3D3A35)),
      TonoChip.verde => (Colores.verdeClaro, const Color(0xFF1F4D28)),
      TonoChip.ambar => (Colores.ambarClaro, Colores.ambar),
      TonoChip.rojo => (Colores.rojoClaro, Colores.rojoOscuro),
      TonoChip.azul => (Colores.azulClaro, Colores.azul),
      TonoChip.oscuro => (Colores.tinta, Colores.blanco),
    };
    return Container(
      padding: EdgeInsets.symmetric(horizontal: grande ? 12 : 7, vertical: grande ? 5 : 2),
      decoration: BoxDecoration(color: fondo, borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icono != null) ...[Icon(icono, size: grande ? 16 : 12, color: tinta), const SizedBox(width: 4)],
          Text(
            texto.toUpperCase(),
            style: TextStyle(fontSize: grande ? 13 : 10, fontWeight: FontWeight.w700, color: tinta, letterSpacing: .4),
          ),
        ],
      ),
    );
  }
}

class TituloSeccion extends StatelessWidget {
  const TituloSeccion(this.texto, {super.key, this.extra});
  final String texto;
  final Widget? extra;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 22, bottom: 8),
    child: Row(
      children: [
        Expanded(child: Text(texto.toUpperCase(), style: Textos.tituloSeccion)),
        ?extra,
      ],
    ),
  );
}

enum TonoAviso { ambar, rojo, verde, gris }

/// Caja de aviso (falta, guardado en el teléfono, firmado…).
class Aviso extends StatelessWidget {
  const Aviso({super.key, required this.child, this.tono = TonoAviso.ambar, this.icono});
  final Widget child;
  final TonoAviso tono;
  final IconData? icono;
  @override
  Widget build(BuildContext context) {
    final (fondo, tinta) = switch (tono) {
      TonoAviso.ambar => (Colores.ambarClaro, const Color(0xFF4A3800)),
      TonoAviso.rojo => (Colores.rojoClaro, Colores.rojoOscuro),
      TonoAviso.verde => (Colores.verdeClaro, const Color(0xFF1F4D28)),
      TonoAviso.gris => (Colores.crema, Colores.gris),
    };
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: fondo, borderRadius: BorderRadius.circular(12)),
      child: DefaultTextStyle.merge(
        style: TextStyle(color: tinta, fontSize: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (icono != null) ...[Icon(icono, size: 18, color: tinta), const SizedBox(width: 10)],
            Expanded(child: child),
          ],
        ),
      ),
    );
  }
}

/// Panel inferior redondeado (grabando, procesando, resultado, errores).
class PanelInferior extends StatelessWidget {
  const PanelInferior({super.key, required this.child, this.color = Colores.blanco});
  final Widget child;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: EdgeInsets.fromLTRB(16, 10, 16, 16 + MediaQuery.paddingOf(context).bottom),
    decoration: BoxDecoration(
      color: color,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      boxShadow: const [BoxShadow(color: Color(0x33000000), blurRadius: 18, offset: Offset(0, -4))],
    ),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(color: Colores.borde, borderRadius: BorderRadius.circular(2)),
          ),
        ),
        child,
      ],
    ),
  );
}

/// Onda de audio simulada: barras con los últimos niveles.
class OndaAudio extends StatelessWidget {
  const OndaAudio({super.key, required this.niveles, this.alto = 44});
  final List<double> niveles;
  final double alto;
  @override
  Widget build(BuildContext context) => SizedBox(
    height: alto,
    width: double.infinity,
    child: CustomPaint(painter: _PintorOnda(niveles)),
  );
}

class _PintorOnda extends CustomPainter {
  _PintorOnda(this.niveles);
  final List<double> niveles;
  @override
  void paint(Canvas canvas, Size size) {
    const barras = 40;
    final ancho = size.width / barras;
    final pincel = Paint()
      ..color = Colores.rojo
      ..strokeCap = StrokeCap.round
      ..strokeWidth = ancho * .55;
    for (var i = 0; i < barras; i++) {
      final idx = niveles.length - barras + i;
      final n = idx >= 0 ? niveles[idx] : .08;
      final h = (size.height * n).clamp(3.0, size.height);
      final x = i * ancho + ancho / 2;
      canvas.drawLine(Offset(x, (size.height - h) / 2), Offset(x, (size.height + h) / 2), pincel);
    }
  }

  @override
  bool shouldRepaint(_PintorOnda old) => old.niveles != niveles;
}

/// Tarjeta crema con esquina redondeada.
class Tarjeta extends StatelessWidget {
  const Tarjeta({
    super.key,
    required this.child,
    this.alTocar,
    this.borde = false,
    this.padding = const EdgeInsets.all(14),
  });
  final Widget child;
  final VoidCallback? alTocar;
  final bool borde;
  final EdgeInsets padding;
  @override
  Widget build(BuildContext context) => Material(
    color: borde ? Colores.blanco : Colores.crema,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
      side: borde ? const BorderSide(color: Colores.borde) : BorderSide.none,
    ),
    child: InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: alTocar,
      child: Padding(padding: padding, child: child),
    ),
  );
}

/// Botón negro de menú («Mis documentos ›»).
class BotonMenu extends StatelessWidget {
  const BotonMenu({super.key, required this.texto, required this.icono, required this.alTocar, this.contador});
  final String texto;
  final IconData icono;
  final VoidCallback alTocar;
  final int? contador;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Material(
      color: Colores.tinta,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: alTocar,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          child: Row(
            children: [
              Icon(icono, color: Colores.blanco, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  texto,
                  style: const TextStyle(color: Colores.blanco, fontWeight: FontWeight.w600, fontSize: 16),
                ),
              ),
              if (contador != null && contador! > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: Colores.rojo, borderRadius: BorderRadius.circular(99)),
                  child: Text(
                    '$contador',
                    style: const TextStyle(color: Colores.blanco, fontWeight: FontWeight.w700),
                  ),
                ),
              const Icon(Icons.chevron_right, color: Colores.blanco),
            ],
          ),
        ),
      ),
    ),
  );
}

/// Círculo con icono grande y check/escudo (Enviado, Validado).
class IconoExito extends StatelessWidget {
  const IconoExito({super.key, this.icono = Icons.check});
  final IconData icono;
  @override
  Widget build(BuildContext context) => Container(
    width: 96,
    height: 96,
    decoration: const BoxDecoration(color: Color(0xFF1F7A3A), shape: BoxShape.circle),
    child: Icon(icono, color: Colores.blanco, size: 52),
  );
}

void avisar(BuildContext context, String texto) => ScaffoldMessenger.of(context)
  ..hideCurrentSnackBar()
  ..showSnackBar(SnackBar(content: Text(texto)));

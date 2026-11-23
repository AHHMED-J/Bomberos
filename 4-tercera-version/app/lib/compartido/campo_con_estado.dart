import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../datos/catalogo_campos.dart';
import '../datos/modelos.dart';
import 'tema.dart';
import 'widgets.dart';

/// Separador de los elementos de un campo de lista (personal, voluntarios, unidades).
const separadorLista = '; ';

List<String> elementosDeLista(String valor) => [
  for (final e in valor.split(';'))
    if (e.trim().isNotEmpty) e.trim(),
];

/// Una casilla de la hoja con su marca de dictado (Entendido / Revisar / Falta / Corregido).
class CampoConEstado extends StatefulWidget {
  const CampoConEstado({
    super.key,
    required this.def,
    required this.valor,
    required this.alCambiar,
    this.grabando = false,
    this.editable = true,
    this.alConfirmar,
    this.resaltarError = false,
  });

  final CampoDef def;
  final ValorCampo valor;
  final ValueChanged<String> alCambiar;

  /// Mientras se graba, las casillas vacías muestran «Di: …».
  final bool grabando;
  final bool editable;
  final VoidCallback? alConfirmar;

  /// Borde rojo (campo pedido por el revisor o pendiente al enviar).
  final bool resaltarError;

  @override
  State<CampoConEstado> createState() => _CampoConEstadoState();
}

class _CampoConEstadoState extends State<CampoConEstado> {
  late final TextEditingController _ctrl = TextEditingController(text: widget.valor.valor);
  final _foco = FocusNode();

  @override
  void didUpdateWidget(CampoConEstado old) {
    super.didUpdateWidget(old);
    if (widget.valor.valor != _ctrl.text && !_foco.hasFocus) _ctrl.text = widget.valor.valor;
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _foco.dispose();
    super.dispose();
  }

  Future<void> _elegir() async {
    final def = widget.def;
    final elegido = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (c) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(def.etiqueta, style: Textos.etiqueta),
            ),
            for (final o in def.opciones)
              ListTile(
                title: Text(o),
                trailing: o == widget.valor.valor ? const Icon(Icons.check, color: Colores.rojo) : null,
                onTap: () => Navigator.pop(c, o),
              ),
          ],
        ),
      ),
    );
    // Al tocar la casilla se queda con el foco, y con foco didUpdateWidget no copia el valor nuevo:
    // se pone aquí para que se vea de inmediato, sin esperar a pasar a la siguiente.
    _foco.unfocus();
    if (elegido == null || !mounted) return;
    _ctrl.text = elegido;
    widget.alCambiar(elegido);
  }

  @override
  Widget build(BuildContext context) {
    final v = widget.valor;
    final def = widget.def;
    final estado = v.estadoIa;
    final (Color fondo, Color borde) = switch (estado) {
      EstadoIa.revisar ||
      EstadoIa.corregido when v.pendienteDeConfirmar => (const Color(0xFFFFFAEA), const Color(0xFFE2C66B)),
      EstadoIa.falta when v.vacio => (const Color(0xFFFDF1EF), const Color(0xFFF0B9B3)),
      _ => (Colores.blanco, widget.resaltarError ? Colores.rojo : Colores.borde),
    };
    final hint = switch (estado) {
      EstadoIa.falta when v.vacio => 'Sin dato · se llena a mano',
      _ when widget.grabando && v.vacio && def.sugerencia != null => def.sugerencia,
      _ when def.tipo == TipoCampo.hora => 'HH:MM',
      _ when def.digitos != null => '${def.digitos} números',
      _ => null,
    };
    final eligeDeLista = def.tipo == TipoCampo.opcion;
    final esHora = def.tipo == TipoCampo.hora;

    final confirmar = v.pendienteDeConfirmar && widget.alConfirmar != null
        ? IconButton(
            tooltip: 'Confirmar este campo',
            icon: const Icon(Icons.check_circle_outline, color: Colores.verde),
            onPressed: widget.alConfirmar,
          )
        : null;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Flexible(child: Text(def.etiqueta, style: Textos.etiqueta)),
              const Spacer(),
              if (estado != null && (v.pendienteDeConfirmar || (estado == EstadoIa.falta && v.vacio)))
                ChipBomberos(
                  switch (estado) {
                    EstadoIa.entendido => 'Entendido',
                    EstadoIa.revisar => 'Revisar',
                    EstadoIa.falta => 'Falta',
                    EstadoIa.corregido => 'Corregido',
                  },
                  tono: switch (estado) {
                    EstadoIa.entendido => TonoChip.verde,
                    EstadoIa.falta => TonoChip.rojo,
                    _ => TonoChip.ambar,
                  },
                ),
            ],
          ),
          if (estado == EstadoIa.corregido && v.valorAnterior != null && v.pendienteDeConfirmar)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                v.valorAnterior!,
                style: const TextStyle(decoration: TextDecoration.lineThrough, color: Colores.gris, fontSize: 13),
              ),
            ),
          const SizedBox(height: 6),
          if (def.esLista)
            _CampoLista(
              key: ValueKey('campo-${def.id}'),
              def: def,
              valor: v.valor,
              editable: widget.editable,
              fondo: fondo,
              borde: borde,
              alCambiar: widget.alCambiar,
              confirmar: confirmar,
            )
          else
            TextField(
              key: ValueKey('campo-${def.id}'),
              controller: _ctrl,
              focusNode: _foco,
              enabled: widget.editable,
              readOnly: eligeDeLista,
              onTap: eligeDeLista && widget.editable ? _elegir : null,
              onChanged: widget.alCambiar,
              minLines: def.tipo == TipoCampo.multilinea ? 3 : 1,
              maxLines: def.tipo == TipoCampo.multilinea ? 6 : 1,
              inputFormatters: esHora
                  ? const [FormatoHora()]
                  : def.digitos != null
                  ? [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(def.digitos)]
                  : null,
              keyboardType: switch (def.tipo) {
                TipoCampo.telefono => TextInputType.phone,
                TipoCampo.multilinea => TextInputType.multiline,
                TipoCampo.hora => TextInputType.number,
                _ when def.digitos != null => TextInputType.number,
                _ => TextInputType.text,
              },
              decoration: InputDecoration(
                hintText: hint,
                fillColor: fondo,
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: borde),
                ),
                suffixIcon:
                    confirmar ??
                    (eligeDeLista
                        ? const Icon(Icons.expand_more, color: Colores.gris)
                        : esHora
                        ? const Icon(Icons.schedule, color: Colores.gris)
                        : null),
              ),
            ),
        ],
      ),
    );
  }
}

/// Hora escrita con el teclado: sólo dígitos, pone los «:» solo y no deja pasar de 23:59.
/// «1435» → «14:35», «9» → «9», «93» → «09:3».
class FormatoHora extends TextInputFormatter {
  const FormatoHora();

  @override
  TextEditingValue formatEditUpdate(TextEditingValue antes, TextEditingValue ahora) {
    var d = ahora.text.replaceAll(RegExp(r'[^0-9]'), '');
    // Una primera cifra de 3 a 9 sólo puede ser la hora de un dígito: se completa con 0.
    if (d.isNotEmpty && int.parse(d[0]) > 2) d = '0$d';
    if (d.length > 4) d = d.substring(0, 4);
    if (d.length >= 2 && int.parse(d.substring(0, 2)) > 23) return antes;
    if (d.length >= 3 && int.parse(d[2]) > 5) return antes;
    // Al borrar justo después de los «:», se borra también la cifra de antes.
    final borrando = ahora.text.length < antes.text.length;
    final texto = d.length > 2 || (d.length == 2 && !borrando) ? '${d.substring(0, 2)}:${d.substring(2)}' : d;
    return TextEditingValue(
      text: texto,
      selection: TextSelection.collapsed(offset: texto.length),
    );
  }
}

/// Campo de varios elementos: una fila por persona o unidad y un botón «Agregar…». Empieza vacío.
class _CampoLista extends StatefulWidget {
  const _CampoLista({
    super.key,
    required this.def,
    required this.valor,
    required this.editable,
    required this.fondo,
    required this.borde,
    required this.alCambiar,
    this.confirmar,
  });
  final CampoDef def;
  final String valor;
  final bool editable;
  final Color fondo;
  final Color borde;
  final ValueChanged<String> alCambiar;
  final Widget? confirmar;

  @override
  State<_CampoLista> createState() => _CampoListaState();
}

class _CampoListaState extends State<_CampoLista> {
  final _filas = <(TextEditingController, FocusNode)>[];

  @override
  void initState() {
    super.initState();
    _cargar(widget.valor);
  }

  void _cargar(String valor) {
    for (final (c, f) in _filas) {
      c.dispose();
      f.dispose();
    }
    _filas
      ..clear()
      ..addAll([for (final e in elementosDeLista(valor)) (TextEditingController(text: e), FocusNode())]);
  }

  String get _unido => [
    for (final (c, _) in _filas)
      if (c.text.trim().isNotEmpty) c.text.trim(),
  ].join(separadorLista);

  @override
  void didUpdateWidget(_CampoLista old) {
    super.didUpdateWidget(old);
    // Si el valor cambió por fuera (dictado), se vuelve a armar la lista, salvo que se esté escribiendo.
    final escribiendo = _filas.any((f) => f.$2.hasFocus);
    if (!escribiendo && widget.valor != _unido) setState(() => _cargar(widget.valor));
  }

  @override
  void dispose() {
    for (final (c, f) in _filas) {
      c.dispose();
      f.dispose();
    }
    super.dispose();
  }

  void _agregar() {
    final fila = (TextEditingController(), FocusNode());
    setState(() => _filas.add(fila));
    WidgetsBinding.instance.addPostFrameCallback((_) => fila.$2.requestFocus());
  }

  void _quitar(int i) {
    final (c, f) = _filas.removeAt(i);
    setState(() {});
    widget.alCambiar(_unido);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      c.dispose();
      f.dispose();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.editable && _filas.isEmpty) {
      return TextField(
        enabled: false,
        decoration: InputDecoration(hintText: '—', fillColor: widget.fondo),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, (c, f)) in _filas.indexed)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: TextField(
              key: ValueKey('${widget.def.id}-$i'),
              controller: c,
              focusNode: f,
              enabled: widget.editable,
              textCapitalization: TextCapitalization.words,
              onChanged: (_) => widget.alCambiar(_unido),
              decoration: InputDecoration(
                fillColor: widget.fondo,
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: widget.borde),
                ),
                suffixIcon: widget.editable
                    ? IconButton(
                        tooltip: 'Quitar',
                        icon: const Icon(Icons.close, color: Colores.gris),
                        onPressed: () => _quitar(i),
                      )
                    : null,
              ),
            ),
          ),
        if (widget.editable)
          Row(
            children: [
              TextButton.icon(
                key: ValueKey('agregar-${widget.def.id}'),
                onPressed: _agregar,
                icon: const Icon(Icons.add_circle_outline, color: Colores.rojo),
                label: Text(widget.def.agregar!, style: const TextStyle(color: Colores.rojo)),
              ),
              const Spacer(),
              if (widget.confirmar != null) widget.confirmar!,
            ],
          ),
      ],
    );
  }
}

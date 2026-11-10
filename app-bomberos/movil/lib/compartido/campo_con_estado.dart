import 'package:flutter/material.dart';

import '../datos/catalogo_campos.dart';
import '../datos/modelos.dart';
import 'tema.dart';
import 'widgets.dart';

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
    if (def.tipo == TipoCampo.hora) {
      final partes = widget.valor.valor.split(':');
      final inicial = partes.length == 2
          ? TimeOfDay(hour: int.tryParse(partes[0]) ?? 12, minute: int.tryParse(partes[1]) ?? 0)
          : TimeOfDay.now();
      final t = await showTimePicker(context: context, initialTime: inicial);
      if (t != null) widget.alCambiar('${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}');
      return;
    }
    final elegido = await showModalBottomSheet<String>(
      context: context,
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
    if (elegido != null) widget.alCambiar(elegido);
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
      _ => null,
    };
    final eligeDeLista = def.tipo == TipoCampo.opcion || def.tipo == TipoCampo.hora;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Flexible(child: Text(def.etiqueta, style: Textos.etiqueta)),
              const SizedBox(width: 6),
              if (def.obligatorio) const ChipBomberos('Obligatorio', tono: TonoChip.rojo),
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
            keyboardType: switch (def.tipo) {
              TipoCampo.telefono => TextInputType.phone,
              TipoCampo.multilinea => TextInputType.multiline,
              _ => TextInputType.text,
            },
            decoration: InputDecoration(
              hintText: hint,
              fillColor: fondo,
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: borde),
              ),
              suffixIcon: v.pendienteDeConfirmar && widget.alConfirmar != null
                  ? IconButton(
                      tooltip: 'Confirmar este campo',
                      icon: const Icon(Icons.check_circle_outline, color: Colores.verde),
                      onPressed: widget.alConfirmar,
                    )
                  : eligeDeLista
                  ? Icon(def.tipo == TipoCampo.hora ? Icons.schedule : Icons.expand_more, color: Colores.gris)
                  : null,
            ),
          ),
        ],
      ),
    );
  }
}

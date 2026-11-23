import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../servicios/proveedores.dart';

/// Cómo confirmó la persona que es ella: con la biometría del celular (la llave del chip seguro firmó el
/// reto) o con su contraseña. Sólo viene una de las dos.
class Confirmacion {
  const Confirmacion({this.firma, this.contrasena, this.simulada = false});
  final String? firma;
  final String? contrasena;

  /// La firma no usó el chip seguro (simulador o depuración).
  final bool simulada;
}

/// Pide la biometría del celular para firmar [reto]. Si este celular no tiene biometría registrada, o si
/// la persona la cancela o falla, pide su contraseña. Devuelve null si cancela también la contraseña.
Future<Confirmacion?> confirmarIdentidad(
  BuildContext context,
  WidgetRef ref,
  String reto, {
  required String motivo,
}) async {
  final firma = ref.read(firmaProvider);
  var tieneLlave = false;
  try {
    tieneLlave = await firma.tieneLlave();
  } catch (_) {}
  if (tieneLlave) {
    final r = await firma.firmar(reto, motivo: motivo);
    // Una firma simulada sólo vale en depuración; en la app real se pide la contraseña.
    if (r.ok && (!r.simulada || kDebugMode)) return Confirmacion(firma: r.firma, simulada: r.simulada);
  }
  if (!context.mounted) return null;
  final contrasena = await pedirContrasena(context, motivo: motivo);
  return contrasena == null ? null : Confirmacion(contrasena: contrasena);
}

/// Diálogo «Confirma con tu contraseña». Devuelve null si se cancela.
Future<String?> pedirContrasena(BuildContext context, {required String motivo}) => showDialog<String>(
  context: context,
  builder: (_) => _DialogoContrasena(motivo: motivo),
);

class _DialogoContrasena extends StatefulWidget {
  const _DialogoContrasena({required this.motivo});
  final String motivo;
  @override
  State<_DialogoContrasena> createState() => _DialogoContrasenaState();
}

class _DialogoContrasenaState extends State<_DialogoContrasena> {
  final _contrasena = TextEditingController();

  @override
  void dispose() {
    _contrasena.dispose();
    super.dispose();
  }

  void _aceptar() {
    if (_contrasena.text.isEmpty) return;
    Navigator.of(context).pop(_contrasena.text);
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Confirma que eres tú'),
    content: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.motivo),
        const SizedBox(height: 12),
        TextField(
          key: const ValueKey('contrasena-confirmar'),
          controller: _contrasena,
          obscureText: true,
          autofocus: true,
          onSubmitted: (_) => _aceptar(),
          decoration: const InputDecoration(labelText: 'Tu contraseña'),
        ),
      ],
    ),
    actions: [
      TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancelar')),
      TextButton(onPressed: _aceptar, child: const Text('Confirmar')),
    ],
  );
}

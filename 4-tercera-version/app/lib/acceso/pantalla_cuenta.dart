import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../compartido/lienzo_firma.dart';
import '../compartido/tema.dart';
import '../compartido/widgets.dart';
import 'sesion.dart';

/// Mi cuenta: la firma en trazo del usuario (la que se pone en los partes que firma) y el cambio de
/// contraseña. La firma se guarda en el servidor; cada parte firmado conserva su propia copia.
class PantallaCuenta extends ConsumerStatefulWidget {
  const PantallaCuenta({super.key});
  @override
  ConsumerState<PantallaCuenta> createState() => _PantallaCuentaState();
}

class _PantallaCuentaState extends ConsumerState<PantallaCuenta> {
  late final ControlFirma _trazo = ControlFirma(ref.read(sesionProvider).usuario?.trazo);
  final _actual = TextEditingController();
  final _nueva = TextEditingController();
  final _repetir = TextEditingController();
  bool _ocupado = false;

  @override
  void dispose() {
    _trazo.dispose();
    for (final c in [_actual, _nueva, _repetir]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _guardarFirma() async {
    if (_trazo.vacio) return avisar(context, 'Dibuja tu firma');
    setState(() => _ocupado = true);
    final error = await ref.read(sesionProvider.notifier).guardarTrazo(_trazo.serializar());
    if (!mounted) return;
    setState(() => _ocupado = false);
    avisar(context, error ?? 'Firma guardada');
  }

  Future<void> _cambiarContrasena() async {
    if (_actual.text.isEmpty) return avisar(context, 'Escribe tu contraseña actual');
    if (_nueva.text.length < 8) return avisar(context, 'La contraseña nueva debe tener al menos 8 caracteres');
    if (_nueva.text != _repetir.text) return avisar(context, 'Las dos contraseñas nuevas no coinciden');
    setState(() => _ocupado = true);
    final error = await ref
        .read(sesionProvider.notifier)
        .cambiarContrasena(actual: _actual.text, nueva: _nueva.text);
    if (!mounted) return;
    setState(() => _ocupado = false);
    if (error != null) return avisar(context, error);
    for (final c in [_actual, _nueva, _repetir]) {
      c.clear();
    }
    avisar(context, 'Contraseña cambiada');
  }

  @override
  Widget build(BuildContext context) {
    final u = ref.watch(usuarioActualProvider);
    return Scaffold(
      appBar: Encabezado(titulo: 'Mi cuenta', subtitulo: '${u.nombre} · ${u.matricula}'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
        children: [
          const TituloSeccion('Mi firma'),
          LienzoFirma(control: _trazo, alto: 150, ayuda: 'Dibuja tu firma con el dedo'),
          const SizedBox(height: 6),
          Text(
            u.trazo == null
                ? 'Todavía no tienes firma. Sin ella no puedes firmar partes.'
                : 'Esta firma se pone en los partes que firmes. Los que ya firmaste no cambian.',
            style: Textos.chico,
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            key: const ValueKey('guardar-firma'),
            onPressed: _ocupado ? null : _guardarFirma,
            icon: const Icon(Icons.save_outlined),
            label: const Text('Guardar mi firma'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(onPressed: _ocupado ? null : _trazo.limpiar, child: const Text('Volver a dibujar')),
          const TituloSeccion('Cambiar contraseña'),
          TextField(
            controller: _actual,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Contraseña actual'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _nueva,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Contraseña nueva (8 caracteres o más)'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _repetir,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Repite la contraseña nueva'),
          ),
          const SizedBox(height: 12),
          FilledButton(
            key: const ValueKey('cambiar-contrasena'),
            onPressed: _ocupado ? null : _cambiarContrasena,
            child: const Text('Cambiar contraseña'),
          ),
          const SizedBox(height: 8),
          const Text('Si olvidas tu contraseña, acude a Dirección para que te den una nueva.', style: Textos.chico),
        ],
      ),
    );
  }
}

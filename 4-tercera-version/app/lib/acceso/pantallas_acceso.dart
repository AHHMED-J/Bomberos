import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../compartido/tema.dart';
import '../compartido/widgets.dart';
import '../datos/datos_ejemplo.dart';
import '../datos/modelos.dart';
import '../servicios/config.dart';
import '../servicios/proveedores.dart';
import 'sesion.dart';

/// A1 · Acceso con el número de empleado y la contraseña que entrega Dirección. Si este celular ya
/// quedó registrado, también se puede entrar con su biometría.
class PantallaAcceso extends ConsumerStatefulWidget {
  const PantallaAcceso({super.key});
  @override
  ConsumerState<PantallaAcceso> createState() => _PantallaAccesoState();
}

class _PantallaAccesoState extends ConsumerState<PantallaAcceso> {
  final _noEmpleado = TextEditingController();
  final _contrasena = TextEditingController();
  bool _ocupado = false;
  bool _conBiometria = false;

  @override
  void initState() {
    super.initState();
    _revisarTelefono();
  }

  @override
  void dispose() {
    _noEmpleado.dispose();
    _contrasena.dispose();
    super.dispose();
  }

  /// ¿Alguien ya entró en este teléfono y dejó registrada su biometría?
  Future<void> _revisarTelefono() async {
    final sesion = ref.read(sesionProvider.notifier);
    await sesion.cargarTelefono();
    final puede = await sesion.puedeEntrarConBiometria();
    if (!mounted) return;
    setState(() {
      _conBiometria = puede;
      if (_noEmpleado.text.isEmpty) _noEmpleado.text = sesion.usuarioDelTelefono?.matricula ?? '';
    });
  }

  void _terminar(String? error) {
    if (!mounted) return;
    setState(() => _ocupado = false);
    if (error != null) {
      avisar(context, error);
    } else {
      context.go('/inicio');
    }
  }

  Future<void> _entrar() async {
    if (_noEmpleado.text.trim().isEmpty || _contrasena.text.isEmpty) {
      return avisar(context, 'Escribe tu número de empleado y tu contraseña');
    }
    setState(() => _ocupado = true);
    _terminar(await ref.read(sesionProvider.notifier).entrarConContrasena(_noEmpleado.text, _contrasena.text));
  }

  Future<void> _entrarConBiometria() async {
    setState(() => _ocupado = true);
    _terminar(await ref.read(sesionProvider.notifier).entrarConCredencial());
  }

  Future<void> _entrarSinConexion() async {
    setState(() => _ocupado = true);
    _terminar(await ref.read(sesionProvider.notifier).entrarSinConexion());
  }

  @override
  Widget build(BuildContext context) {
    final enLinea = ref.watch(enLineaProvider);
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(28, 48, 28, 24),
          children: [
            const _Escudo(),
            const SizedBox(height: 20),
            const Text(
              'BOMBEROS DE\nENSENADA',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: Fuentes.titulo,
                fontWeight: FontWeight.w700,
                fontSize: 44,
                color: Colores.rojo,
                height: 1,
              ),
            ),
            const SizedBox(height: 32),
            TextField(
              key: const ValueKey('no-empleado'),
              controller: _noEmpleado,
              autocorrect: false,
              enableSuggestions: false,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'Número de empleado'),
            ),
            const SizedBox(height: 12),
            TextField(
              key: const ValueKey('contrasena'),
              controller: _contrasena,
              obscureText: true,
              onSubmitted: (_) {
                if (!_ocupado) _entrar();
              },
              decoration: const InputDecoration(labelText: 'Contraseña'),
            ),
            const SizedBox(height: 18),
            FilledButton.icon(
              key: const ValueKey('entrar'),
              onPressed: _ocupado ? null : _entrar,
              icon: _ocupado
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colores.blanco),
                    )
                  : const Icon(Icons.login),
              label: const Text('Entrar'),
            ),
            if (_conBiometria) ...[
              const SizedBox(height: 10),
              OutlinedButton.icon(
                key: const ValueKey('entrar-biometria'),
                onPressed: _ocupado ? null : _entrarConBiometria,
                icon: const Icon(Icons.fingerprint),
                label: const Text('Entrar con mi biometría'),
              ),
            ],
            if (!enLinea) ...[
              const SizedBox(height: 14),
              Aviso(
                tono: TonoAviso.ambar,
                icono: Icons.cloud_off,
                child: Text(
                  _conBiometria
                      ? 'Sin señal con el servidor. Puedes trabajar tus borradores en este teléfono y enviarlos '
                            'cuando vuelva la señal.'
                      : 'Sin señal con el servidor. Para trabajar sin conexión, entra una vez con señal en este '
                            'teléfono.',
                ),
              ),
              if (_conBiometria) ...[
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  key: const ValueKey('entrar-sin-conexion'),
                  onPressed: _ocupado ? null : _entrarSinConexion,
                  icon: const Icon(Icons.cloud_off),
                  label: const Text('Trabajar sin conexión'),
                ),
              ],
            ],
            const SizedBox(height: 18),
            const Text(
              'Tu usuario es tu número de empleado. La contraseña te la entrega Dirección; '
              'si la olvidaste, acude a Dirección.',
              textAlign: TextAlign.center,
              style: Textos.chico,
            ),
            if (kDebugMode) ...[
              const Divider(height: 32),
              OutlinedButton.icon(
                onPressed: () => context.push('/depuracion'),
                icon: const Icon(Icons.bug_report_outlined),
                label: const Text('Depuración: entrar como…'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Escudo extends StatelessWidget {
  const _Escudo();
  @override
  Widget build(BuildContext context) => Center(
    child: Container(
      width: 140,
      height: 140,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colores.blanco,
        border: Border.all(color: Colores.rojo, width: 10),
      ),
      child: const Icon(Icons.local_fire_department, size: 70, color: Colores.rojo),
    ),
  );
}

/// Sólo en modo debug: saltar entre roles y mover las banderas de Config.
class PantallaDepuracion extends ConsumerWidget {
  const PantallaDepuracion({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = ref.watch(configProvider);
    final cambiar = ref.read(configProvider.notifier).cambiar;
    return Scaffold(
      appBar: const Encabezado(titulo: 'Depuración', subtitulo: 'Sólo existe en modo debug'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const TituloSeccion('Entrar como'),
          for (final u in usuariosEjemplo)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Tarjeta(
                alTocar: () {
                  ref.read(sesionProvider.notifier).entrarComo(u);
                  context.go('/inicio');
                },
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: Colores.rojo,
                      child: Text(u.inicial, style: const TextStyle(color: Colores.blanco)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(switch (u.rol) {
                            Rol.editor => 'Bombero · Editor',
                            Rol.capitan => 'Capitán · encargado de turno (revisor)',
                          }, style: const TextStyle(fontWeight: FontWeight.w700)),
                          Text('${u.nombre} · ${u.matricula}', style: Textos.chico),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right),
                  ],
                ),
              ),
            ),
          const TituloSeccion('Banderas'),
          SwitchListTile(
            title: const Text('IA desde el servidor'),
            subtitle: const Text('Apagado: servicios falsos dentro de la app'),
            value: c.ia == Fuente.servidor,
            onChanged: (v) => cambiar((c) => c.copiar(ia: v ? Fuente.servidor : Fuente.falsa)),
          ),
          SwitchListTile(
            title: const Text('Datos desde el servidor'),
            subtitle: const Text('Apagado: partes de ejemplo en memoria'),
            value: c.datos == Fuente.servidor,
            onChanged: (v) => cambiar((c) => c.copiar(datos: v ? Fuente.servidor : Fuente.falsa)),
          ),
          SwitchListTile(
            title: const Text('Sin conexión (simulada)'),
            value: c.sinConexionSimulada,
            onChanged: (v) => cambiar((c) => c.copiar(sinConexionSimulada: v)),
          ),
          SwitchListTile(
            title: const Text('Micrófono simulado'),
            subtitle: const Text('Apagado: graba de verdad (el audio se borra al transcribir)'),
            value: c.microfonoSimulado,
            onChanged: (v) => cambiar((c) => c.copiar(microfonoSimulado: v)),
          ),
          SwitchListTile(
            title: const Text('Micrófono bloqueado (simulado)'),
            value: c.microfonoBloqueadoSimulado,
            onChanged: (v) => cambiar((c) => c.copiar(microfonoBloqueadoSimulado: v)),
          ),
          SwitchListTile(
            title: const Text('Firma simulada'),
            subtitle: const Text('Sin Face ID ni chip seguro'),
            value: c.firmaSimulada,
            onChanged: (v) => cambiar((c) => c.copiar(firmaSimulada: v)),
          ),
          SwitchListTile(
            title: const Text('Partes nuevos en modo dictado'),
            subtitle: const Text('A/B: apagado = grupo teclado (sin botón Dictar)'),
            value: c.modoNuevoParte == ModoCaptura.dictado,
            onChanged: (v) => cambiar((c) => c.copiar(modoNuevoParte: v ? ModoCaptura.dictado : ModoCaptura.teclado)),
          ),
          const SizedBox(height: 8),
          TextFormField(
            initialValue: c.urlServidor,
            decoration: const InputDecoration(labelText: 'URL del servidor'),
            onFieldSubmitted: (v) => cambiar((c) => c.copiar(urlServidor: v.trim())),
          ),
        ],
      ),
    );
  }
}

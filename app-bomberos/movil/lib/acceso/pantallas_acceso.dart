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

/// A1 · Acceso con la credencial del teléfono (llave del chip seguro + Face ID).
class PantallaAcceso extends ConsumerStatefulWidget {
  const PantallaAcceso({super.key});
  @override
  ConsumerState<PantallaAcceso> createState() => _PantallaAccesoState();
}

class _PantallaAccesoState extends ConsumerState<PantallaAcceso> {
  bool _ocupado = false;

  Future<void> _entrar() async {
    setState(() => _ocupado = true);
    final error = await ref.read(sesionProvider.notifier).entrarConCredencial();
    if (!mounted) return;
    setState(() => _ocupado = false);
    if (error != null) {
      avisar(context, error);
    } else {
      context.go('/inicio');
    }
  }

  @override
  Widget build(BuildContext context) {
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
            const SizedBox(height: 40),
            FilledButton.icon(
              onPressed: _ocupado ? null : _entrar,
              icon: _ocupado
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colores.blanco),
                    )
                  : const Icon(Icons.fingerprint),
              label: const Text('Usar mi credencial'),
            ),
            const SizedBox(height: 18),
            _Enlace('¿Primera vez? Da de alta tu credencial', () => context.push('/alta')),
            _Enlace('Cambié de teléfono', () => context.push('/cambie-telefono')),
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

class _Enlace extends StatelessWidget {
  const _Enlace(this.texto, this.alTocar);
  final String texto;
  final VoidCallback alTocar;
  @override
  Widget build(BuildContext context) => TextButton(
    onPressed: alTocar,
    child: Text(
      texto,
      textAlign: TextAlign.center,
      style: const TextStyle(color: Colores.tinta, decoration: TextDecoration.underline, fontWeight: FontWeight.w600),
    ),
  );
}

/// Cinco casillas para el código de un solo uso (A2 y A4).
class CampoCodigo extends StatelessWidget {
  const CampoCodigo({super.key, required this.controlador, this.alCambiar});
  final TextEditingController controlador;
  final ValueChanged<String>? alCambiar;
  @override
  Widget build(BuildContext context) => TextField(
    key: const ValueKey('codigo-alta'),
    controller: controlador,
    maxLength: 5,
    textCapitalization: TextCapitalization.characters,
    textAlign: TextAlign.center,
    onChanged: alCambiar,
    style: const TextStyle(fontSize: 30, letterSpacing: 22, fontWeight: FontWeight.w600),
    decoration: const InputDecoration(counterText: '', hintText: '·····'),
  );
}

/// A2 · Alta de credencial con el código de la Dirección.
class PantallaAlta extends ConsumerStatefulWidget {
  const PantallaAlta({super.key, this.cambioDeTelefono = false});

  /// A4 reutiliza esta pantalla con su aviso.
  final bool cambioDeTelefono;
  @override
  ConsumerState<PantallaAlta> createState() => _PantallaAltaState();
}

class _PantallaAltaState extends ConsumerState<PantallaAlta> {
  final _codigo = TextEditingController();
  Usuario? _dueno;
  bool _ocupado = false;

  Future<void> _consultar(String c) async {
    if (c.length != 5) return setState(() => _dueno = null);
    try {
      final u = await ref.read(repositorioRemotoProvider).consultarCodigo(c);
      if (mounted) setState(() => _dueno = u);
    } catch (_) {
      if (mounted) avisar(context, 'Código no válido');
    }
  }

  Future<void> _registrar() async {
    setState(() => _ocupado = true);
    final error = await ref.read(sesionProvider.notifier).darDeAlta(_codigo.text);
    if (!mounted) return;
    setState(() => _ocupado = false);
    if (error != null) return avisar(context, error);
    context.go('/inicio');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: Encabezado(titulo: widget.cambioDeTelefono ? 'Cambié de teléfono' : 'Alta de credencial'),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (widget.cambioDeTelefono) ...[
            const Aviso(
              icono: Icons.warning_amber_rounded,
              child: Text(
                'Tu credencial está en el teléfono anterior. Para usar este, pide un código nuevo a la Dirección.',
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              '1. Pide el código a la Dirección.\n2. Escríbelo aquí.\n3. Registra tu Face ID en este teléfono.',
              style: TextStyle(fontSize: 16, height: 1.6),
            ),
            const SizedBox(height: 14),
          ] else
            const Padding(
              padding: EdgeInsets.only(bottom: 14),
              child: Text('Escribe el código de un solo uso que te dio la Dirección.', style: TextStyle(fontSize: 17)),
            ),
          CampoCodigo(controlador: _codigo, alCambiar: _consultar),
          const SizedBox(height: 14),
          if (_dueno != null)
            Tarjeta(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'ESTE CÓDIGO ES DE',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colores.gris),
                  ),
                  const SizedBox(height: 4),
                  Text(_dueno!.nombre, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                  Text('${_dueno!.matricula} · ${_dueno!.rango} · Estación ${_dueno!.estacion}', style: Textos.chico),
                ],
              ),
            ),
          if (widget.cambioDeTelefono)
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: Text('Al registrar este teléfono, la credencial anterior se desactiva.', style: Textos.chico),
            ),
          const SizedBox(height: 28),
          FilledButton.icon(
            onPressed: _dueno == null || _ocupado ? null : _registrar,
            icon: const Icon(Icons.face),
            label: Text(widget.cambioDeTelefono ? 'Continuar' : 'Registrar mi Face ID'),
          ),
          const SizedBox(height: 10),
          const Text(
            'Se guarda sólo la llave pública, nunca tu cara ni tu huella.',
            textAlign: TextAlign.center,
            style: Textos.chico,
          ),
        ],
      ),
    );
  }
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

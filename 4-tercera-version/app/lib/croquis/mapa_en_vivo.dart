import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../compartido/tema.dart';
import '../servicios/proveedores.dart';
import '../servicios/ubicacion.dart';

const azulUbicacion = Color(0xFF0A84FF);
const fondoMapa = Color(0xFFE4DFD5);

/// Croquis · mapa con la ubicación del bombero en tiempo real (pantalla K1 del Figma).
///
/// Las teselas son de OpenStreetMap (sin clave). Ojo: al pedirlas, el servidor de OSM ve la zona
/// que se está mirando. La posición exacta NO sale del teléfono; sólo queda en el PNG si se captura.
class MapaEnVivo extends ConsumerStatefulWidget {
  const MapaEnVivo({super.key, this.alto = 200});
  final double alto;

  @override
  ConsumerState<MapaEnVivo> createState() => MapaEnVivoState();
}

class MapaEnVivoState extends ConsumerState<MapaEnVivo> {
  final _mapa = MapController();
  final _lienzo = GlobalKey();
  StreamSubscription<Ubicacion>? _sub;
  EstadoUbicacion? _estado; // null = todavía preguntando
  Ubicacion? _actual;
  bool _listo = false;
  bool _seguir = true; // el mapa sigue al punto hasta que el bombero lo mueve con el dedo
  bool _primera = true;

  @override
  void initState() {
    super.initState();
    _arrancar();
  }

  Future<void> _arrancar() async {
    final servicio = ref.read(ubicacionProvider);
    EstadoUbicacion estado;
    try {
      estado = await servicio.preparar();
    } catch (_) {
      estado = EstadoUbicacion.apagada;
    }
    if (!mounted) return;
    setState(() => _estado = estado);
    if (estado != EstadoUbicacion.activa) return;
    _sub = servicio.seguir().listen((u) {
      if (!mounted) return;
      setState(() => _actual = u);
      if (_seguir) _centrar();
    }, onError: (_) {});
  }

  void _centrar() {
    final u = _actual;
    if (u == null || !_listo) return;
    _mapa.move(LatLng(u.latitud, u.longitud), _primera ? 17 : _mapa.camera.zoom);
    _primera = false;
  }

  /// Foto de lo que se ve en el mapa (teselas + punto), al tamaño del recuadro × densidad de pantalla.
  /// Es el tamaño «original» con el que se guarda el PNG.
  Future<ui.Image?> capturar() async {
    final b = _lienzo.currentContext?.findRenderObject() as RenderRepaintBoundary?;
    if (b == null) return null;
    return b.toImage(pixelRatio: MediaQuery.devicePixelRatioOf(context));
  }

  @override
  void dispose() {
    _sub?.cancel();
    _mapa.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final teselas = ref.watch(teselasMapaProvider);
    final u = _actual;
    final (texto, punto, alTocar) = switch (_estado) {
      EstadoUbicacion.activa when u != null => ('Tu ubicación · en tiempo real', true, null),
      null || EstadoUbicacion.activa => ('Buscando tu ubicación…', false, null),
      EstadoUbicacion.sinPermiso => (
        'Sin permiso de ubicación · toca para activarla',
        false,
        () => ref.read(ubicacionProvider).abrirAjustes(),
      ),
      EstadoUbicacion.apagada => ('Ubicación apagada en el iPhone', false, null),
    };

    return Container(
      height: widget.alto,
      decoration: BoxDecoration(
        border: Border.all(color: Colores.borde),
        borderRadius: BorderRadius.circular(12),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(11),
        child: Stack(
          children: [
            RepaintBoundary(
              key: _lienzo,
              child: FlutterMap(
                mapController: _mapa,
                options: MapOptions(
                  initialCenter: LatLng(centroEnsenada.latitud, centroEnsenada.longitud),
                  initialZoom: 15,
                  backgroundColor: fondoMapa,
                  interactionOptions: const InteractionOptions(flags: InteractiveFlag.all & ~InteractiveFlag.rotate),
                  onMapReady: () {
                    _listo = true;
                    _centrar();
                  },
                  onPositionChanged: (_, conGesto) {
                    if (conGesto && _seguir) setState(() => _seguir = false);
                  },
                ),
                children: [
                  if (teselas)
                    TileLayer(
                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'mx.edu.uabc.bomberosParte',
                    ),
                  if (u != null)
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: LatLng(u.latitud, u.longitud),
                          width: 48,
                          height: 48,
                          child: const PuntoUbicacion(),
                        ),
                      ],
                    ),
                ],
              ),
            ),
            Positioned(
              top: 10,
              left: 10,
              right: 90,
              child: Align(
                alignment: Alignment.centerLeft,
                child: ChipMapa(texto, punto: punto, alTocar: alTocar),
              ),
            ),
            if (teselas) const Positioned(top: 6, right: 6, child: _Pastilla(texto: '© OpenStreetMap', tamano: 9)),
            if (u != null) Positioned(left: 10, bottom: 10, child: _Pastilla(texto: u.texto)),
            if (u != null)
              Positioned(
                right: 10,
                bottom: 10,
                child: _BotonRedondo(
                  key: const ValueKey('centrar-ubicacion'),
                  icono: _seguir ? Icons.navigation : Icons.navigation_outlined,
                  alTocar: () {
                    setState(() => _seguir = true);
                    _centrar();
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Punto azul con halo, como en Mapas.
class PuntoUbicacion extends StatelessWidget {
  const PuntoUbicacion({super.key});
  @override
  Widget build(BuildContext context) => Center(
    child: Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(color: azulUbicacion.withValues(alpha: .18), shape: BoxShape.circle),
      alignment: Alignment.center,
      child: Container(
        width: 17,
        height: 17,
        decoration: BoxDecoration(
          color: azulUbicacion,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 3),
          boxShadow: const [BoxShadow(color: Color(0x40000000), blurRadius: 3)],
        ),
      ),
    ),
  );
}

/// Etiqueta blanca sobre el mapa: «Tu ubicación · en tiempo real» o «Captura guardada · PNG».
class ChipMapa extends StatelessWidget {
  const ChipMapa(this.texto, {super.key, this.punto = false, this.alTocar});
  final String texto;
  final bool punto;
  final VoidCallback? alTocar;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: alTocar,
    child: Container(
      padding: const EdgeInsets.fromLTRB(10, 6, 12, 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        boxShadow: const [BoxShadow(color: Color(0x2E000000), blurRadius: 4, offset: Offset(0, 1))],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (punto) ...[
            Container(
              width: 9,
              height: 9,
              decoration: const BoxDecoration(color: azulUbicacion, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
          ],
          Flexible(
            child: Text(
              texto,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colores.tinta),
            ),
          ),
        ],
      ),
    ),
  );
}

class _Pastilla extends StatelessWidget {
  const _Pastilla({required this.texto, this.tamano = 11});
  final String texto;
  final double tamano;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: Colors.white.withValues(alpha: .85), borderRadius: BorderRadius.circular(999)),
    child: Text(
      texto,
      style: TextStyle(fontSize: tamano, color: Colores.gris),
    ),
  );
}

class _BotonRedondo extends StatelessWidget {
  const _BotonRedondo({super.key, required this.icono, required this.alTocar});
  final IconData icono;
  final VoidCallback alTocar;
  @override
  Widget build(BuildContext context) => Material(
    color: Colors.white,
    shape: const CircleBorder(),
    elevation: 2,
    child: InkWell(
      customBorder: const CircleBorder(),
      onTap: alTocar,
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Icon(icono, size: 18, color: azulUbicacion),
      ),
    ),
  );
}

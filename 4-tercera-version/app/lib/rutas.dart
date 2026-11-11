import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'acceso/pantalla_cuenta.dart';
import 'acceso/pantallas_acceso.dart';
import 'acceso/sesion.dart';
import 'dictado/pantallas_dictado.dart';
import 'hoja/pantalla_documentos.dart';
import 'hoja/pantalla_hoja.dart';
import 'hoja/pantalla_inicio.dart';
import 'hoja/pantallas_envio.dart';
import 'revision/pantallas_revision.dart';

/// Mapa de pantallas. Todo lo de adentro cuelga de /inicio para que «atrás» siempre tenga a dónde ir.
///
///   /                       A1 Acceso (número de empleado y contraseña, o biometría)
///   /depuracion             selector de rol (sólo debug)
///   /inicio                 E1 menú (Editor) · R1 (Capitán)
///     cuenta                Mi cuenta: mi firma y cambiar contraseña
///     documentos            E6 + G4 Mis documentos / en progreso
///     hoja                  P2 Hoja + D1–D8 dictado + P7 devuelta
///       resumen             G5 Resumen WhatsApp
///       segundo-dictado     G6 Correcciones
///       enviar              P4 Faltan campos
///       firmas              P5 Firmas
///       enviado             P6 Enviado
///     bandeja               R2 Bandeja de revisión
///       parte/:folio        R3 Revisar hoja (+ R4 devolver)
///         validar           C1 Confirma que eres tú → C2 Firmar y validar
///         validado          C3 Parte validado
final rutasProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final dentro = ref.read(sesionProvider).usuario != null;
      final publica = const {'/', '/depuracion'}.contains(state.matchedLocation);
      if (state.matchedLocation == '/depuracion' && !kDebugMode) return '/';
      if (!dentro && !publica) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, _) => const PantallaAcceso()),
      GoRoute(path: '/depuracion', builder: (_, _) => const PantallaDepuracion()),
      GoRoute(
        path: '/inicio',
        builder: (_, _) => const PantallaInicio(),
        routes: [
          GoRoute(path: 'cuenta', builder: (_, _) => const PantallaCuenta()),
          GoRoute(path: 'documentos', builder: (_, _) => const PantallaDocumentos()),
          GoRoute(
            path: 'hoja',
            builder: (_, _) => const PantallaHoja(),
            routes: [
              GoRoute(path: 'resumen', builder: (_, _) => const PantallaResumen()),
              GoRoute(path: 'segundo-dictado', builder: (_, _) => const PantallaSegundoDictado()),
              GoRoute(path: 'enviar', builder: (_, _) => const PantallaFaltan()),
              GoRoute(path: 'firmas', builder: (_, _) => const PantallaFirmas()),
              GoRoute(path: 'enviado', builder: (_, _) => const PantallaEnviado()),
            ],
          ),
          GoRoute(
            path: 'bandeja',
            builder: (_, _) => const PantallaBandeja(),
            routes: [
              GoRoute(
                path: 'parte/:folio',
                builder: (_, _) => const PantallaRevisar(),
                routes: [
                  GoRoute(path: 'validar', builder: (_, _) => const PantallaValidar()),
                  GoRoute(path: 'validado', builder: (_, _) => const PantallaValidado()),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});

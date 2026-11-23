import 'dart:convert';

import 'package:biometric_signature/biometric_signature.dart';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';

/// Resultado de pedir Face ID y firmar un reto.
class ResultadoFirma {
  const ResultadoFirma({this.firma, this.simulada = false, this.cancelada = false, this.error});
  final String? firma;

  /// true = no se usó el chip seguro (simulador, sin Face ID o error). Se avisa en pantalla.
  final bool simulada;
  final bool cancelada;
  final String? error;

  bool get ok => firma != null;
}

/// Llave ECDSA en el chip seguro. Entrar = firmar reto al azar; firmar parte = reto con SHA-256 del contenido.
abstract interface class ServicioFirma {
  /// Crea la llave y devuelve la pública (PEM) para registrarla en el servidor.
  Future<({String? llavePublica, bool simulada, String? error})> crearLlave();
  Future<bool> tieneLlave();
  Future<ResultadoFirma> firmar(String reto, {required String motivo});
  Future<void> borrarLlave();
}

/// Llave real en el Secure Enclave con `biometric_signature` (mismo código probado en probandoFlutter/).
class FirmaEnclave implements ServicioFirma {
  FirmaEnclave({BiometricSignature? bio, this.alias = 'bomberos_parte'}) : _bio = bio ?? BiometricSignature();
  final BiometricSignature _bio;
  final String alias;

  @override
  Future<({String? llavePublica, bool simulada, String? error})> crearLlave() async {
    final r = await _bio.createKeys(
      keyAlias: alias,
      keyFormat: KeyFormat.pem,
      promptMessage: 'Confirma para crear tu llave',
      config: CreateKeysConfig(
        signatureType: SignatureType.ecdsa,
        enforceBiometric: true,
        // Pendiente de decisiones.md: ¿agregar otra cara invalida la llave? Hoy sí.
        setInvalidatedByBiometricEnrollment: true,
      ),
    );
    if (r.code != BiometricError.success) {
      return (llavePublica: null, simulada: false, error: '${r.code} ${r.error ?? ''}');
    }
    return (llavePublica: r.publicKey, simulada: false, error: null);
  }

  @override
  Future<bool> tieneLlave() => _bio.biometricKeyExists(keyAlias: alias, checkValidity: true);

  @override
  Future<ResultadoFirma> firmar(String reto, {required String motivo}) async {
    final s = await _bio.createSignature(
      payload: reto,
      keyAlias: alias,
      signatureFormat: SignatureFormat.base64,
      keyFormat: KeyFormat.pem,
      promptMessage: motivo,
    );
    if (s.code == BiometricError.userCanceled || s.code == BiometricError.systemCanceled) {
      return const ResultadoFirma(cancelada: true);
    }
    if (s.code != BiometricError.success || s.signature == null) {
      return ResultadoFirma(error: '${s.code} ${s.error ?? ''}');
    }
    return ResultadoFirma(firma: s.signature);
  }

  @override
  Future<void> borrarLlave() async => _bio.deleteKeys(keyAlias: alias);
}

/// Firma de mentira: SHA-256 del reto con prefijo SIMULADA. El servidor sólo la acepta en modo prueba.
class FirmaSimulada implements ServicioFirma {
  FirmaSimulada({this.retardo = const Duration(milliseconds: 400)});
  final Duration retardo;
  bool _tiene = false;

  @override
  Future<({String? llavePublica, bool simulada, String? error})> crearLlave() async {
    await Future<void>.delayed(retardo);
    _tiene = true;
    return (llavePublica: 'SIMULADA', simulada: true, error: null);
  }

  @override
  Future<bool> tieneLlave() async => _tiene;

  @override
  Future<ResultadoFirma> firmar(String reto, {required String motivo}) async {
    await Future<void>.delayed(retardo);
    return ResultadoFirma(firma: 'SIMULADA:${sha256.convert(utf8.encode(reto))}', simulada: true);
  }

  @override
  Future<void> borrarLlave() async => _tiene = false;
}

/// Intenta el chip seguro; si no hay Face ID o falla (simulador), cae a la simulada.
/// Si el usuario cancela, NO cae a la simulada.
class FirmaConRespaldo implements ServicioFirma {
  FirmaConRespaldo({required this.real, required this.respaldo});
  final ServicioFirma real;
  final ServicioFirma respaldo;

  @override
  Future<({String? llavePublica, bool simulada, String? error})> crearLlave() async {
    try {
      final r = await real.crearLlave();
      if (r.llavePublica != null) return r;
      debugPrint('Llave real no creada (${r.error}); uso la simulada.');
    } catch (e) {
      debugPrint('Chip seguro no disponible ($e); uso la simulada.');
    }
    return respaldo.crearLlave();
  }

  @override
  Future<bool> tieneLlave() async {
    try {
      if (await real.tieneLlave()) return true;
    } catch (_) {}
    return respaldo.tieneLlave();
  }

  @override
  Future<ResultadoFirma> firmar(String reto, {required String motivo}) async {
    try {
      final r = await real.firmar(reto, motivo: motivo);
      if (r.ok || r.cancelada) return r;
      debugPrint('Firma real falló (${r.error}); uso la simulada.');
    } catch (e) {
      debugPrint('Chip seguro no disponible ($e); uso la simulada.');
    }
    return respaldo.firmar(reto, motivo: motivo);
  }

  @override
  Future<void> borrarLlave() async {
    try {
      await real.borrarLlave();
    } catch (_) {}
    await respaldo.borrarLlave();
  }
}

/// SHA-256 (hex) del contenido canónico del parte: va dentro del reto que se firma.
String hashContenido(Map<String, dynamic> contenido) => sha256.convert(utf8.encode(jsonEncode(contenido))).toString();

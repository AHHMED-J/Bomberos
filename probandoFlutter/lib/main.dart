import 'dart:convert';

import 'package:biometric_signature/biometric_signature.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

void main() => runApp(const App());

class App extends StatelessWidget {
  const App({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Probando firma',
        theme: ThemeData(colorSchemeSeed: const Color(0xFFB3261E)),
        home: const Pantalla(),
      );
}

class Pantalla extends StatefulWidget {
  const Pantalla({super.key});
  @override
  State<Pantalla> createState() => _PantallaState();
}

class _PantallaState extends State<Pantalla> {
  final _bio = BiometricSignature();
  final _url = TextEditingController(text: 'http://10.41.116.77:3000');
  final _contenido = TextEditingController(
      text: 'Incendio de pastizal. E7 llegó a las 14:20. No hubo lesionados.');
  final List<String> _log = [];
  static const _alias = 'bomberos_prueba';

  void _anota(String t) => setState(() => _log.insert(0, t));

  Future<void> _crearLlave() async {
    try {
      final r = await _bio.createKeys(
        keyAlias: _alias,
        keyFormat: KeyFormat.pem,
        promptMessage: 'Confirma para crear tu llave',
        config: CreateKeysConfig(
          signatureType: SignatureType.ecdsa,
          enforceBiometric: true,
          setInvalidatedByBiometricEnrollment: true,
        ),
      );
      if (r.code != BiometricError.success) {
        _anota('Crear llave: ${r.code} ${r.error ?? ''}');
        return;
      }
      _anota('Llave creada en el chip seguro.');
      final resp = await http.post(Uri.parse('${_url.text}/registrar'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'publicKey': r.publicKey}));
      _anota('Registrada en el servidor: ${resp.statusCode}');
    } catch (e) {
      _anota('Error: $e');
    }
  }

  Future<void> _firmar() async {
    try {
      final rr = await http.post(Uri.parse('${_url.text}/reto'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'contenido': _contenido.text}));
      final reto = jsonDecode(rr.body)['reto'] as String;
      _anota('Reto recibido (lleva el hash del texto).');
      final s = await _bio.createSignature(
        payload: reto,
        keyAlias: _alias,
        signatureFormat: SignatureFormat.base64,
        keyFormat: KeyFormat.pem,
        promptMessage: 'Firma el parte',
      );
      if (s.code != BiometricError.success || s.signature == null) {
        _anota('Firmar: ${s.code} ${s.error ?? ''}');
        return;
      }
      final vr = await http.post(Uri.parse('${_url.text}/verificar'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'reto': reto, 'firma': s.signature}));
      final ok = jsonDecode(vr.body)['ok'] == true;
      _anota(ok ? 'FIRMA VÁLIDA según el servidor.' : 'FIRMA INVÁLIDA: ${vr.body}');
    } catch (e) {
      _anota('Error: $e');
    }
  }

  Future<void> _borrar() async {
    try {
      await _bio.deleteKeys(keyAlias: _alias);
      _anota('Llave borrada del teléfono.');
    } catch (e) {
      _anota('Error: $e');
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Probando firma con Face ID')),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              TextField(
                  controller: _url,
                  decoration: const InputDecoration(labelText: 'Servidor (IP de la Mac)')),
              const SizedBox(height: 8),
              TextField(
                  controller: _contenido,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Contenido del parte')),
              const SizedBox(height: 12),
              FilledButton(onPressed: _crearLlave, child: const Text('1. Crear llave y registrar')),
              const SizedBox(height: 8),
              FilledButton(onPressed: _firmar, child: const Text('2. Firmar el parte')),
              const SizedBox(height: 8),
              OutlinedButton(onPressed: _borrar, child: const Text('Borrar llave')),
              const Divider(),
              Expanded(
                child: ListView(children: [for (final l in _log) Text('• $l')]),
              ),
            ]),
          ),
        ),
      );
}

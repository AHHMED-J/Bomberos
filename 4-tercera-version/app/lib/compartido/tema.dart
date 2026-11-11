import 'package:flutter/material.dart';

/// Tokens visuales tomados del archivo de Figma «Parte digital · Pantallas por rol».
abstract final class Colores {
  static const rojo = Color(0xFFB3261E);
  static const rojoOscuro = Color(0xFF8C1D17);
  static const rojoClaro = Color(0xFFFBE0DD);
  static const tinta = Color(0xFF1C1B19);
  static const fondo = Color(0xFFE6E1D9);
  static const fondoCalido = Color(0xFFF6F3EE);
  static const crema = Color(0xFFF1EEEA);
  static const borde = Color(0xFFCFC8BD);
  static const gris = Color(0xFF5A5650);
  static const verde = Color(0xFF2E6B3A);
  static const verdeClaro = Color(0xFFDDEBDD);
  static const ambar = Color(0xFF7A5A00);
  static const ambarClaro = Color(0xFFFFF1C9);
  static const azul = Color(0xFF173F73);
  static const azulClaro = Color(0xFFDCE7F5);
  static const blanco = Colors.white;
}

abstract final class Fuentes {
  static const cuerpo = 'Barlow';
  static const titulo = 'BarlowCondensed';
}

/// Estilos de texto reutilizables. Los títulos van en Barlow Condensed y en mayúsculas.
abstract final class Textos {
  static const tituloPantalla = TextStyle(
    fontFamily: Fuentes.titulo,
    fontWeight: FontWeight.w700,
    fontSize: 28,
    height: 1.05,
    color: Colores.blanco,
  );
  static const tituloSeccion = TextStyle(
    fontFamily: Fuentes.titulo,
    fontWeight: FontWeight.w700,
    fontSize: 19,
    color: Colores.rojo,
    letterSpacing: .2,
  );
  static const etiqueta = TextStyle(
    fontFamily: Fuentes.cuerpo,
    fontWeight: FontWeight.w600,
    fontSize: 14,
    color: Colores.tinta,
  );
  static const cuerpo = TextStyle(fontFamily: Fuentes.cuerpo, fontSize: 16, color: Colores.tinta);
  static const chico = TextStyle(fontFamily: Fuentes.cuerpo, fontSize: 13, color: Colores.gris);
  static const grande = TextStyle(
    fontFamily: Fuentes.titulo,
    fontWeight: FontWeight.w700,
    fontSize: 34,
    color: Colores.tinta,
    height: 1.0,
  );
}

ThemeData temaBomberos() {
  final base = ThemeData(
    useMaterial3: true,
    fontFamily: Fuentes.cuerpo,
    colorScheme: ColorScheme.fromSeed(
      seedColor: Colores.rojo,
      primary: Colores.rojo,
      onPrimary: Colores.blanco,
      surface: Colores.blanco,
      onSurface: Colores.tinta,
      error: Colores.rojo,
    ),
    scaffoldBackgroundColor: Colores.blanco,
  );
  final borde = OutlineInputBorder(
    borderRadius: BorderRadius.circular(10),
    borderSide: const BorderSide(color: Colores.borde),
  );
  return base.copyWith(
    appBarTheme: const AppBarTheme(backgroundColor: Colores.rojo, foregroundColor: Colores.blanco, elevation: 0),
    inputDecorationTheme: InputDecorationTheme(
      isDense: true,
      filled: true,
      fillColor: Colores.blanco,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      border: borde,
      enabledBorder: borde,
      focusedBorder: borde.copyWith(borderSide: const BorderSide(color: Colores.azul, width: 2)),
      hintStyle: const TextStyle(color: Color(0xFF9B958A), fontStyle: FontStyle.italic, fontSize: 14),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Colores.rojo,
        foregroundColor: Colores.blanco,
        disabledBackgroundColor: const Color(0xFFD9D3CA),
        minimumSize: const Size.fromHeight(56),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: const TextStyle(fontFamily: Fuentes.cuerpo, fontWeight: FontWeight.w600, fontSize: 18),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: Colores.rojo,
        minimumSize: const Size.fromHeight(52),
        side: const BorderSide(color: Colores.rojo, width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: const TextStyle(fontFamily: Fuentes.cuerpo, fontWeight: FontWeight.w600, fontSize: 16),
      ),
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating, backgroundColor: Colores.tinta),
  );
}

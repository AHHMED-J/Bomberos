import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../datos/api_cliente.dart';
import '../datos/catalogo_campos.dart';
import '../datos/modelos.dart';
import '../hoja/hoja_controlador.dart';
import '../servicios/grabadora_audio.dart';
import '../servicios/ia/servicio_llenado_campos.dart';
import '../servicios/ia/servicio_transcripcion.dart';
import '../servicios/proveedores.dart';

/// Máquina de estados del botón flotante «Dictar» (pantallas D1–D7 de Figma).
///
///   inactivo(D1) ──Dictar──▶ grabando(D2) ──Detener y usar──▶ procesando(D4) ──▶ resultado(D5)
///        ▲   │                    │  └─sin señal──▶ guardadoSinConexion(D3) ──vuelve la señal──▶ procesando
///        │   └─sin permiso──▶ microfonoBloqueado(D7)
///        │                        └─audio casi vacío──▶ audioInvalido(D6)
///        └──Confirmar / cerrar── resultado ──Dictar más──▶ grabando
/// D8 (enviar bloqueado) no es una fase: es la hoja con campos sin confirmar.
enum FaseDictado { inactivo, grabando, guardadoSinConexion, procesando, resultado, audioInvalido, microfonoBloqueado }

enum PasoProceso { enviado, transcribiendo, ordenando, resumen }

@immutable
class EstadoDictado {
  const EstadoDictado({
    this.fase = FaseDictado.inactivo,
    this.segundos = 0,
    this.niveles = const [],
    this.paso = PasoProceso.enviado,
    this.resultado,
    this.transcripcion,
    this.resumen,
    this.audioGuardadoDuracion,
    this.audioGuardadoEn,
    this.mensaje,
    this.numeroDictado = 0,
  });

  final FaseDictado fase;
  final int segundos;

  /// Últimos niveles para dibujar la onda.
  final List<double> niveles;
  final PasoProceso paso;
  final ResultadoLlenado? resultado;

  /// Texto del último audio (el audio ya se borró).
  final String? transcripcion;

  /// Resumen para WhatsApp: vive sólo en memoria, nunca se guarda.
  final String? resumen;
  final Duration? audioGuardadoDuracion;
  final DateTime? audioGuardadoEn;
  final String? mensaje;

  /// Cuántos dictados lleva este parte (el 2.º suma y puede corregir).
  final int numeroDictado;

  EstadoDictado copiar({
    FaseDictado? fase,
    int? segundos,
    List<double>? niveles,
    PasoProceso? paso,
    ResultadoLlenado? resultado,
    String? transcripcion,
    String? resumen,
    Duration? audioGuardadoDuracion,
    DateTime? audioGuardadoEn,
    String? mensaje,
    bool limpiarMensaje = false,
    int? numeroDictado,
  }) => EstadoDictado(
    fase: fase ?? this.fase,
    segundos: segundos ?? this.segundos,
    niveles: niveles ?? this.niveles,
    paso: paso ?? this.paso,
    resultado: resultado ?? this.resultado,
    transcripcion: transcripcion ?? this.transcripcion,
    resumen: resumen ?? this.resumen,
    audioGuardadoDuracion: audioGuardadoDuracion ?? this.audioGuardadoDuracion,
    audioGuardadoEn: audioGuardadoEn ?? this.audioGuardadoEn,
    mensaje: limpiarMensaje ? null : (mensaje ?? this.mensaje),
    numeroDictado: numeroDictado ?? this.numeroDictado,
  );
}

/// Casillas dictables que siguen vacías: «Te falta mencionar».
List<CampoDef> faltaMencionar(Parte? p) => [
  for (final c in catalogoCampos)
    if (c.sugerencia != null && (p == null || p.campo(c.id).vacio)) c,
];

class DictadoControlador extends Notifier<EstadoDictado> {
  StreamSubscription<NivelAudio>? _sub;

  /// Duración mínima para considerar que se dijo algo (si no, D6).
  static const minimo = Duration(seconds: 2);

  /// El servidor rechaza audios de más de 180 s (AUDIO_MAX_S): se detiene solo un poco antes.
  static const maximo = Duration(seconds: 175);

  @override
  EstadoDictado build() {
    ref.onDispose(() => _sub?.cancel());
    // Al volver la señal se mandan los audios guardados (D3 → D4).
    ref.listen<bool>(enLineaProvider, (antes, ahora) {
      if (ahora && antes == false) enviarPendientes();
    });
    return const EstadoDictado();
  }

  GrabadoraAudio get _grabadora => ref.read(grabadoraProvider);

  /// Sin `await`: cancelar una suscripción de broadcast devuelve un Future de la zona raíz.
  void _soltarNiveles() {
    _sub?.cancel();
    _sub = null;
  }

  Future<void> iniciar() async {
    if (state.fase == FaseDictado.grabando || state.fase == FaseDictado.procesando) return;
    final permiso = await _grabadora.pedirPermiso();
    if (permiso == PermisoMicrofono.denegado) {
      state = state.copiar(fase: FaseDictado.microfonoBloqueado);
      return;
    }
    _soltarNiveles();
    _sub = _grabadora.niveles.listen((n) {
      final niveles = [...state.niveles, n.nivel];
      state = state.copiar(
        segundos: n.segundos,
        niveles: niveles.length > 40 ? niveles.sublist(niveles.length - 40) : niveles,
      );
      if (n.segundos >= maximo.inSeconds) detenerYUsar();
    });
    await _grabadora.iniciar();
    state = state.copiar(fase: FaseDictado.grabando, segundos: 0, niveles: const [], limpiarMensaje: true);
  }

  Future<void> cancelar() async {
    _soltarNiveles();
    await _grabadora.cancelar();
    state = state.copiar(fase: FaseDictado.inactivo, segundos: 0, niveles: const []);
  }

  Future<void> detenerYUsar() async {
    if (state.fase != FaseDictado.grabando) return;
    _soltarNiveles();
    final audio = await _grabadora.detener();
    if (audio.duracion < minimo) {
      state = state.copiar(fase: FaseDictado.audioInvalido);
      return;
    }
    if (!ref.read(enLineaProvider)) {
      await _guardarSinConexion(audio);
      return;
    }
    await _procesar(audio);
  }

  Future<void> _guardarSinConexion(AudioGrabado audio, {String? mensaje}) async {
    final parte = ref.read(hojaProvider);
    await ref.read(repositorioLocalProvider).guardarAudio(parte?.id ?? 'sin-parte', audio);
    state = state.copiar(
      fase: FaseDictado.guardadoSinConexion,
      audioGuardadoDuracion: audio.duracion,
      audioGuardadoEn: audio.grabadoEn,
      mensaje: mensaje,
    );
  }

  /// Manda los audios que esperaban señal, en orden.
  Future<void> enviarPendientes() async {
    final repo = ref.read(repositorioLocalProvider);
    final parte = ref.read(hojaProvider);
    for (final a in await repo.audiosPendientes()) {
      if (parte != null && a.parteId != parte.id) continue;
      await _procesar(a.audio, idLocal: a.id);
    }
  }

  Future<void> borrarAudioGuardado() async {
    final repo = ref.read(repositorioLocalProvider);
    for (final a in await repo.audiosPendientes()) {
      await repo.borrarAudio(a.id);
    }
    state = state.copiar(fase: FaseDictado.inactivo);
  }

  Future<void> _procesar(AudioGrabado audio, {int? idLocal}) async {
    final hoja = ref.read(hojaProvider.notifier);
    state = state.copiar(fase: FaseDictado.procesando, paso: PasoProceso.enviado);
    final Transcripcion t;
    try {
      state = state.copiar(paso: PasoProceso.transcribiendo);
      t = await ref.read(transcripcionProvider).transcribir(audio);
    } on AudioInvalido catch (e) {
      if (idLocal != null) await ref.read(repositorioLocalProvider).borrarAudio(idLocal);
      state = state.copiar(fase: FaseDictado.audioInvalido, mensaje: e.motivo);
      return;
    } catch (e) {
      // Falló la red a medio camino: el audio se queda en el teléfono para reintentar.
      if (idLocal == null) await _guardarSinConexion(audio, mensaje: 'No se pudo enviar. ${explicarError(e)}');
      return;
    }
    // El audio se borra apenas se transcribe (decisión del 8 de noviembre).
    if (idLocal != null) await ref.read(repositorioLocalProvider).borrarAudio(idLocal);

    try {
      state = state.copiar(paso: PasoProceso.ordenando, transcripcion: t.texto);
      final r = await ref
          .read(llenadoCamposProvider)
          .llenar(transcripcion: t.texto, camposActuales: ref.read(hojaProvider)?.campos ?? const {});
      hoja.aplicarPropuestas(r);

      state = state.copiar(paso: PasoProceso.resumen);
      final resumen = await ref
          .read(resumenProvider)
          .resumir(campos: ref.read(hojaProvider)?.campos ?? const {}, transcripcion: t.texto);
      state = state.copiar(
        fase: FaseDictado.resultado,
        resultado: r,
        resumen: resumen,
        numeroDictado: state.numeroDictado + 1,
      );
    } catch (e) {
      // La transcripción ya existe; se puede reintentar el llenado sin volver a grabar.
      state = state.copiar(fase: FaseDictado.inactivo, mensaje: 'No se pudo ordenar el dictado. ${explicarError(e)}');
    }
  }

  /// «Confirmar» (D5) o «Aceptar los cambios» (G6).
  void confirmar() {
    ref.read(hojaProvider.notifier).confirmarTodo();
    state = state.copiar(fase: FaseDictado.inactivo);
  }

  /// «Dejar como estaba» (G6).
  void dejarComoEstaba() {
    ref.read(hojaProvider.notifier).descartarPropuestas();
    state = state.copiar(fase: FaseDictado.inactivo);
  }

  Future<void> dictarMas() async {
    state = state.copiar(fase: FaseDictado.inactivo);
    await iniciar();
  }

  /// Cerrar el panel sin confirmar: los campos quedan marcados (D8).
  void cerrar() => state = state.copiar(fase: FaseDictado.inactivo, limpiarMensaje: true);

  /// Nuevo parte abierto: se reinicia la máquina.
  void reiniciar() => state = const EstadoDictado();

  Future<void> regenerarResumen() async {
    final r = await ref
        .read(resumenProvider)
        .resumir(campos: ref.read(hojaProvider)?.campos ?? const {}, transcripcion: state.transcripcion);
    state = state.copiar(resumen: r);
  }
}

final dictadoProvider = NotifierProvider<DictadoControlador, EstadoDictado>(DictadoControlador.new);

/// Errores comunes de la IA local en palabras claras (el audio se queda en el teléfono para reintentar).
String explicarError(Object e) {
  if (e is ErrorApi) {
    switch (e.codigo) {
      case 'sin_autorizacion':
        return 'La app se instaló sin la clave de la IA: reinstálala con CLAVE_LOCAL (ver ia-local/README.md).';
      case 'whisper_apagado':
      case 'ollama_apagado':
        return 'La IA de la Mac está apagada: corre ia-local/iniciar.sh.';
      case 'modelo_no_descargado':
        return 'Falta descargar el modelo en la Mac: ollama pull qwen2.5:14b.';
    }
    return 'El servidor respondió ${e.estado} (${e.codigo}).';
  }
  if (e is TimeoutException) return 'La IA tardó demasiado en responder.';
  final t = e.toString();
  if (t.contains('SocketException') || t.contains('ClientException') || t.contains('Connection')) {
    return 'No se llegó a la Mac: revisa que el servidor esté encendido (npm start) y que estén en la misma Wi-Fi.';
  }
  return t;
}

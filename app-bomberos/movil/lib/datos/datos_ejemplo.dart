// DATOS DE EJEMPLO. No son partes reales ni datos legales: sólo sirven para navegar el esqueleto.
import 'modelos.dart';

const divisionEjemplo = 'División Estructural';

const usuarioEditorPrincipal = Usuario(
  id: 'u-376285',
  nombre: 'Jalife Burgueño, Ahhmed',
  matricula: '376285',
  rango: 'Bombero',
  rol: Rol.editor,
  division: divisionEjemplo,
  estacion: 'Central',
);

const usuarioEditor = Usuario(
  id: 'u-380207',
  nombre: 'Acevedo Carrillo, Verónica',
  matricula: '380207',
  rango: 'Bombero',
  rol: Rol.editor,
  division: divisionEjemplo,
  estacion: 'Central',
);

const usuarioCapitan = Usuario(
  id: 'u-300112',
  nombre: 'Cap. J. Navarro',
  matricula: '300112',
  rango: 'Capitán',
  rol: Rol.capitan,
  division: divisionEjemplo,
  estacion: 'Central',
);

const usuariosEjemplo = [usuarioEditor, usuarioEditorPrincipal, usuarioCapitan];

ValorCampo _m(String v) => ValorCampo(valor: v);
ValorCampo _a(String v) => ValorCampo(valor: v, origen: OrigenCampo.auto);

Map<String, ValorCampo> _completo({
  required String tipo,
  required String lugar,
  required String desc,
  String c5 = 'ENS-26-118843',
  String fecha = '24/10/2026',
  String salida = '21:30',
  String llegada = '21:41',
  String regreso = '23:05',
}) => {
  'no_incidente_c5': _m(c5),
  'fecha': _a(fecha),
  'unidad': _a('Pipa 04'),
  'turno': _a('A'),
  'estacion': _a('Central'),
  'hora_salida': _m(salida),
  'hora_llegada': _m(llegada),
  'hora_regreso': _m(regreso),
  'tipo_servicio': _m(tipo),
  'zona': _m('Urbana'),
  'lugar_servicio': _m(lugar),
  'descripcion': _m(desc),
  'personal_turno': _m('Jalife Burgueño, Ahhmed; Acevedo Carrillo, Verónica'),
};

/// Partes que «ya están en el servidor» (enviados, devueltos, validados).
List<Parte> partesServidorEjemplo() => [
  Parte(
    id: 'srv-0150',
    folio: 'PE-2026-0150',
    estado: EstadoParte.enviado,
    elaboroId: usuarioEditorPrincipal.id,
    elaboroNombre: usuarioEditorPrincipal.nombre,
    division: divisionEjemplo,
    creadoEn: DateTime(2026, 11, 8, 14, 20),
    enviadoEn: DateTime(2026, 11, 8, 16, 2),
    fotos: 2,
    modo: ModoCaptura.dictado,
    segActivo: 112,
    campos: _completo(
      tipo: 'Incendio de pastizal',
      lugar: 'Calle López Mateos, El Sauzal',
      desc: '(Ejemplo) Se sofocó el fuego con pitón de niebla. No hubo lesionados.',
      c5: 'ENS-26-118842',
      fecha: '08/11/2026',
      salida: '14:05',
      llegada: '14:20',
      regreso: '15:40',
    ),
    firmas: const Firmas(elaboro: 'SIMULADA:ejemplo', elaboroSimulada: true, requierePeritaje: false),
  ),
  Parte(
    id: 'srv-0143',
    folio: 'PE-2026-0143',
    estado: EstadoParte.enviado,
    elaboroId: usuarioEditor.id,
    elaboroNombre: usuarioEditor.nombre,
    division: divisionEjemplo,
    creadoEn: DateTime(2026, 9, 6, 21, 30),
    enviadoEn: DateTime(2026, 9, 6, 23, 5),
    fotos: 1,
    modo: ModoCaptura.teclado,
    segActivo: 240,
    campos: _completo(
      tipo: 'Fuga de gas',
      lugar: 'Calle Novena 88, Col. Bustamante',
      desc: '(Ejemplo) Fuga en conexión de tanque estacionario. Se cerró la válvula.',
      fecha: '06/09/2026',
    ),
    firmas: const Firmas(elaboro: 'SIMULADA:ejemplo', elaboroSimulada: true, requierePeritaje: false),
  ),
  Parte(
    id: 'srv-0147',
    folio: 'PE-2026-0147',
    estado: EstadoParte.validado,
    elaboroId: usuarioEditorPrincipal.id,
    elaboroNombre: usuarioEditorPrincipal.nombre,
    division: divisionEjemplo,
    creadoEn: DateTime(2026, 10, 20, 9, 0),
    enviadoEn: DateTime(2026, 10, 20, 11, 0),
    fotos: 3,
    sello: '9f2c0d8e5b1a4c7f9e2d3b6a8c1f0e4d7b5a2c9e8f1d3b6a4c7e0f2d5b8a1c3e',
    campos: _completo(
      tipo: 'Incendio estructural',
      lugar: 'Av. Reforma 1520, Col. Carlos Pacheco',
      desc: '(Ejemplo) Incendio en cocina.',
    ),
    firmas: const Firmas(elaboro: 'SIMULADA:ejemplo', elaboroSimulada: true, requierePeritaje: false),
  ),
  Parte(
    id: 'srv-0142',
    folio: 'PE-2026-0142',
    estado: EstadoParte.devuelto,
    elaboroId: usuarioEditorPrincipal.id,
    elaboroNombre: usuarioEditorPrincipal.nombre,
    division: divisionEjemplo,
    creadoEn: DateTime(2026, 11, 7, 14, 5),
    fotos: 1,
    campos: _completo(
      tipo: 'Incendio de pastizal',
      lugar: 'Ejido Chapultepec',
      desc: '(Ejemplo) Quema de pastizal controlada.',
      salida: '14:05',
      llegada: '14:16',
      regreso: '15:40',
    ),
    firmas: const Firmas(elaboro: 'SIMULADA:ejemplo', elaboroSimulada: true, requierePeritaje: false),
    nota: NotaDevolucion(
      texto: 'Falta la hora de control del fuego.',
      seccion: 'Datos del servicio',
      revisor: usuarioCapitan.nombre,
      fecha: DateTime(2026, 11, 8, 8, 10),
    ),
  ),
];

/// Un parte en progreso guardado en el teléfono (pantalla G4).
Parte parteEnProgresoEjemplo() => Parte(
  id: 'loc-0152',
  folio: 'PE-2026-0152',
  estado: EstadoParte.enProgreso,
  elaboroId: usuarioEditorPrincipal.id,
  elaboroNombre: usuarioEditorPrincipal.nombre,
  division: divisionEjemplo,
  creadoEn: DateTime(2026, 11, 8, 14, 20),
  modo: ModoCaptura.dictado,
  segActivo: 64,
  campos: {
    'fecha': _a('08/11/2026'),
    'unidad': _a('E7 · Estación 3'),
    'turno': _a('A'),
    'estacion': _a('Estación 3'),
    'hora_salida': _m('14:05'),
    'tipo_servicio': _m('Incendio de pastizal'),
    'lugar_servicio': _m('Calle López Mateos, El Sauzal'),
    'descripcion': _m('(Ejemplo) Se sofocó el fuego con pitón de niebla.'),
  },
);

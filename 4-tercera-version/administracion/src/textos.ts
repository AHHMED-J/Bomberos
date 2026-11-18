// Textos, etiquetas y formatos que comparte toda la página.

import type { EstadoParte, Rol } from './api'

// Los mensajes de error del servidor, como los diría una persona.
const ERRORES: Record<string, string> = {
  sin_conexion: 'No hay conexión con el servidor. Revisa que esté encendido.',
  credenciales_incorrectas: 'El número de empleado o la contraseña no son correctos.',
  demasiados_intentos: 'Demasiados intentos fallidos. Espera unos minutos y vuelve a intentar.',
  sin_sesion: 'Tu sesión se cerró. Vuelve a entrar.',
  falta_llave: 'Falta confirmar con tu llave de acceso.',
  llave_invalida: 'La llave de acceso no se pudo comprobar. Vuelve a intentar.',
  usa_tu_llave: 'Esta cuenta ya tiene una llave de acceso: úsala para entrar.',
  sin_llaves: 'Esta cuenta todavía no tiene llave de acceso.',
  sin_reto: 'El paso tardó demasiado. Vuelve a intentar.',
  contrasena_incorrecta: 'La contraseña actual no es correcta.',
  contrasena_corta: 'La contraseña nueva debe tener al menos 12 caracteres.',
  contrasena_debil: 'La contraseña nueva no puede ser igual a la anterior ni incluir tu número de empleado.',
  debe_cambiar_contrasena: 'Primero cambia la contraseña que te entregaron.',
  es_la_ultima: 'No puedes quitar tu única llave de acceso: te quedarías sin poder entrar.',
  matricula_invalida: 'El número de empleado debe tener de 4 a 10 dígitos.',
  matricula_repetida: 'Ya existe un usuario con ese número de empleado.',
  nombre_invalido: 'Escribe el nombre completo (al menos 3 letras).',
  rol_invalido: 'Elige un rol.',
  rol_no_cambia: 'Las cuentas de Administración no se convierten en cuentas de la app, ni al revés.',
  dato_invalido: 'Revisa los datos: alguno está vacío o es demasiado largo.',
  no_a_ti_mismo: 'No puedes hacerle esto a tu propia cuenta. Pídeselo a otra persona de Administración.',
  esta_de_baja: 'El usuario está dado de baja. Reactívalo primero.',
  no_existe: 'No se encontró.',
  sin_sello: 'Este parte todavía no tiene sello: aún no lo valida un revisor.',
  origen_no_permitido: 'La petición no viene de la página de Administración.',
  error_interno: 'Algo falló en el servidor. Vuelve a intentar.',
  // Del navegador, al usar la llave de acceso
  NotAllowedError: 'Se canceló o se agotó el tiempo para usar la llave de acceso.',
  InvalidStateError: 'Esta llave de acceso ya está registrada en este equipo.',
  SecurityError: 'El navegador no permite llaves de acceso en esta dirección. Entra por https o por localhost.',
}

export function mensajeDeError(e: unknown): string {
  if (e && typeof e === 'object') {
    const codigo = 'codigo' in e ? String(e.codigo) : 'name' in e ? String(e.name) : ''
    if (ERRORES[codigo]) return ERRORES[codigo]
  }
  return 'Algo salió mal. Vuelve a intentar.'
}

export const ROLES: Record<Rol, string> = {
  editor: 'Elemento',
  capitan: 'Revisor (capitán)',
  administracion: 'Administración',
}

export const ESTADOS: Record<EstadoParte, string> = {
  borrador: 'Borrador',
  enviado: 'Por revisar',
  devuelto: 'Devuelto',
  validado: 'Validado · sellado',
}

export const TONO_ESTADO: Record<EstadoParte, Tono> = {
  borrador: 'gris',
  enviado: 'azul',
  devuelto: 'rojo',
  validado: 'verde',
}

export type Tono = 'gris' | 'azul' | 'rojo' | 'verde' | 'ambar'

// Las secciones y campos de la Hoja de incidente, como en la app
// (app/lib/datos/catalogo_campos.dart).
export const SECCIONES: { titulo: string; campos: [string, string][] }[] = [
  {
    titulo: 'Datos del servicio',
    campos: [
      ['no_incidente_c5', 'No. de incidente de C-5'],
      ['fecha', 'Fecha'],
      ['unidad', 'Unidad'],
      ['turno', 'Turno'],
      ['estacion', 'Estación'],
      ['tipo_servicio', 'Tipo de servicio'],
      ['zona', 'Zona'],
      ['hora_salida', 'Salida'],
      ['hora_llegada', 'Hora de llegada'],
      ['hora_control_fuego', 'Hora de control del fuego'],
      ['hora_regreso', 'Regreso'],
    ],
  },
  {
    titulo: 'Lugar y propietario',
    campos: [
      ['lugar_servicio', 'Lugar del servicio'],
      ['propietario', 'Propietario / arrendatario'],
      ['telefono_propietario', 'Teléfono de contacto'],
    ],
  },
  { titulo: 'Descripción del incidente', campos: [['descripcion', 'Descripción del incidente']] },
  {
    titulo: 'Personal de turno',
    campos: [
      ['personal_turno', 'Personal de turno'],
      ['voluntarios', 'Voluntarios'],
    ],
  },
  {
    titulo: 'Apoyo',
    campos: [
      ['unidades_apoyo', 'Unidades de bomberos en apoyo'],
      ['instituciones_apoyo', 'Instituciones de apoyo'],
    ],
  },
]

export const ACCIONES: Record<string, string> = {
  acceso: 'Entró',
  acceso_fallido: 'Intento fallido de entrar',
  salida: 'Salió',
  llave_registrada: 'Registró una llave de acceso',
  llave_rechazada: 'Llave de acceso rechazada',
  llave_quitada: 'Quitó una llave de acceso',
  contrasena_cambiada: 'Cambió su contraseña',
  usuario_alta: 'Dio de alta a un usuario',
  usuario_editado: 'Editó un usuario',
  usuario_baja: 'Dio de baja a un usuario',
  usuario_reactivado: 'Reactivó a un usuario',
  usuario_restablecido: 'Restableció una contraseña',
  parte_consultado: 'Consultó un parte',
  sello_verificado: 'Verificó un sello',
  exportacion: 'Exportó partes',
}

// «2026-11-08T16:02:00» o «2026-11-08 16:02:00» → «08/11/2026 16:02»
export function fechaHora(valor: string | null | undefined): string {
  if (!valor) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(valor)
  if (!m) return valor
  // Las de MySQL vienen en hora local; las ISO con Z, en UTC.
  if (valor.endsWith('Z')) {
    const d = new Date(valor)
    const dos = (n: number) => String(n).padStart(2, '0')
    return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`
  }
  return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`
}

// Un nombre para la llave que se va a crear, según el equipo.
export function nombreDelEquipo(): string {
  const agente = navigator.userAgent
  if (/iPhone/.test(agente)) return 'iPhone'
  if (/iPad/.test(agente)) return 'iPad'
  if (/Android/.test(agente)) return 'Android'
  if (/Mac OS X/.test(agente)) return 'Mac'
  if (/Windows/.test(agente)) return 'Windows'
  return 'Este equipo'
}

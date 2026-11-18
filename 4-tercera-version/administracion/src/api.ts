// Todas las llamadas al servidor. La sesión viaja en una cookie HttpOnly que
// pone el servidor: esta página nunca ve ni guarda el token.

export class ErrorApi extends Error {
  readonly codigo: string
  readonly estado: number
  readonly datos: Record<string, unknown>

  constructor(codigo: string, estado: number, datos: Record<string, unknown> = {}) {
    super(codigo)
    this.codigo = codigo
    this.estado = estado
    this.datos = datos
  }
}

// Quien escucha cuando la sesión se cerró (por tiempo o desde otro lado).
let alPerderSesion: (() => void) | null = null
export function avisarSesionPerdida(funcion: (() => void) | null) {
  alPerderSesion = funcion
}

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  let respuesta: Response
  try {
    respuesta = await fetch(`/api/admin${ruta}`, {
      method: metodo,
      credentials: 'same-origin',
      headers: cuerpo === undefined ? {} : { 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    })
  } catch {
    throw new ErrorApi('sin_conexion', 0)
  }
  const datos = (await respuesta.json().catch(() => ({}))) as Record<string, unknown>
  if (!respuesta.ok) {
    const codigo = typeof datos.error === 'string' ? datos.error : 'error_interno'
    if (respuesta.status === 401 && codigo === 'sin_sesion' && !ruta.startsWith('/acceso/')) alPerderSesion?.()
    throw new ErrorApi(codigo, respuesta.status, datos)
  }
  return datos as T
}

export const api = {
  get: <T>(ruta: string) => pedir<T>('GET', ruta),
  post: <T>(ruta: string, cuerpo?: unknown) => pedir<T>('POST', ruta, cuerpo),
  patch: <T>(ruta: string, cuerpo: unknown) => pedir<T>('PATCH', ruta, cuerpo),
  delete: <T>(ruta: string) => pedir<T>('DELETE', ruta),
}

export function consulta(parametros: Record<string, string | number | undefined>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(parametros)) if (v !== undefined && v !== '') q.set(k, String(v))
  const texto = q.toString()
  return texto ? `?${texto}` : ''
}

// --- Tipos de lo que contesta el servidor ------------------------------------

export type Rol = 'editor' | 'capitan' | 'administracion'

export interface Yo {
  usuario: { id: string; nombre: string; matricula: string; rango: string; rol: Rol }
  nivel: 'contrasena' | 'completa'
  debe_cambiar: boolean
  tiene_llaves: boolean
}

export type EstadoParte = 'borrador' | 'enviado' | 'devuelto' | 'validado'

export interface ResumenParte {
  folio: string
  estado: EstadoParte
  fecha: string
  tipo: string
  unidad: string
  turno: string
  estacion: string
  division: string
  lugar: string
  elaboro: string
  reviso: string
  enviado_en: string | null
  validado_en: string | null
  sello: string | null
}

export interface Campo {
  valor: string
  origen?: 'manual' | 'auto' | 'dictado'
  confirmado?: boolean
}

export interface Parte {
  folio: string
  estado: EstadoParte
  elaboro_id: string
  elaboro_nombre?: string
  division?: string
  creado_en?: string
  enviado_en?: string | null
  validado_en?: string | null
  campos: Record<string, Campo>
  fotos?: number
  croquis_png?: string | null
  modo?: 'teclado' | 'dictado'
  sello?: string | null
  nota?: { texto: string; seccion: string; revisor: string; fecha: string } | null
  firmas?: {
    elaboro?: string | null
    elaboro_trazo?: string | null
    revisor_id?: string
    revisor_nombre?: string
    revisor_trazo?: string | null
    propietario_nombre?: string
    propietario_trazo?: string | null
    testigo_nombre?: string
    testigo_trazo?: string | null
    requiere_peritaje?: boolean | null
  }
}

export interface EvidenciaFirma {
  rol: 'autor' | 'revisor'
  metodo: 'biometria' | 'contrasena'
  simulada: boolean
  firmada_en: string
  nombre: string | null
  matricula: string | null
}

export interface Usuario {
  id: string
  nombre: string
  matricula: string
  rango: string
  rol: Rol
  division: string
  estacion: string
  activo: boolean
  debe_cambiar: boolean
  tiene_firma: boolean
  tiene_celular: boolean
  llaves_web: number
  creado_en: string
}

export interface Registro {
  id: number
  accion: string
  objetivo: string | null
  detalle: unknown
  ip: string | null
  creada_en: string
  nombre: string | null
  matricula: string | null
}

export interface Llave {
  id: string
  nombre: string
  creada_en: string
  usada_en: string | null
}

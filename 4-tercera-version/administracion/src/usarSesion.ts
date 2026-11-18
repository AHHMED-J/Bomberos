import { createContext, useContext } from 'react'

import type { Yo } from './api'

export interface ValorSesion {
  yo: Yo | null
  cargando: boolean
  sesionPerdida: boolean
  recargar: () => Promise<Yo | null>
  salir: () => Promise<void>
}

export const Contexto = createContext<ValorSesion | null>(null)

export function useSesion(): ValorSesion {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('useSesion fuera de ProveedorSesion')
  return valor
}

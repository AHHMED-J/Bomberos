// Los avisos de quien está dentro: se piden al entrar y cada 30 segundos.

import { useCallback, useEffect, useState } from 'react'

import { api } from './api'

export interface Notificacion {
  id: number
  tipo: 'parte_validado' | 'parte_por_revisar' | 'parte_devuelto' | 'firma_cambiada'
  folio: string | null
  titulo: string
  texto: string
  creada_en: string
  leida: boolean
}

export interface Avisos {
  lista: Notificacion[]
  sinLeer: number
  marcar: (id: number) => Promise<void>
  marcarTodos: () => Promise<void>
}

const CADA = 30_000

export function useAvisosPedidos(): Avisos {
  const [lista, setLista] = useState<Notificacion[]>([])
  const [sinLeer, setSinLeer] = useState(0)

  const pedir = useCallback(async () => {
    try {
      const r = await api.get<{ notificaciones: Notificacion[]; sin_leer: number }>('/notificaciones')
      setLista(r.notificaciones)
      setSinLeer(r.sin_leer)
    } catch {
      // Sin señal un momento: se vuelve a intentar en el siguiente turno.
    }
  }, [])

  useEffect(() => {
    // Fuera del cuerpo del efecto: así el primer pedido no actualiza el estado de forma síncrona.
    const primero = setTimeout(() => void pedir(), 0)
    const cada = setInterval(() => void pedir(), CADA)
    return () => {
      clearTimeout(primero)
      clearInterval(cada)
    }
  }, [pedir])

  const marcar = useCallback(
    async (id: number) => {
      await api.post(`/notificaciones/${id}/leida`)
      await pedir()
    },
    [pedir],
  )
  const marcarTodos = useCallback(async () => {
    await api.post('/notificaciones/leidas')
    await pedir()
  }, [pedir])

  return { lista, sinLeer, marcar, marcarTodos }
}

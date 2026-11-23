// Quién está dentro. Se pregunta al servidor (GET /acceso/yo): la página no
// guarda nada de la sesión por su cuenta.

import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { api, avisarSesionPerdida, ErrorApi, type Yo } from './api'
import { Contexto } from './usarSesion'

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [yo, setYo] = useState<Yo | null>(null)
  const [cargando, setCargando] = useState(true)
  const [sesionPerdida, setSesionPerdida] = useState(false)

  const recargar = useCallback(async () => {
    try {
      const datos = await api.get<Yo>('/acceso/yo')
      setYo(datos)
      setSesionPerdida(false)
      return datos
    } catch (e) {
      if (!(e instanceof ErrorApi) || e.estado !== 401) console.error(e)
      setYo(null)
      return null
    } finally {
      setCargando(false)
    }
  }, [])

  const salir = useCallback(async () => {
    await api.post('/acceso/salir').catch(() => undefined)
    setYo(null)
  }, [])

  useEffect(() => {
    // Preguntarle al servidor quién soy es sincronizar con algo externo: es
    // justo para lo que sirve un efecto.
    // oxlint-disable-next-line react/set-state-in-effect
    void recargar()
    avisarSesionPerdida(() => {
      setYo(null)
      setSesionPerdida(true)
    })
    return () => avisarSesionPerdida(null)
  }, [recargar])

  return <Contexto.Provider value={{ yo, cargando, sesionPerdida, recargar, salir }}>{children}</Contexto.Provider>
}

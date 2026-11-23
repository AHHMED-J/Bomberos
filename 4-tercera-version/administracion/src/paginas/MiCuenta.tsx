// Mi cuenta: mis llaves de acceso y mi contraseña.

import { startRegistration } from '@simplewebauthn/browser'
import { useCallback, useEffect, useState } from 'react'

import { api, type Llave } from '../api'
import { Aviso, Cargando, Icono } from '../componentes'
import { useSesion } from '../usarSesion'
import { fechaHora, mensajeDeError, nombreDelEquipo, ROLES } from '../textos'
import { FormularioContrasena } from './CambiarContrasena'

type OpcionesRegistro = Parameters<typeof startRegistration>[0]['optionsJSON']

export function MiCuenta() {
  const { yo } = useSesion()
  const [llaves, setLlaves] = useState<Llave[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const cargar = useCallback(() => {
    api.get<{ llaves: Llave[] }>('/acceso/llaves').then(
      (r) => setLlaves(r.llaves),
      (e) => setError(mensajeDeError(e)),
    )
  }, [])
  useEffect(cargar, [cargar])

  async function hacer(trabajo: () => Promise<string>) {
    setOcupado(true)
    setError(null)
    setAviso(null)
    try {
      setAviso(await trabajo())
      cargar()
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setOcupado(false)
    }
  }

  const agregar = () =>
    hacer(async () => {
      const opciones = await api.post<OpcionesRegistro>('/acceso/llave/opciones-registro')
      const respuesta = await startRegistration({ optionsJSON: opciones })
      await api.post('/acceso/llave/registrar', { respuesta, nombre: nombreDelEquipo() })
      return 'Se agregó la llave de acceso.'
    })

  const quitar = (l: Llave) =>
    hacer(async () => {
      await api.delete(`/acceso/llaves/${encodeURIComponent(l.id)}`)
      return `Se quitó «${l.nombre}».`
    })

  return (
    <section className="estrecha">
      <h1 className="titulo-pagina">Mi cuenta</h1>
      <div className="tarjeta">
        <p>
          <strong>{yo?.usuario.nombre}</strong>
        </p>
        <p className="nota">
          No. de empleado <span className="mono">{yo?.usuario.matricula}</span> · {yo && ROLES[yo.usuario.rol]}
        </p>
      </div>

      <section className="tarjeta">
        <h2 className="titulo-seccion">Llaves de acceso</h2>
        <p className="nota">
          Con ellas entras sin escribir tu contraseña: tu huella, tu cara o el PIN del equipo. Agrega una en cada equipo
          que uses; si pierdes uno, quita su llave aquí.
        </p>
        {aviso && <Aviso tono="verde">{aviso}</Aviso>}
        {error && <Aviso tono="rojo">{error}</Aviso>}
        {!llaves ? (
          <Cargando />
        ) : (
          <ul className="llaves">
            {llaves.map((l) => (
              <li key={l.id}>
                <div>
                  <strong>{l.nombre}</strong>
                  <small className="bloque">
                    Creada {fechaHora(l.creada_en)} · último uso {fechaHora(l.usada_en)}
                  </small>
                </div>
                <button className="boton-texto peligro" onClick={() => quitar(l)} disabled={ocupado || llaves.length === 1}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
        <button className="boton-contorno chico" onClick={agregar} disabled={ocupado}>
          <Icono nombre="huella" /> Agregar llave en este equipo
        </button>
      </section>

      <section className="tarjeta">
        <h2 className="titulo-seccion">Cambiar contraseña</h2>
        <FormularioContrasena alTerminar={() => setAviso('Se cambió tu contraseña. Se cerraron tus otras sesiones.')} />
      </section>
    </section>
  )
}

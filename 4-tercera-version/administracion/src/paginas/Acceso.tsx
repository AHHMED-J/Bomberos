// A1 · Acceso, como en la app: número de empleado y contraseña, o directo con
// la biometría. En el navegador la biometría es una «llave de acceso»
// (WebAuthn): Touch ID, Face ID, Windows Hello o una llave USB.
//
// La contraseña sola nunca abre Administración. Después de escribirla:
//   · si la cuenta no tiene llave, se crea una (sólo la primera vez);
//   · si ya tiene, se confirma con ella.

import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { useState, type FormEvent } from 'react'

import { api } from '../api'
import { Aviso, Escudo, Icono } from '../componentes'
import { useSesion } from '../usarSesion'
import { mensajeDeError, nombreDelEquipo } from '../textos'

type Paso = 'credenciales' | 'registrar' | 'usar'
type Opciones = Parameters<typeof startAuthentication>[0]['optionsJSON']
type OpcionesRegistro = Parameters<typeof startRegistration>[0]['optionsJSON']

export function Acceso() {
  const { yo, recargar, salir, sesionPerdida } = useSesion()
  const [noEmpleado, setNoEmpleado] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [nombreLlave, setNombreLlave] = useState(nombreDelEquipo)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const conLlaves = browserSupportsWebAuthn()

  // El paso sale de la sesión del servidor: si se recarga la página a medio
  // camino, retoma donde iba.
  const paso: Paso = yo?.nivel === 'contrasena' ? (yo.tiene_llaves ? 'usar' : 'registrar') : 'credenciales'

  async function hacer(trabajo: () => Promise<void>) {
    setOcupado(true)
    setError(null)
    try {
      await trabajo()
    } catch (e) {
      setError(mensajeDeError(e))
      const segundos = (e as { datos?: { segundos?: number } }).datos?.segundos
      if (segundos) setError(`${mensajeDeError(e)} (${Math.ceil(segundos / 60)} min)`)
    } finally {
      setOcupado(false)
    }
  }

  const entrar = (ev: FormEvent) => {
    ev.preventDefault()
    if (!noEmpleado.trim() || !contrasena) return setError('Escribe tu número de empleado y tu contraseña.')
    void hacer(async () => {
      await api.post('/acceso/entrar', { no_empleado: noEmpleado.trim(), contrasena })
      setContrasena('')
      await recargar()
    })
  }

  const crearLlave = () =>
    hacer(async () => {
      const opciones = await api.post<OpcionesRegistro>('/acceso/llave/opciones-registro')
      const respuesta = await startRegistration({ optionsJSON: opciones })
      await api.post('/acceso/llave/registrar', { respuesta, nombre: nombreLlave })
      await recargar()
    })

  const usarLlave = () =>
    hacer(async () => {
      const opciones = await api.post<Opciones>('/acceso/llave/opciones-acceso')
      const respuesta = await startAuthentication({ optionsJSON: opciones })
      await api.post('/acceso/llave/verificar', { respuesta })
      await recargar()
    })

  const soloConLlave = () =>
    hacer(async () => {
      const opciones = await api.post<Opciones>('/acceso/llave-sola/opciones')
      const respuesta = await startAuthentication({ optionsJSON: opciones })
      await api.post('/acceso/llave-sola/verificar', { respuesta })
      await recargar()
    })

  const otraCuenta = () => hacer(salir)

  return (
    <main className="acceso">
      <div className="acceso-tarjeta">
        <Escudo />
        <h1 className="acceso-titulo">
          Bomberos de
          <br />
          Ensenada
        </h1>
        <p className="acceso-subtitulo">Administración</p>

        {!conLlaves && (
          <Aviso tono="ambar">
            Este navegador no maneja llaves de acceso. Usa Safari, Chrome, Edge o Firefox actualizados, en
            https o en localhost.
          </Aviso>
        )}
        {sesionPerdida && paso === 'credenciales' && <Aviso tono="ambar">Tu sesión se cerró. Vuelve a entrar.</Aviso>}

        {paso === 'credenciales' && (
          <form onSubmit={entrar} className="pila">
            <label className="campo">
              <span>Número de empleado</span>
              <input
                value={noEmpleado}
                onChange={(e) => setNoEmpleado(e.target.value)}
                inputMode="numeric"
                autoComplete="username webauthn"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={20}
                autoFocus
              />
            </label>
            <label className="campo">
              <span>Contraseña</span>
              <input
                type="password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                autoComplete="current-password"
                maxLength={200}
              />
            </label>
            {error && <Aviso tono="rojo">{error}</Aviso>}
            <button className="boton" type="submit" disabled={ocupado}>
              {ocupado ? <span className="girando" aria-hidden="true" /> : null} Entrar
            </button>
            {conLlaves && (
              <button className="boton-contorno" type="button" onClick={soloConLlave} disabled={ocupado}>
                <Icono nombre="huella" /> Entrar con mi llave de acceso
              </button>
            )}
            <p className="nota centrada">
              Tu usuario es tu número de empleado. Si olvidaste tu contraseña o perdiste tu llave de acceso, pide a
              otra persona de Administración que la restablezca.
            </p>
          </form>
        )}

        {paso === 'registrar' && (
          <div className="pila">
            <h2 className="titulo-seccion">Crea tu llave de acceso</h2>
            <p>
              Para entrar a Administración, además de la contraseña necesitas una <strong>llave de acceso</strong>: tu
              huella, tu cara o el PIN de este equipo. Tu huella no sale del equipo; sólo se guarda una llave pública.
            </p>
            <label className="campo">
              <span>Nombre de esta llave</span>
              <input value={nombreLlave} onChange={(e) => setNombreLlave(e.target.value)} maxLength={80} />
            </label>
            {error && <Aviso tono="rojo">{error}</Aviso>}
            <button className="boton" onClick={crearLlave} disabled={ocupado || !conLlaves}>
              <Icono nombre="huella" /> Crear mi llave de acceso
            </button>
            <button className="boton-texto" onClick={otraCuenta} disabled={ocupado}>
              Entrar con otra cuenta
            </button>
          </div>
        )}

        {paso === 'usar' && (
          <div className="pila">
            <h2 className="titulo-seccion">Confirma que eres tú</h2>
            <p>Usa tu llave de acceso: tu huella, tu cara o el PIN de este equipo.</p>
            {error && <Aviso tono="rojo">{error}</Aviso>}
            <button className="boton" onClick={usarLlave} disabled={ocupado || !conLlaves} autoFocus>
              <Icono nombre="huella" /> Usar mi llave de acceso
            </button>
            <button className="boton-texto" onClick={otraCuenta} disabled={ocupado}>
              Entrar con otra cuenta
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

// Cambiar la contraseña. Es obligatorio la primera vez (o después de que la
// restablezcan); también se usa desde Mi cuenta.

import { useState, type FormEvent } from 'react'

import { api } from '../api'
import { Aviso } from '../componentes'
import { mensajeDeError } from '../textos'

export function FormularioContrasena({ alTerminar }: { alTerminar: () => void }) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar(ev: FormEvent) {
    ev.preventDefault()
    if (nueva.length < 12) return setError('La contraseña nueva debe tener al menos 12 caracteres.')
    if (nueva !== repetida) return setError('Las dos contraseñas nuevas no son iguales.')
    setOcupado(true)
    setError(null)
    try {
      await api.post('/acceso/contrasena', { actual, nueva })
      setActual('')
      setNueva('')
      setRepetida('')
      alTerminar()
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <form className="pila" onSubmit={guardar}>
      <label className="campo">
        <span>Contraseña actual</span>
        <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" maxLength={200} />
      </label>
      <label className="campo">
        <span>Contraseña nueva</span>
        <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" minLength={12} maxLength={200} />
        <small>Al menos 12 caracteres. Una frase de varias palabras es fácil de recordar y difícil de adivinar.</small>
      </label>
      <label className="campo">
        <span>Repite la contraseña nueva</span>
        <input type="password" value={repetida} onChange={(e) => setRepetida(e.target.value)} autoComplete="new-password" maxLength={200} />
      </label>
      {error && <Aviso tono="rojo">{error}</Aviso>}
      <button className="boton" type="submit" disabled={ocupado}>
        Guardar contraseña
      </button>
    </form>
  )
}

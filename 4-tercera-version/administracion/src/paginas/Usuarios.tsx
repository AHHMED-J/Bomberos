// RF-11 alta de usuarios y RF-12 quién puede revisar. Aquí también se
// restablece una contraseña olvidada y se da de baja (nunca se borra a nadie).

import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { api, consulta, type Rol, type Usuario } from '../api'
import { Aviso, Cargando, Chip, Dialogo, Icono } from '../componentes'
import { useSesion } from '../usarSesion'
import { mensajeDeError, ROLES } from '../textos'

type Accion =
  | { tipo: 'alta' }
  | { tipo: 'editar'; usuario: Usuario }
  | { tipo: 'confirmar'; usuario: Usuario; que: 'baja' | 'reactivar' | 'restablecer' | 'revisor' | 'elemento' }
  | { tipo: 'contrasena'; usuario: Usuario; contrasena: string; porque: 'alta' | 'restablecer' }

const TEXTO_CONFIRMAR = {
  baja: {
    titulo: 'Dar de baja',
    boton: 'Dar de baja',
    texto: 'Ya no podrá entrar y se cerrarán sus sesiones abiertas. Sus partes se conservan. Puedes reactivarlo después.',
  },
  reactivar: { titulo: 'Reactivar', boton: 'Reactivar', texto: 'Podrá volver a entrar con su contraseña.' },
  restablecer: {
    titulo: 'Restablecer contraseña',
    boton: 'Restablecer',
    texto:
      'Se le dará una contraseña nueva que tendrá que cambiar. Se borran la llave de su celular y sus llaves de acceso, y se cierran sus sesiones.',
  },
  revisor: {
    titulo: 'Habilitar como revisor',
    boton: 'Habilitar',
    texto: 'Podrá revisar, firmar como revisor y enviar partes a Administración.',
  },
  elemento: {
    titulo: 'Quitar permiso de revisar',
    boton: 'Quitar permiso',
    texto: 'Ya no podrá revisar ni validar partes. Seguirá pudiendo llenar los suyos.',
  },
} as const

export function Usuarios() {
  const { yo } = useSesion()
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null)
  const [texto, setTexto] = useState('')
  const [rol, setRol] = useState('')
  const [activo, setActivo] = useState('1')
  const [error, setError] = useState<string | null>(null)
  const [accion, setAccion] = useState<Accion | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try {
      const r = await api.get<{ usuarios: Usuario[] }>(`/usuarios${consulta({ texto, rol, activo })}`)
      setUsuarios(r.usuarios)
      setError(null)
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }, [texto, rol, activo])

  useEffect(() => {
    const t = setTimeout(() => void cargar(), 250)
    return () => clearTimeout(t)
  }, [cargar])

  const cerrar = () => setAccion(null)
  const esYo = (u: Usuario) => u.id === yo?.usuario.id

  return (
    <section>
      <div className="encabezado-pagina">
        <h1 className="titulo-pagina">Usuarios</h1>
        <button className="boton chico" onClick={() => setAccion({ tipo: 'alta' })}>
          <Icono nombre="mas" /> Dar de alta
        </button>
      </div>

      <div className="filtros tarjeta">
        <label className="campo ancho">
          <span>Buscar nombre o número de empleado</span>
          <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={80} />
        </label>
        <label className="campo">
          <span>Rol</span>
          <select value={rol} onChange={(e) => setRol(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(ROLES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Estado</span>
          <select value={activo} onChange={(e) => setActivo(e.target.value)}>
            <option value="1">Activos</option>
            <option value="0">Dados de baja</option>
            <option value="">Todos</option>
          </select>
        </label>
      </div>

      {aviso && <Aviso tono="verde">{aviso}</Aviso>}
      {error && <Aviso tono="rojo">{error}</Aviso>}
      {!usuarios && !error && <Cargando />}
      {usuarios && usuarios.length === 0 && <div className="tarjeta vacia">No hay usuarios con esos filtros.</div>}
      {usuarios && usuarios.length > 0 && (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>No. empleado</th>
                <th>Rol</th>
                <th>Estación</th>
                <th title="Firma en trazo / celular registrado / llaves de acceso web">Listo para</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className={u.activo ? undefined : 'apagada'}>
                  <td>
                    {u.nombre}
                    <small className="bloque">{u.rango}</small>
                  </td>
                  <td className="mono">{u.matricula}</td>
                  <td>
                    <Chip tono={u.rol === 'capitan' ? 'azul' : u.rol === 'administracion' ? 'rojo' : 'gris'}>{ROLES[u.rol]}</Chip>
                  </td>
                  <td>
                    {u.estacion}
                    <small className="bloque">{u.division}</small>
                  </td>
                  <td className="listo">
                    {u.rol === 'administracion' ? (
                      <span>{u.llaves_web ? `${u.llaves_web} llave(s) de acceso` : 'Sin llave de acceso'}</span>
                    ) : (
                      <span>
                        {u.tiene_firma ? 'Firma ✓' : 'Sin firma'} · {u.tiene_celular ? 'Celular ✓' : 'Sin celular'}
                      </span>
                    )}
                    {u.debe_cambiar && <small className="bloque">Con contraseña temporal</small>}
                  </td>
                  <td>{u.activo ? <Chip tono="verde">Activo</Chip> : <Chip tono="gris">De baja</Chip>}</td>
                  <td className="acciones-fila">
                    {u.activo && u.rol === 'editor' && (
                      <button className="boton-texto" onClick={() => setAccion({ tipo: 'confirmar', usuario: u, que: 'revisor' })}>
                        Hacer revisor
                      </button>
                    )}
                    {u.activo && u.rol === 'capitan' && !esYo(u) && (
                      <button className="boton-texto" onClick={() => setAccion({ tipo: 'confirmar', usuario: u, que: 'elemento' })}>
                        Quitar revisión
                      </button>
                    )}
                    <button className="boton-texto" onClick={() => setAccion({ tipo: 'editar', usuario: u })}>
                      Editar
                    </button>
                    {u.activo && !esYo(u) && (
                      <button className="boton-texto" onClick={() => setAccion({ tipo: 'confirmar', usuario: u, que: 'restablecer' })}>
                        Restablecer
                      </button>
                    )}
                    {!esYo(u) &&
                      (u.activo ? (
                        <button className="boton-texto peligro" onClick={() => setAccion({ tipo: 'confirmar', usuario: u, que: 'baja' })}>
                          Dar de baja
                        </button>
                      ) : (
                        <button className="boton-texto" onClick={() => setAccion({ tipo: 'confirmar', usuario: u, que: 'reactivar' })}>
                          Reactivar
                        </button>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialogo abierto={accion?.tipo === 'alta'} titulo="Dar de alta" alCerrar={cerrar}>
        <FormularioAlta
          alCancelar={cerrar}
          alTerminar={(usuario, contrasena) => {
            setAccion({ tipo: 'contrasena', usuario, contrasena, porque: 'alta' })
            void cargar()
          }}
        />
      </Dialogo>

      <Dialogo abierto={accion?.tipo === 'editar'} titulo="Editar usuario" alCerrar={cerrar}>
        {accion?.tipo === 'editar' && (
          <FormularioEditar
            usuario={accion.usuario}
            alCancelar={cerrar}
            alTerminar={(u) => {
              cerrar()
              setAviso(`Se guardaron los datos de ${u.nombre}.`)
              void cargar()
            }}
          />
        )}
      </Dialogo>

      <Dialogo
        abierto={accion?.tipo === 'confirmar'}
        titulo={accion?.tipo === 'confirmar' ? TEXTO_CONFIRMAR[accion.que].titulo : ''}
        alCerrar={cerrar}
      >
        {accion?.tipo === 'confirmar' && (
          <Confirmar
            usuario={accion.usuario}
            que={accion.que}
            alCancelar={cerrar}
            alTerminar={(mensaje, contrasena) => {
              if (contrasena) setAccion({ tipo: 'contrasena', usuario: accion.usuario, contrasena, porque: 'restablecer' })
              else cerrar()
              setAviso(mensaje)
              void cargar()
            }}
          />
        )}
      </Dialogo>

      <Dialogo abierto={accion?.tipo === 'contrasena'} titulo="Contraseña para entregar" alCerrar={cerrar}>
        {accion?.tipo === 'contrasena' && <ContrasenaEntregada {...accion} alCerrar={cerrar} />}
      </Dialogo>
    </section>
  )
}

function FormularioAlta({
  alCancelar,
  alTerminar,
}: {
  alCancelar: () => void
  alTerminar: (u: Usuario, contrasena: string) => void
}) {
  const [d, setD] = useState({ matricula: '', nombre: '', rol: 'editor' as Rol, rango: '', division: '', estacion: '' })
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function guardar(ev: FormEvent) {
    ev.preventDefault()
    setOcupado(true)
    setError(null)
    try {
      const r = await api.post<{ usuario: Usuario; contrasena: string }>('/usuarios', {
        ...d,
        rango: d.rango || undefined,
        division: d.division || undefined,
        estacion: d.estacion || undefined,
      })
      alTerminar(r.usuario, r.contrasena)
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setOcupado(false)
    }
  }

  const campo = (k: keyof typeof d) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value })
  return (
    <form className="pila" onSubmit={guardar}>
      <label className="campo">
        <span>Número de empleado (será su usuario)</span>
        <input value={d.matricula} onChange={campo('matricula')} inputMode="numeric" pattern="\d{4,10}" required autoFocus />
      </label>
      <label className="campo">
        <span>Nombre completo</span>
        <input value={d.nombre} onChange={campo('nombre')} required minLength={3} maxLength={160} placeholder="Apellidos, Nombre" />
      </label>
      <label className="campo">
        <span>Rol</span>
        <select value={d.rol} onChange={campo('rol')}>
          <option value="editor">Elemento (llena partes en la app)</option>
          <option value="capitan">Revisor · capitán (también revisa y valida)</option>
          <option value="administracion">Administración (sólo esta página)</option>
        </select>
      </label>
      <div className="dos-columnas">
        <label className="campo">
          <span>Rango</span>
          <input value={d.rango} onChange={campo('rango')} maxLength={40} placeholder={d.rol === 'capitan' ? 'Capitán' : d.rol === 'administracion' ? 'Administración' : 'Bombero'} />
        </label>
        <label className="campo">
          <span>Estación</span>
          <input value={d.estacion} onChange={campo('estacion')} maxLength={80} placeholder="Central" />
        </label>
      </div>
      <label className="campo">
        <span>División</span>
        <input value={d.division} onChange={campo('division')} maxLength={80} placeholder="División Estructural" />
      </label>
      {error && <Aviso tono="rojo">{error}</Aviso>}
      <div className="botones-dialogo">
        <button type="button" className="boton-texto" onClick={alCancelar}>
          Cancelar
        </button>
        <button type="submit" className="boton chico" disabled={ocupado}>
          Dar de alta
        </button>
      </div>
    </form>
  )
}

function FormularioEditar({
  usuario,
  alCancelar,
  alTerminar,
}: {
  usuario: Usuario
  alCancelar: () => void
  alTerminar: (u: Usuario) => void
}) {
  const [d, setD] = useState({ nombre: usuario.nombre, rango: usuario.rango, division: usuario.division, estacion: usuario.estacion })
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function guardar(ev: FormEvent) {
    ev.preventDefault()
    setOcupado(true)
    setError(null)
    try {
      const r = await api.patch<{ usuario: Usuario }>(`/usuarios/${encodeURIComponent(usuario.id)}`, d)
      alTerminar(r.usuario)
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setOcupado(false)
    }
  }
  const campo = (k: keyof typeof d) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value })
  return (
    <form className="pila" onSubmit={guardar}>
      <p className="nota">
        No. de empleado <strong className="mono">{usuario.matricula}</strong> · {ROLES[usuario.rol]}
      </p>
      <label className="campo">
        <span>Nombre completo</span>
        <input value={d.nombre} onChange={campo('nombre')} required minLength={3} maxLength={160} />
      </label>
      <div className="dos-columnas">
        <label className="campo">
          <span>Rango</span>
          <input value={d.rango} onChange={campo('rango')} required maxLength={40} />
        </label>
        <label className="campo">
          <span>Estación</span>
          <input value={d.estacion} onChange={campo('estacion')} required maxLength={80} />
        </label>
      </div>
      <label className="campo">
        <span>División</span>
        <input value={d.division} onChange={campo('division')} required maxLength={80} />
      </label>
      {error && <Aviso tono="rojo">{error}</Aviso>}
      <div className="botones-dialogo">
        <button type="button" className="boton-texto" onClick={alCancelar}>
          Cancelar
        </button>
        <button type="submit" className="boton chico" disabled={ocupado}>
          Guardar
        </button>
      </div>
    </form>
  )
}

function Confirmar({
  usuario,
  que,
  alCancelar,
  alTerminar,
}: {
  usuario: Usuario
  que: keyof typeof TEXTO_CONFIRMAR
  alCancelar: () => void
  alTerminar: (mensaje: string, contrasena?: string) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const t = TEXTO_CONFIRMAR[que]
  const ruta = `/usuarios/${encodeURIComponent(usuario.id)}`

  async function hacer() {
    setOcupado(true)
    setError(null)
    try {
      if (que === 'restablecer') {
        const r = await api.post<{ contrasena: string }>(`${ruta}/restablecer`)
        alTerminar(`Se restableció la contraseña de ${usuario.nombre}.`, r.contrasena)
      } else if (que === 'baja' || que === 'reactivar') {
        await api.patch(ruta, { activo: que === 'reactivar' })
        alTerminar(que === 'baja' ? `${usuario.nombre} quedó dado de baja.` : `${usuario.nombre} está activo otra vez.`)
      } else {
        await api.patch(ruta, { rol: que === 'revisor' ? 'capitan' : 'editor' })
        alTerminar(que === 'revisor' ? `${usuario.nombre} ya puede revisar.` : `${usuario.nombre} ya no revisa partes.`)
      }
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="pila">
      <p>
        <strong>{usuario.nombre}</strong> · <span className="mono">{usuario.matricula}</span>
      </p>
      <p>{t.texto}</p>
      {error && <Aviso tono="rojo">{error}</Aviso>}
      <div className="botones-dialogo">
        <button className="boton-texto" onClick={alCancelar}>
          Cancelar
        </button>
        <button className={que === 'baja' ? 'boton chico peligro' : 'boton chico'} onClick={hacer} disabled={ocupado}>
          {t.boton}
        </button>
      </div>
    </div>
  )
}

function ContrasenaEntregada({
  usuario,
  contrasena,
  porque,
  alCerrar,
}: {
  usuario: Usuario
  contrasena: string
  porque: 'alta' | 'restablecer'
  alCerrar: () => void
}) {
  const [copiada, setCopiada] = useState(false)
  return (
    <div className="pila">
      <p>
        {porque === 'alta' ? 'Se dio de alta a' : 'Contraseña nueva de'} <strong>{usuario.nombre}</strong>.
      </p>
      <dl className="credencial">
        <dt>Usuario (número de empleado)</dt>
        <dd className="mono">{usuario.matricula}</dd>
        <dt>Contraseña</dt>
        <dd className="mono grande">{contrasena}</dd>
      </dl>
      <Aviso tono="ambar">
        Entrégasela en persona. <strong>No se vuelve a mostrar</strong>: si se pierde, hay que restablecerla.
        {usuario.rol === 'administracion' && ' Al entrar, deberá cambiarla y crear su llave de acceso.'}
      </Aviso>
      <div className="botones-dialogo">
        <button
          className="boton-contorno chico"
          onClick={() => {
            void navigator.clipboard?.writeText(contrasena).then(() => setCopiada(true))
          }}
        >
          {copiada ? 'Copiada' : 'Copiar contraseña'}
        </button>
        <button className="boton chico" onClick={alCerrar}>
          Ya la entregué
        </button>
      </div>
    </div>
  )
}

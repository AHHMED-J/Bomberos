// RF-10 · Consultar, filtrar y exportar los partes. Los filtros viven en la
// dirección de la página, así que «atrás» los conserva y se pueden compartir.

import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { api, consulta, type ResumenParte } from '../api'
import { Aviso, Cargando, Chip, Icono, Paginacion } from '../componentes'
import { ESTADOS, mensajeDeError, TONO_ESTADO } from '../textos'

const FILTROS = ['estado', 'desde', 'hasta', 'tipo', 'unidad', 'division', 'texto'] as const
type Filtros = Record<(typeof FILTROS)[number], string>

interface Lista {
  partes: ResumenParte[]
  total: number
  pagina: number
  por_pagina: number
}
interface Opciones {
  tipos: string[]
  unidades: string[]
  divisiones: string[]
}

export function Partes() {
  const [params, setParams] = useSearchParams()
  const navegar = useNavigate()
  const filtros = Object.fromEntries(FILTROS.map((f) => [f, params.get(f) ?? (f === 'estado' ? 'validado' : '')])) as Filtros
  const pagina = Number(params.get('pagina')) || 1
  const [lista, setLista] = useState<Lista | null>(null)
  const [opciones, setOpciones] = useState<Opciones>({ tipos: [], unidades: [], divisiones: [] })
  const [error, setError] = useState<string | null>(null)
  const clave = params.toString()

  useEffect(() => {
    api.get<Opciones>('/partes/opciones').then(setOpciones, () => undefined)
  }, [])

  useEffect(() => {
    let vigente = true
    const q = Object.fromEntries(new URLSearchParams(clave))
    api.get<Lista>(`/partes${consulta({ estado: 'validado', ...q })}`).then(
      (l) => {
        if (!vigente) return
        setLista(l)
        setError(null)
      },
      (e) => vigente && setError(mensajeDeError(e)),
    )
    return () => {
      vigente = false
    }
  }, [clave])

  function aplicar(nuevos: Filtros, nuevaPagina = 1) {
    const p = new URLSearchParams()
    for (const f of FILTROS) if (nuevos[f]) p.set(f, nuevos[f])
    if (nuevaPagina > 1) p.set('pagina', String(nuevaPagina))
    setParams(p)
  }

  const exportar = `/api/admin/partes/exportar${consulta(filtros)}`
  const cuantos = FILTROS.filter((f) => f !== 'estado' && filtros[f]).length

  return (
    <section>
      <div className="encabezado-pagina">
        <h1 className="titulo-pagina">Partes</h1>
        <a className="boton-contorno chico" href={exportar} download>
          <Icono nombre="descargar" /> Exportar CSV
        </a>
      </div>

      {/* key: con «atrás» o «adelante» el formulario vuelve a mostrar los filtros de la dirección. */}
      <details className="plegable" open={!esTelefono()}>
        <summary className="boton-contorno chico">Filtros{cuantos ? ` (${cuantos})` : ''}</summary>
        <FormularioFiltros key={clave} inicial={filtros} opciones={opciones} alAplicar={(f) => aplicar(f)} />
      </details>

      {error && <Aviso tono="rojo">{error}</Aviso>}
      {!lista && !error && <Cargando />}
      {lista && (
        <>
          <p className="nota">
            {lista.total === 1 ? '1 parte' : `${lista.total} partes`}
            {filtros.estado === 'validado' ? ' validados' : ''}
          </p>
          {lista.partes.length === 0 ? (
            <div className="tarjeta vacia">No hay partes con esos filtros.</div>
          ) : (
            <div className="tabla-envoltura">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Fecha</th>
                    <th>Tipo de servicio</th>
                    <th>Unidad</th>
                    <th>Lugar</th>
                    <th>Elaboró</th>
                    <th>Revisó</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.partes.map((p) => (
                    <tr key={p.folio} className="fila-enlace" onClick={() => navegar(`/partes/${p.folio}`)}>
                      <td>
                        <Link to={`/partes/${p.folio}`} onClick={(e) => e.stopPropagation()} className="folio">
                          {p.folio}
                        </Link>
                      </td>
                      <td className="sin-salto">{p.fecha || '—'}</td>
                      <td>{p.tipo || '—'}</td>
                      <td className="sin-salto">{p.unidad || '—'}</td>
                      <td className="recortar">{p.lugar || '—'}</td>
                      <td>{p.elaboro || '—'}</td>
                      <td>{p.reviso || '—'}</td>
                      <td>
                        <Chip tono={TONO_ESTADO[p.estado]}>{ESTADOS[p.estado]}</Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Paginacion pagina={pagina} total={lista.total} porPagina={lista.por_pagina} alCambiar={(p) => aplicar(filtros, p)} />
        </>
      )}
    </section>
  )
}

const esTelefono = () => window.matchMedia('(max-width: 760px)').matches

const VACIOS: Filtros = { estado: 'validado', desde: '', hasta: '', tipo: '', unidad: '', division: '', texto: '' }

function FormularioFiltros({
  inicial,
  opciones,
  alAplicar,
}: {
  inicial: Filtros
  opciones: Opciones
  alAplicar: (f: Filtros) => void
}) {
  const [borrador, setBorrador] = useState<Filtros>(inicial)
  const cambiar = (f: keyof Filtros) => (e: { target: { value: string } }) => setBorrador({ ...borrador, [f]: e.target.value })
  return (
    <form
      className="filtros tarjeta"
      onSubmit={(e) => {
        e.preventDefault()
        alAplicar(borrador)
      }}
    >
      <label className="campo">
        <span>Estado</span>
        <select value={borrador.estado} onChange={cambiar('estado')}>
          <option value="validado">Validados (enviados a Administración)</option>
          <option value="enviado">Por revisar</option>
          <option value="devuelto">Devueltos</option>
          <option value="todos">Todos</option>
        </select>
      </label>
      <label className="campo">
        <span>Desde</span>
        <input type="date" value={borrador.desde} onChange={cambiar('desde')} />
      </label>
      <label className="campo">
        <span>Hasta</span>
        <input type="date" value={borrador.hasta} onChange={cambiar('hasta')} />
      </label>
      <label className="campo">
        <span>Tipo de servicio</span>
        <select value={borrador.tipo} onChange={cambiar('tipo')}>
          <option value="">Todos</option>
          {opciones.tipos.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span>Unidad</span>
        <select value={borrador.unidad} onChange={cambiar('unidad')}>
          <option value="">Todas</option>
          {opciones.unidades.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span>División</span>
        <select value={borrador.division} onChange={cambiar('division')}>
          <option value="">Todas</option>
          {opciones.divisiones.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </label>
      <label className="campo ancho">
        <span>Buscar folio, lugar o quién lo elaboró</span>
        <input type="search" value={borrador.texto} onChange={cambiar('texto')} maxLength={120} />
      </label>
      <div className="filtros-botones">
        <button className="boton chico" type="submit">
          Filtrar
        </button>
        <button className="boton-texto" type="button" onClick={() => alAplicar(VACIOS)}>
          Limpiar
        </button>
      </div>
    </form>
  )
}

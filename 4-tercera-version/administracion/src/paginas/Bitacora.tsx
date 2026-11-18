// La bitácora: quién hizo qué en Administración. Sólo lectura.

import { useEffect, useState } from 'react'

import { api, consulta, type Registro } from '../api'
import { Aviso, Cargando, Chip, Paginacion } from '../componentes'
import { ACCIONES, fechaHora, mensajeDeError } from '../textos'

interface Lista {
  registros: Registro[]
  total: number
  pagina: number
  por_pagina: number
}

const ALERTA = new Set(['acceso_fallido', 'llave_rechazada'])

function detalle(r: Registro): string {
  const d = r.detalle as Record<string, unknown> | null
  if (!d || typeof d !== 'object') return ''
  if (r.accion === 'exportacion') {
    const filtros = Object.entries((d.filtros as Record<string, string>) || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    return `${d.renglones} renglones${filtros ? ` · ${filtros}` : ''}`
  }
  if (r.accion === 'sello_verificado') return d.coincide ? 'coincide' : 'NO coincide'
  if (r.accion === 'acceso') return `${d.metodo === 'llave' ? 'llave de acceso' : 'contraseña + llave'}${d.llave ? ` (${d.llave})` : ''}`
  return Object.entries(d)
    .map(([k, v]) => {
      if (v && typeof v === 'object' && 'antes' in v) {
        const c = v as { antes: unknown; despues: unknown }
        return `${k}: ${String(c.antes)} → ${String(c.despues)}`
      }
      return `${k}: ${String(v)}`
    })
    .join(' · ')
}

export function Bitacora() {
  const [pagina, setPagina] = useState(1)
  const [accion, setAccion] = useState('')
  const [lista, setLista] = useState<Lista | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    api.get<Lista>(`/bitacora${consulta({ pagina, accion })}`).then(
      (l) => vigente && setLista(l),
      (e) => vigente && setError(mensajeDeError(e)),
    )
    return () => {
      vigente = false
    }
  }, [pagina, accion])

  return (
    <section>
      <div className="encabezado-pagina">
        <h1 className="titulo-pagina">Bitácora</h1>
        <label className="campo en-linea">
          <span>Acción</span>
          <select
            value={accion}
            onChange={(e) => {
              setAccion(e.target.value)
              setPagina(1)
            }}
          >
            <option value="">Todas</option>
            {Object.entries(ACCIONES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="nota">Todo lo que se hace en esta página queda anotado aquí, con la fecha y la dirección IP. No se puede borrar.</p>
      {error && <Aviso tono="rojo">{error}</Aviso>}
      {!lista && !error && <Cargando />}
      {lista && (
        <>
          <div className="tabla-envoltura">
            <table className="tabla compacta">
              <thead>
                <tr>
                  <th>Cuándo</th>
                  <th>Quién</th>
                  <th>Qué</th>
                  <th>Sobre</th>
                  <th>Detalle</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {lista.registros.map((r) => (
                  <tr key={r.id}>
                    <td className="sin-salto">{fechaHora(r.creada_en)}</td>
                    <td>{r.nombre ?? <span className="sin-dato">Desconocido</span>}</td>
                    <td>{ALERTA.has(r.accion) ? <Chip tono="rojo">{ACCIONES[r.accion]}</Chip> : ACCIONES[r.accion] ?? r.accion}</td>
                    <td className="mono">{r.objetivo ?? ''}</td>
                    <td>{detalle(r)}</td>
                    <td className="mono">{r.ip ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion pagina={pagina} total={lista.total} porPagina={lista.por_pagina} alCambiar={setPagina} />
        </>
      )}
    </section>
  )
}

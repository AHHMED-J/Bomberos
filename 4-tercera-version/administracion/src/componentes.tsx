// Piezas que se repiten en varias pantallas.

import { useEffect, useRef, type ReactNode } from 'react'

import type { Tono } from './textos'

export function Escudo({ tamano = 120 }: { tamano?: number }) {
  return (
    <svg className="escudo" width={tamano} height={tamano} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="27" fill="var(--blanco)" stroke="var(--rojo)" strokeWidth="5" />
      <path
        fill="var(--rojo)"
        d="M33 13c1 7-3 10-6 14-3 4-5 7-5 12a10 10 0 0 0 20 0c0-5-2-8-4-10 0 3-1 5-3 6 1-6-1-15-2-22z"
      />
    </svg>
  )
}

export function Icono({ nombre }: { nombre: 'huella' | 'salir' | 'descargar' | 'sello' | 'imprimir' | 'mas' | 'atras' }) {
  const trazos: Record<typeof nombre, ReactNode> = {
    huella: (
      <path d="M12 11c0 3.5-.5 6.5-2 9m4.5-8c0 3-.3 5.5-1 7.5M7 18c.8-1.8 1.2-4 1.2-7a3.8 3.8 0 0 1 7.6 0c0 1 0 2-.1 3M5 14c.3-1 .4-2 .4-3a6.6 6.6 0 0 1 11.6-4.3M19 9.5c.3 1.4.3 3.3 0 5.5" />
    ),
    salir: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11" />,
    descargar: <path d="M12 4v11m-4-4 4 4 4-4M5 20h14" />,
    sello: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2 2 4-4" />,
    imprimir: <path d="M7 9V4h10v5M7 17H5v-6h14v6h-2M8 14h8v6H8z" />,
    mas: <path d="M12 5v14M5 12h14" />,
    atras: <path d="M15 5l-7 7 7 7" />,
  }
  return (
    <svg className="icono" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {trazos[nombre]}
    </svg>
  )
}

export function Chip({ tono, children }: { tono: Tono; children: ReactNode }) {
  return <span className={`chip chip-${tono}`}>{children}</span>
}

export function Aviso({ tono, children }: { tono: Tono; children: ReactNode }) {
  return (
    <div className={`aviso aviso-${tono}`} role={tono === 'rojo' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <p className="cargando" role="status">
      <span className="girando" aria-hidden="true" /> {texto}
    </p>
  )
}

// Ventana sobre la página con el <dialog> del navegador: atrapa el foco y se
// cierra con Esc.
export function Dialogo({
  abierto,
  titulo,
  alCerrar,
  children,
}: {
  abierto: boolean
  titulo: string
  alCerrar: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  // Si lo cierra la página (porque sigue otro diálogo), no es «cancelar».
  const cerradoPorLaPagina = useRef(false)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) {
      cerradoPorLaPagina.current = true
      d.close()
    }
  }, [abierto])
  const alCerrarDialogo = () => {
    if (cerradoPorLaPagina.current) cerradoPorLaPagina.current = false
    else alCerrar()
  }
  return (
    <dialog ref={ref} className="dialogo" onClose={alCerrarDialogo} aria-label={titulo}>
      {abierto && (
        <>
          <h2 className="titulo-seccion">{titulo}</h2>
          {children}
        </>
      )}
    </dialog>
  )
}

export function Paginacion({
  pagina,
  total,
  porPagina,
  alCambiar,
}: {
  pagina: number
  total: number
  porPagina: number
  alCambiar: (p: number) => void
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  if (paginas === 1) return null
  return (
    <nav className="paginacion" aria-label="Páginas">
      <button className="boton-contorno chico" disabled={pagina <= 1} onClick={() => alCambiar(pagina - 1)}>
        Anterior
      </button>
      <span>
        Página {pagina} de {paginas}
      </span>
      <button className="boton-contorno chico" disabled={pagina >= paginas} onClick={() => alCambiar(pagina + 1)}>
        Siguiente
      </button>
    </nav>
  )
}

// La firma en trazo como la guarda la app: «x,y x,y|x,y …» (un trazo por «|»).
export function Trazo({ trazo, etiqueta }: { trazo: string | null | undefined; etiqueta: string }) {
  if (!trazo) return <div className="trazo vacio">Sin firma</div>
  const trazos = trazo
    .split('|')
    .map((t) =>
      t
        .trim()
        .split(/\s+/)
        .map((p) => p.split(',').map(Number))
        .filter((p) => p.length === 2 && p.every(Number.isFinite)),
    )
    .filter((t) => t.length > 0)
  const xs = trazos.flat().map((p) => p[0])
  const ys = trazos.flat().map((p) => p[1])
  if (!xs.length) return <div className="trazo vacio">Sin firma</div>
  const margen = 6
  const minX = Math.min(...xs) - margen
  const minY = Math.min(...ys) - margen
  const ancho = Math.max(...xs) - minX + margen
  const alto = Math.max(...ys) - minY + margen
  return (
    <svg className="trazo" viewBox={`${minX} ${minY} ${ancho} ${alto}`} role="img" aria-label={etiqueta}>
      {trazos.map((t, i) =>
        t.length === 1 ? (
          <circle key={i} cx={t[0][0]} cy={t[0][1]} r="1.5" fill="var(--tinta)" />
        ) : (
          <polyline
            key={i}
            points={t.map((p) => p.join(',')).join(' ')}
            fill="none"
            stroke="var(--tinta)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ),
      )}
    </svg>
  )
}

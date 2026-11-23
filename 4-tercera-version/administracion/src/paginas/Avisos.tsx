// Avisos: qué pasó con los partes (validados) y con la propia cuenta.

import { Link } from 'react-router'

import { Chip } from '../componentes'
import { fechaHora } from '../textos'
import { useAvisos } from '../usarAvisos'

export function Avisos() {
  const { lista, sinLeer, marcar, marcarTodos } = useAvisos()
  return (
    <section>
      <div className="encabezado-pagina">
        <h1 className="titulo-pagina">Avisos</h1>
        {sinLeer > 0 && (
          <button className="boton-contorno chico" onClick={() => void marcarTodos()}>
            Marcar todos como leídos
          </button>
        )}
      </div>
      {lista.length === 0 ? (
        <div className="tarjeta vacia">Todavía no hay avisos. Aquí aparecen los partes que se validan.</div>
      ) : (
        <ul className="avisos">
          {lista.map((n) => (
            <li key={n.id} className={n.leida ? 'aviso-fila' : 'aviso-fila sin-leer'}>
              <div>
                <strong>{n.titulo}</strong> {!n.leida && <Chip tono="rojo">Nuevo</Chip>}
                <p>{n.texto}</p>
                <small>
                  {fechaHora(n.creada_en)}
                  {n.folio && (
                    <>
                      {' · '}
                      <Link to={`/partes/${n.folio}`} onClick={() => void marcar(n.id)} className="folio">
                        {n.folio}
                      </Link>
                    </>
                  )}
                </small>
              </div>
              {!n.leida && (
                <button className="boton-texto" onClick={() => void marcar(n.id)}>
                  Marcar leído
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

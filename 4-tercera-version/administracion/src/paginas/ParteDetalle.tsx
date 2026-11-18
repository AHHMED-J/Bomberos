// El detalle de un parte, en sólo lectura, y «Verificar sello» (RF-14):
// el servidor vuelve a sacar el SHA-256 de todo el parte y lo compara con el
// que se guardó cuando el revisor lo validó.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { api, type EvidenciaFirma, type Parte } from '../api'
import { Aviso, Cargando, Chip, Icono, Trazo } from '../componentes'
import { ESTADOS, fechaHora, mensajeDeError, SECCIONES, TONO_ESTADO } from '../textos'

interface Respuesta {
  parte: Parte
  firmas: EvidenciaFirma[]
}
interface Sello {
  sello: string
  calculado: string
  coincide: boolean
}

export function ParteDetalle() {
  const { folio = '' } = useParams()
  const [datos, setDatos] = useState<Respuesta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sello, setSello] = useState<Sello | null>(null)
  const [errorSello, setErrorSello] = useState<string | null>(null)
  const [verificando, setVerificando] = useState(false)

  useEffect(() => {
    api.get<Respuesta>(`/partes/${encodeURIComponent(folio)}`).then(setDatos, (e) => setError(mensajeDeError(e)))
  }, [folio])

  async function verificar() {
    setVerificando(true)
    setErrorSello(null)
    try {
      setSello(await api.get<Sello>(`/partes/${encodeURIComponent(folio)}/sello`))
    } catch (e) {
      setErrorSello(mensajeDeError(e))
    } finally {
      setVerificando(false)
    }
  }

  if (error) return <Aviso tono="rojo">{error}</Aviso>
  if (!datos) return <Cargando />
  const { parte, firmas } = datos
  const f = parte.firmas ?? {}
  const v = (id: string) => parte.campos?.[id]?.valor?.trim() || ''

  return (
    <article className="detalle">
      <Link to="/partes" className="volver no-imprimir">
        <Icono nombre="atras" /> Partes
      </Link>
      <div className="encabezado-pagina">
        <div>
          <h1 className="titulo-pagina">{parte.folio}</h1>
          <p className="nota">
            {v('tipo_servicio') || 'Sin tipo'} · {v('fecha') || 'sin fecha'} · {parte.division}
          </p>
        </div>
        <div className="acciones no-imprimir">
          <Chip tono={TONO_ESTADO[parte.estado]}>{ESTADOS[parte.estado]}</Chip>
          <button className="boton-contorno chico" onClick={() => window.print()}>
            <Icono nombre="imprimir" /> Imprimir
          </button>
        </div>
      </div>

      <section className="tarjeta sello">
        <h2 className="titulo-seccion">Sello</h2>
        {parte.sello ? (
          <>
            <p className="hash" title="SHA-256 guardado al validar">
              {parte.sello}
            </p>
            <p className="nota">Validado el {fechaHora(parte.validado_en)}.</p>
            <button className="boton chico no-imprimir" onClick={verificar} disabled={verificando}>
              <Icono nombre="sello" /> {verificando ? 'Verificando…' : 'Verificar sello'}
            </button>
            {sello?.coincide === true && (
              <Aviso tono="verde">
                <strong>El sello coincide.</strong> Nadie ha cambiado este parte desde que se validó.
              </Aviso>
            )}
            {sello?.coincide === false && (
              <Aviso tono="rojo">
                <strong>El sello NO coincide.</strong> Algo del parte cambió después de validarse (datos, fotos, croquis
                o firmas). Sello calculado ahora: <span className="hash">{sello.calculado}</span>
              </Aviso>
            )}
            {errorSello && <Aviso tono="rojo">{errorSello}</Aviso>}
          </>
        ) : (
          <p className="nota">Todavía no tiene sello: se sella cuando el revisor lo valida.</p>
        )}
      </section>

      {parte.nota && (
        <Aviso tono="ambar">
          <strong>Devuelto por {parte.nota.revisor}</strong> ({fechaHora(parte.nota.fecha)}) · {parte.nota.seccion}:{' '}
          {parte.nota.texto}
        </Aviso>
      )}

      {SECCIONES.map((s) => (
        <section key={s.titulo} className="tarjeta">
          <h2 className="titulo-seccion">{s.titulo}</h2>
          <dl className="datos">
            {s.campos.map(([id, etiqueta]) => (
              <div key={id} className={id === 'descripcion' ? 'ancho' : undefined}>
                <dt>{etiqueta}</dt>
                <dd>{v(id) || <span className="sin-dato">Sin dato</span>}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <section className="tarjeta">
        <h2 className="titulo-seccion">Fotos y croquis</h2>
        <p>
          {parte.fotos ?? 0} {parte.fotos === 1 ? 'foto' : 'fotos'} · croquis {parte.croquis_png ? 'capturado' : 'sin capturar'}.
        </p>
        <p className="nota">Las imágenes todavía se quedan en el celular de quien elaboró el parte; la app aún no las sube.</p>
      </section>

      <section className="tarjeta">
        <h2 className="titulo-seccion">Firmas</h2>
        <div className="firmas">
          <figure>
            <Trazo trazo={f.elaboro_trazo} etiqueta="Firma de quien elaboró" />
            <figcaption>
              <strong>Elaboró</strong>
              {parte.elaboro_nombre || parte.elaboro_id}
            </figcaption>
          </figure>
          <figure>
            <Trazo trazo={f.revisor_trazo} etiqueta="Firma del revisor" />
            <figcaption>
              <strong>Revisó</strong>
              {f.revisor_nombre || 'Sin revisar'}
            </figcaption>
          </figure>
          {f.propietario_nombre || f.propietario_trazo ? (
            <figure>
              <Trazo trazo={f.propietario_trazo} etiqueta="Firma del propietario" />
              <figcaption>
                <strong>Propietario</strong>
                {f.propietario_nombre || '—'}
              </figcaption>
            </figure>
          ) : null}
          {f.testigo_nombre || f.testigo_trazo ? (
            <figure>
              <Trazo trazo={f.testigo_trazo} etiqueta="Firma del testigo" />
              <figcaption>
                <strong>Testigo</strong>
                {f.testigo_nombre || '—'}
              </figcaption>
            </figure>
          ) : null}
        </div>
        <p className="nota">
          ¿Requiere peritaje?{' '}
          {f.requiere_peritaje === true ? 'Sí' : f.requiere_peritaje === false ? 'No' : 'Sin responder'}
        </p>

        <h3 className="subtitulo">Cómo se confirmó cada firma</h3>
        {firmas.length === 0 ? (
          <p className="nota">No hay firmas registradas en el servidor para este parte.</p>
        ) : (
          <table className="tabla compacta">
            <thead>
              <tr>
                <th>Quién</th>
                <th>Como</th>
                <th>Confirmó con</th>
                <th>Cuándo</th>
              </tr>
            </thead>
            <tbody>
              {firmas.map((x, i) => (
                <tr key={i}>
                  <td>
                    {x.nombre ?? '—'} <small>{x.matricula}</small>
                  </td>
                  <td>{x.rol === 'autor' ? 'Autor' : 'Revisor'}</td>
                  <td>
                    {x.metodo === 'biometria' ? 'Biometría del celular' : 'Contraseña'}
                    {x.simulada && (
                      <>
                        {' '}
                        <Chip tono="ambar">simulada (prueba)</Chip>
                      </>
                    )}
                  </td>
                  <td>{fechaHora(x.firmada_en)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="nota">
        Creado {fechaHora(parte.creado_en)} · enviado {fechaHora(parte.enviado_en)} · capturado con{' '}
        {parte.modo === 'dictado' ? 'dictado' : 'teclado'}
      </p>
    </article>
  )
}

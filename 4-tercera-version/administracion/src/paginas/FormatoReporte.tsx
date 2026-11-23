// El «Reporte de salida de incidente» de la Dirección de Bomberos, con la misma
// distribución que el formato en papel. Se llena con los datos del parte; lo que
// el formato pide y la app todavía no captura (despacho, domicilio, aseguradora,
// no. de empleado) queda en blanco para escribirse a mano.

import { Trazo } from '../componentes'
import type { Parte } from '../api'

const FILAS_PERSONAL = 5
const FILAS_APOYO = 6

// «Uno; Dos» o uno por renglón → ['Uno', 'Dos']
function lista(texto: string): string[] {
  return texto
    .split(/;|\n/)
    .map((x) => x.trim())
    .filter(Boolean)
}

// «Pipa 07 - Cap. Pérez» → ['Pipa 07', 'Cap. Pérez']; sin separador, sólo la unidad.
function unidadYCargo(texto: string): [string, string] {
  const m = texto.match(/^(.*?)\s+[-–:]\s+(.+)$/)
  return m ? [m[1], m[2]] : [texto, '']
}

function relleno<T>(items: T[], minimo: number, vacio: T): T[] {
  return [...items, ...Array.from({ length: Math.max(0, minimo - items.length) }, () => vacio)]
}

export function FormatoReporte({ parte, urlImagen }: { parte: Parte; urlImagen: (sha: string) => string }) {
  const v = (id: string) => parte.campos?.[id]?.valor?.trim() || ''
  const f = parte.firmas ?? {}
  const zona = v('zona').toLowerCase()
  const personal = lista(v('personal_turno'))
  const voluntarios = lista(v('voluntarios'))
  const unidades = lista(v('unidades_apoyo')).map(unidadYCargo)
  const instituciones = lista(v('instituciones_apoyo')).map(unidadYCargo)
  const croquis = parte.adjuntos?.find((a) => a.tipo === 'croquis')
  const fotos = (parte.adjuntos ?? []).filter((a) => a.tipo === 'foto')
  const filasApoyo = Math.max(FILAS_APOYO, unidades.length, instituciones.length)

  return (
    <div className="formato">
      <div className="formato-hoja">
        <header className="formato-cabecera">
          <img
            src={`${import.meta.env.BASE_URL}encabezado-direccion.png`}
            alt="Gobierno de Ensenada · Dirección de Bomberos"
          />
          <div className="formato-titulo">
            <h1>REPORTE DE SALIDA DE INCIDENTE</h1>
            <p>
              NO. INCIDENTE DE C-5 <span className="linea">{v('no_incidente_c5')}</span>
            </p>
          </div>
        </header>

        <table className="formato-tabla">
          <tbody>
            <tr className="rotulos">
              <th>FECHA</th>
              <th>HORA DE SALIDA</th>
              <th>HORA DE REGRESO</th>
            </tr>
            <tr className="dato">
              <td>{v('fecha')}</td>
              <td>{v('hora_salida')}</td>
              <td>{v('hora_regreso')}</td>
            </tr>
            <tr className="rotulos">
              <th>UNIDAD</th>
              <th>TURNO</th>
              <th>ESTACIÓN</th>
            </tr>
            <tr className="dato">
              <td>{v('unidad')}</td>
              <td>{v('turno')}</td>
              <td>{v('estacion')}</td>
            </tr>
            <tr className="rotulos">
              <th>TIPO DE SERVICIO</th>
              <th>ZONA</th>
              <th>DESPACHO</th>
            </tr>
            <tr className="dato">
              <td>{v('tipo_servicio')}</td>
              <td className="zonas">
                <div>
                  <span>
                    <b>RURAL</b>
                    <i>{zona === 'rural' ? 'X' : ''}</i>
                  </span>
                  <span>
                    <b>URBANA</b>
                    <i>{zona === 'urbana' ? 'X' : ''}</i>
                  </span>
                </div>
              </td>
              <td />
            </tr>
          </tbody>
        </table>

        <Bloque titulo="LUGAR DEL SERVICIO" texto={v('lugar_servicio')} />
        <div className="formato-fila">
          <div className="formato-celda ancha">
            <h2>NOMBRE DEL PROPIETARIO / NOMBRE DEL ARRENDATARIO</h2>
            <p>{v('propietario')}</p>
          </div>
          <div className="formato-celda">
            <h2>TELEFONO DE CONTACTO</h2>
            <p>{v('telefono_propietario')}</p>
          </div>
        </div>
        <Bloque titulo="DOMICILIO PARTICULAR" texto="" />
        <Bloque titulo="COMPAÑIA ASEGURADORA" texto="" />

        <section className="formato-descripcion">
          <h2>DESCRIPCION DEL INCIDENTE</h2>
          <div className="renglones">{v('descripcion')}</div>
        </section>

        <div className="formato-personal">
          <div className="encabezado">
            <h2>PERSONAL DE TURNO / NOMBRE COMPLETO</h2>
            <h2>No. DE EMPLEADO</h2>
          </div>
          {relleno(personal, FILAS_PERSONAL, '').map((n, i) => (
            <div className="renglon" key={i}>
              <span>{n}</span>
              <span />
            </div>
          ))}
        </div>

        <div className="formato-voluntarios">
          <h2>VOLUNTARIOS</h2>
          {relleno(voluntarios, 2, '').map((n, i) => (
            <div className="renglon" key={i}>
              {n}
            </div>
          ))}
        </div>

        <div className="formato-apoyo">
          <ApoyoColumna titulo="UNIDADES DE BOMBEROS EN APOYO" filas={unidades} total={filasApoyo} />
          <ApoyoColumna titulo="INSTITUCIONES DE APOYO" filas={instituciones} total={filasApoyo} />
        </div>

        <div className="formato-firmas">
          <div>
            <div className="espacio">
              <Trazo trazo={f.elaboro_trazo} etiqueta="Firma del encargado en turno" />
            </div>
            <h2>FIRMA DEL ENCARGADO EN TURNO / QUIEN FORMULO</h2>
            <p>{parte.elaboro_nombre || parte.elaboro_id}</p>
          </div>
          <div>
            <div className="espacio">
              <Trazo trazo={f.revisor_trazo} etiqueta="Firma de quien recibe el parte" />
            </div>
            <h2>NOMBRE DE QUIEN RECIBE PARTE</h2>
            <p>{f.revisor_nombre || ''}</p>
          </div>
        </div>

        <footer className="formato-pie">
          <span>{parte.folio}</span>
          <span>Anexo de continuación de narración de hechos página ______ de ______</span>
        </footer>
      </div>

      {(croquis || fotos.length > 0) && (
        <div className="formato-hoja formato-anexo">
          <h2 className="anexo-titulo">ANEXO · {parte.folio}</h2>
          {croquis && (
            <figure>
              <img src={urlImagen(croquis.sha256)} alt="Croquis del servicio" />
              <figcaption>Croquis</figcaption>
            </figure>
          )}
          <div className="anexo-fotos">
            {fotos.map((a, i) => (
              <figure key={a.sha256}>
                <img src={urlImagen(a.sha256)} alt={`Foto ${i + 1}`} />
                <figcaption>Foto {i + 1}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Bloque({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="formato-bloque">
      <h2>{titulo}</h2>
      <p>{texto}</p>
    </div>
  )
}

function ApoyoColumna({ titulo, filas, total }: { titulo: string; filas: [string, string][]; total: number }) {
  return (
    <div className="apoyo-columna">
      <h2>{titulo}</h2>
      <div className="apoyo-encabezado">
        <b>NO. UNIDAD</b>
        <b>A CARGO DE</b>
      </div>
      {relleno(filas, total, ['', '']).map(([u, c], i) => (
        <div className="apoyo-fila" key={i}>
          <span>{u}</span>
          <span>{c}</span>
        </div>
      ))}
    </div>
  )
}

#!/usr/bin/env python3
"""Arma las hojas de láminas a partir de las pantallas sueltas.

    python3 build.py

Escribe tres archivos, todos generados: no se editan a mano.

  docs/pantallas.html               edición de trabajo: incluye los RF
  docs/pantallas-bomberos.html      edición para bomberos: sin RF
  dist/pantallas-parte-digital.html un solo archivo con el css incrustado

Cada lámina aparece dos veces, en computadora y en celular. La de celular
no es un archivo aparte: es el mismo marcado con la clase .screen--mobile.
La fuente son docs/screens/, docs/css/ y manifest.json.
"""

import html
import json
import re
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
SITIO = RAIZ / "docs"

SALIDA_TRABAJO = SITIO / "pantallas.html"
SALIDA_BOMBEROS = SITIO / "pantallas-bomberos.html"
SALIDA_SUELTA = RAIZ / "dist" / "pantallas-parte-digital.html"

# El orden importa: tokens define las variables que usan las demás.
HOJAS = ["tokens.css", "base.css", "components.css", "app.css", "mobile.css",
         "sheet.css", "site.css"]

FUENTES = (
    "https://fonts.googleapis.com/css2"
    "?family=Barlow:wght@400;500;600"
    "&family=Barlow+Condensed:wght@600;700"
    "&family=Courier+Prime:wght@400;700&display=swap"
)

ESCUDO = (
    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 66 74'>"
    "<path d='M33 3 62 13v26c0 19-12 29-29 33C16 68 4 58 4 39V13L33 3Z' "
    "fill='none' stroke='%23a8362b' stroke-width='7'/></svg>"
)

CUERPO = re.compile(r'<body class="preview">(.*)</body>', re.S)
RAIZ_PANTALLA = re.compile(r'<div class="screen" id="([\w-]+)">')


def esc(texto: str) -> str:
    return html.escape(texto, quote=False)


def ancla(figura: str) -> str:
    """'8.3b' -> 'fig-8-3b', para enlazar una lámina desde la portada."""
    plano = unicodedata.normalize("NFKD", figura).encode("ascii", "ignore").decode()
    return "fig-" + re.sub(r"[^a-z0-9]+", "-", plano.lower()).strip("-")


def cuerpo_de(archivo: Path) -> str:
    """Devuelve el .screen de una pantalla, sin su documento envolvente."""
    encontrado = CUERPO.search(archivo.read_text(encoding="utf-8"))
    if not encontrado:
        raise SystemExit(f'{archivo.name}: falta <body class="preview"> … </body>')
    return encontrado.group(1).strip()


def a_movil(cuerpo: str) -> str:
    """La misma pantalla, marcada para que el css la reacomode a 390 px."""
    apertura = RAIZ_PANTALLA.search(cuerpo)
    if not apertura:
        raise SystemExit('no se encontró el <div class="screen" id="…"> de la pantalla')
    nueva = f'<div class="screen screen--mobile" id="{apertura.group(1)}-movil">'
    return cuerpo.replace(apertura.group(0), nueva, 1)


def parrafos(textos, clase: str) -> str:
    """Bloque de prosa que acompaña a una lámina, arriba o abajo de ella."""
    if not textos:
        return ""
    cuerpo = "\n".join(f"          <p>{esc(t)}</p>" for t in textos)
    return f'\n        <div class="{clase}">\n{cuerpo}\n        </div>'


def fila_meta(clave: str, valor) -> str:
    """Un dato de la cabecera; si trae varios valores, van en lista punteada."""
    if isinstance(valor, list):
        puntos = "".join(f"<li>{esc(v)}</li>" for v in valor)
        valor = f'<ul class="meta-list">{puntos}</ul>'
    else:
        valor = esc(valor)
    return f"      <div><dt>{esc(clave)}</dt><dd>{valor}</dd></div>"


def figura(pantalla: dict, tecnica: bool) -> str:
    cuerpo = cuerpo_de(SITIO / "screens" / pantalla["archivo"])
    rol = pantalla.get("rol")
    etiqueta = f'\n            <span class="figure__rol">{esc(rol)}</span>' if rol else ""
    cobertura = (f'\n            <span class="figure__cov">{esc(pantalla["cubre"])}</span>'
                 if tecnica else "")
    return f"""      <figure class="figure" id="{ancla(pantalla['figura'])}">
        <figcaption class="figure__caption">
          <p class="figure__line">
            <span class="figure__n">Figura {esc(pantalla['figura'])}</span>{cobertura}{etiqueta}
          </p>
          <h3>{esc(pantalla['nombre'])}</h3>
          <p class="figure__uses">{esc(pantalla['casos'])}</p>
        </figcaption>{parrafos(pantalla.get("intro"), "figure__prosa")}
        <div class="stages">
          <div class="stage-wrap">
            <p class="stage__label">En computadora · al 75 %</p>
            <div class="stage stage--desktop">
{cuerpo}
            </div>
          </div>
          <div class="stage-wrap">
            <p class="stage__label">En celular</p>
            <div class="stage">
{a_movil(cuerpo)}
            </div>
          </div>
        </div>{parrafos(pantalla.get("nota"), "figure__prosa figure__prosa--pie")}
      </figure>"""


def seccion(datos: dict, tecnica: bool) -> str:
    rfs = ""
    if tecnica:
        fichas = "".join(f'<span class="rf">{esc(rf)}</span>' for rf in datos["rf"])
        rfs = f'\n      <div class="act__rfs">{fichas}</div>'
    figuras = "\n".join(figura(p, tecnica) for p in datos["pantallas"])
    return f"""  <section class="act">
    <div class="act__head">
      <p class="act__kicker">{esc(datos['kicker'])}</p>
      <h2>{esc(datos['titulo'])}</h2>
      <p class="act__lead">{esc(datos['lead'])}</p>{rfs}
    </div>
    <div class="figures">
{figuras}
    </div>
  </section>"""


def selector(tecnica: bool) -> str:
    def opcion(activa: bool, destino: str, texto: str) -> str:
        marca = ' aria-current="page"' if activa else ""
        return f'<a class="switch__opt"{marca} href="{destino}">{texto}</a>'

    return f"""  <div class="switch">
    <div class="switch__opts">
      {opcion(not tecnica, "pantallas-bomberos.html", "Para bomberos")}
      {opcion(tecnica, "pantallas.html", "De trabajo")}
    </div>
    <p class="switch__hint">Las dos ediciones muestran las mismas pantallas. La de trabajo agrega los requerimientos funcionales que cada una cubre.</p>
  </div>"""


def hoja(datos: dict, tecnica: bool, con_selector: bool) -> str:
    """El contenido de la hoja, igual en las tres versiones salvo los RF."""
    cab = datos["cabecera"]
    meta = [(k, v) for k, v in cab["meta"] if tecnica or k != "Cobertura"]
    eyebrow = cab["eyebrow"] if tecnica else "Así se vería la aplicación, en la computadora y en el celular"
    dek = f'\n    <p class="masthead__dek">{esc(cab["dek"])}</p>' if cab.get("dek") else ""
    secciones = "\n\n".join(seccion(s, tecnica) for s in datos["secciones"])

    pie = ""
    if datos.get("notas"):
        notas = "\n".join(
            f"    <p><strong>{esc(t)}</strong> {esc(c)}</p>" for t, c in datos["notas"]
        )
        pie = f'\n  <footer class="sheet-foot">\n{notas}\n  </footer>\n'

    return f"""<div class="sheet">

  <header class="masthead">
    <p class="masthead__eyebrow">{esc(eyebrow)}</p>
    <h1>{esc(cab['titulo'])}</h1>{dek}
    <dl class="masthead__meta">
{chr(10).join(fila_meta(k, v) for k, v in meta)}
    </dl>
  </header>

{selector(tecnica) if con_selector else ""}

{secciones}
{pie}
</div>"""


NAV = """<nav class="sitenav">
  <a class="sitenav__brand" href="index.html">
    <svg class="sitenav__mark" viewBox="0 0 66 74" aria-hidden="true">
      <path d="M33 3 62 13v26c0 19-12 29-29 33C16 68 4 58 4 39V13L33 3Z"/>
      <path d="M33 26c6 6 9 10 9 14a9 9 0 0 1-18 0c0-4 3-8 9-14Z"/>
    </svg>
    <span class="sitenav__name">Parte Digital</span>
  </a>
  <div class="sitenav__links">
    <a class="sitenav__link" href="index.html">Proyecto</a>
    <a class="sitenav__link" aria-current="page" href="pantallas.html">Pantallas</a>
    <a class="sitenav__link" href="avance-proyecto-1.docx">Documento</a>
    <a class="sitenav__link" href="https://github.com/AHHMED-J/Bomberos">Repositorio</a>
  </div>
</nav>"""


def pagina_sitio(datos: dict, tecnica: bool) -> str:
    enlaces = "\n".join(f'<link rel="stylesheet" href="css/{h}">' for h in HOJAS)
    titulo = ("Pantallas · Parte digital de los Bomberos de Ensenada" if tecnica
              else "Cómo se ve la aplicación · Parte digital de los Bomberos de Ensenada")
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(titulo)}</title>
<meta name="description" content="Las pantallas del sistema de parte digital, en computadora y en celular.">
<link rel="icon" href="{ESCUDO}">
<link rel="stylesheet" href="{FUENTES}">
{enlaces}
</head>
<body>

{NAV}

{hoja(datos, tecnica, con_selector=True)}

</body>
</html>
"""


def pagina_suelta(datos: dict) -> str:
    """Una sola pieza: sin enlaces relativos ni navegación que no exista."""
    estilos = "\n\n".join((SITIO / "css" / h).read_text(encoding="utf-8") for h in HOJAS)
    return f"""<title>{esc(datos['titulo'])}</title>
<link rel="stylesheet" href="{FUENTES}">
<style>
{estilos}
</style>

{hoja(datos, tecnica=True, con_selector=False)}
"""


def main() -> None:
    datos = json.loads((RAIZ / "manifest.json").read_text(encoding="utf-8"))
    salidas = (
        (SALIDA_TRABAJO, pagina_sitio(datos, tecnica=True)),
        (SALIDA_BOMBEROS, pagina_sitio(datos, tecnica=False)),
        (SALIDA_SUELTA, pagina_suelta(datos)),
    )
    for destino, contenido in salidas:
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text(contenido, encoding="utf-8")
        print(f"{destino.relative_to(RAIZ)}: {len(contenido):,} caracteres")


if __name__ == "__main__":
    main()

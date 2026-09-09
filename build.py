#!/usr/bin/env python3
"""Arma la hoja de láminas a partir de las pantallas sueltas.

    python3 build.py

Escribe dos versiones de la misma hoja:

  docs/pantallas.html               para el sitio; enlaza las hojas de css/
  dist/pantallas-parte-digital.html un solo archivo con el css incrustado,
                                    para compartir, imprimir o publicar suelto

Ambas se generan: no se editan a mano. La fuente son docs/screens/,
docs/css/ y manifest.json.
"""

import html
import json
import re
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
SITIO = RAIZ / "docs"
SALIDA_SITIO = SITIO / "pantallas.html"
SALIDA_SUELTA = RAIZ / "dist" / "pantallas-parte-digital.html"

# El orden importa: tokens define las variables que usan las demás.
HOJAS = ["tokens.css", "base.css", "components.css", "app.css", "sheet.css", "site.css"]

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


def figura(pantalla: dict) -> str:
    cuerpo = cuerpo_de(SITIO / "screens" / pantalla["archivo"])
    rol = pantalla.get("rol")
    etiqueta = f'\n            <span class="figure__rol">{esc(rol)}</span>' if rol else ""
    return f"""      <figure class="figure" id="{ancla(pantalla['figura'])}">
        <figcaption class="figure__caption">
          <p class="figure__line">
            <span class="figure__n">Figura {esc(pantalla['figura'])}</span>
            <span class="figure__cov">{esc(pantalla['cubre'])}</span>{etiqueta}
          </p>
          <h3>{esc(pantalla['nombre'])}</h3>
          <p class="figure__uses">{esc(pantalla['casos'])}</p>
        </figcaption>{parrafos(pantalla.get("intro"), "figure__prosa")}
        <div class="stage">
{cuerpo}
        </div>{parrafos(pantalla.get("nota"), "figure__prosa figure__prosa--pie")}
      </figure>"""


def seccion(datos: dict) -> str:
    rfs = "".join(f'<span class="rf">{esc(rf)}</span>' for rf in datos["rf"])
    figuras = "\n".join(figura(p) for p in datos["pantallas"])
    return f"""  <section class="act">
    <div class="act__head">
      <p class="act__kicker">{esc(datos['kicker'])}</p>
      <h2>{esc(datos['titulo'])}</h2>
      <p class="act__lead">{esc(datos['lead'])}</p>
      <div class="act__rfs">{rfs}</div>
    </div>
    <div class="figures">
{figuras}
    </div>
  </section>"""


def hoja(datos: dict) -> str:
    """El contenido de la hoja, igual en las dos versiones."""
    cab = datos["cabecera"]
    meta = "\n".join(fila_meta(k, v) for k, v in cab["meta"])
    secciones = "\n\n".join(seccion(s) for s in datos["secciones"])
    dek = f'\n    <p class="masthead__dek">{esc(cab["dek"])}</p>' if cab.get("dek") else ""
    pie = ""
    if datos.get("notas"):
        notas = "\n".join(
            f"    <p><strong>{esc(t)}</strong> {esc(c)}</p>" for t, c in datos["notas"]
        )
        pie = f'\n  <footer class="sheet-foot">\n{notas}\n  </footer>\n'
    return f"""<div class="sheet">

  <header class="masthead">
    <p class="masthead__eyebrow">{esc(cab['eyebrow'])}</p>
    <h1>{esc(cab['titulo'])}</h1>{dek}
    <dl class="masthead__meta">
{meta}
    </dl>
  </header>

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


def pagina_sitio(datos: dict) -> str:
    enlaces = "\n".join(f'<link rel="stylesheet" href="css/{h}">' for h in HOJAS)
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pantallas · Parte digital de los Bomberos de Ensenada</title>
<meta name="description" content="Las diez pantallas de baja fidelidad del sistema de parte digital, una por caso de uso.">
<link rel="icon" href="{ESCUDO}">
<link rel="stylesheet" href="{FUENTES}">
{enlaces}
</head>
<body>

{NAV}

{hoja(datos)}

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

{hoja(datos)}
"""


def main() -> None:
    datos = json.loads((RAIZ / "manifest.json").read_text(encoding="utf-8"))
    for destino, contenido in (
        (SALIDA_SITIO, pagina_sitio(datos)),
        (SALIDA_SUELTA, pagina_suelta(datos)),
    ):
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text(contenido, encoding="utf-8")
        print(f"{destino.relative_to(RAIZ)}: {len(contenido):,} caracteres")


if __name__ == "__main__":
    main()

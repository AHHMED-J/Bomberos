#!/usr/bin/env python3
"""Arma el prototipo combinado a partir de las pantallas sueltas.

    python3 build.py

Escribe un archivo, generado: no se edita a mano.

  docs/prototipo.html   el clic-through completo: barra lateral + marco de
                         teléfono + las doce pantallas + el script que
                         cambia de una a otra por el hash de la URL.

La fuente son docs/screens/, docs/css/ y manifest.json — el mismo patrón
que build.py en primera-version/. Cada archivo de docs/screens/ se abre
también solo, sin pasar por este script, con la pantalla ya visible.
"""

import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
DOCS = RAIZ / "docs"
SALIDA = DOCS / "prototipo.html"

HOJAS = ["tokens.css", "base.css", "nav.css", "frame.css"]

FUENTES = (
    "https://fonts.googleapis.com/css2"
    "?family=Barlow+Condensed:wght@600;700"
    "&family=Barlow:wght@400;500;600&display=swap"
)

CUERPO = re.compile(r'<body class="preview">\s*(.*?)\s*</body>', re.S)


def cuerpo_de(archivo: Path) -> str:
    """La <section class="pantalla" ...> de una pantalla suelta, sin su
    documento envolvente ni la clase "visible" (aquí el script decide cuál
    se ve, no el archivo)."""
    encontrado = CUERPO.search(archivo.read_text(encoding="utf-8"))
    if not encontrado:
        raise SystemExit(f'{archivo.name}: falta <body class="preview"> … </body>')
    cuerpo = encontrado.group(1)
    cuerpo = cuerpo.replace('class="pantalla visible"', 'class="pantalla"')
    cuerpo = cuerpo.replace('../img/', 'img/')
    return cuerpo


def nav(datos: dict) -> str:
    grupos = []
    for grupo in datos["grupos"]:
        items = "".join(
            f'<li><a href="#{p["id"]}" data-p="{p["id"]}">{p["etiqueta"]}</a></li>'
            for p in grupo["pantallas"]
        )
        grupos.append(f'<div class="grupo"><h2>{grupo["titulo"]}</h2><ol>{items}</ol></div>')
    return f"""<nav class="panel" aria-label="Pantallas del prototipo">
<div><h1>Bomberos de Ensenada</h1><p>Prototipo de la app de reportes. Toca los botones dentro del teléfono o elige una pantalla.</p></div>
{"".join(grupos)}
</nav>"""


SCRIPT = """(function(){
 var ids=[].map.call(document.querySelectorAll('.pantalla'),function(s){return s.id});
 function mostrar(){
  var id=location.hash.slice(1); if(ids.indexOf(id)<0) id='Main';
  document.querySelectorAll('.pantalla').forEach(function(s){s.classList.toggle('visible',s.id===id)});
  document.querySelectorAll('.panel a[data-p]').forEach(function(a){
   var on=a.getAttribute('data-p')===id; a.classList.toggle('activa',on); if(on)a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');});
  document.getElementById('visor').scrollTop=0; window.scrollTo(0,0);
 }
 window.addEventListener('hashchange',mostrar); mostrar();
})();"""


def main() -> None:
    datos = json.loads((RAIZ / "manifest.json").read_text(encoding="utf-8"))
    enlaces = "\n".join(f'<link rel="stylesheet" href="css/{h}">' for h in HOJAS)

    pantallas = "\n".join(
        cuerpo_de(DOCS / "screens" / p["archivo"])
        for grupo in datos["grupos"]
        for p in grupo["pantallas"]
    )

    contenido = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{datos['titulo']}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="{FUENTES}" rel="stylesheet">
{enlaces}
</head>
<body>
<div class="app">
{nav(datos)}
<main class="escenario">
<div class="telefono"><div class="visor" id="visor">
{pantallas}
</div></div>
</main>
</div>
<script>
{SCRIPT}
</script>
</body>
</html>
"""
    SALIDA.write_text(contenido, encoding="utf-8")
    print(f"{SALIDA.relative_to(RAIZ)}: {len(contenido):,} caracteres")


if __name__ == "__main__":
    main()

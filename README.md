# Parte digital · Bomberos de Ensenada

Proyecto de "Ingeniería en Software y Tecnologías Emergentes" (UABC, FIAD)
para el H. Cuerpo de Bomberos de Ensenada. Las carpetas están numeradas en
el orden en que fueron saliendo:

- **[`1-primera-version/`](1-primera-version/)** — todo lo construido hasta
  ahora: los mockups, el prototipo funcional (Node/Express/MySQL), la
  investigación de usuarios y la suite de 6 interfaces de esa tarea. Es la
  versión que está publicada en
  **https://ahhmed-j.github.io/Bomberos/**. Ver su propio
  [README](1-primera-version/README.md) para el detalle completo.
- **[`2-segunda-version/`](2-segunda-version/)** — el rediseño en curso, a
  partir de las pantallas nuevas (login con contraseña, documentos por
  división, Papelería, Administrar elementos, vista por Dirección). Ver su
  propio [README](2-segunda-version/README.md) para qué falta y por dónde va.
- **[`3-ACTO 2/`](3-ACTO%202/)** — Acto II de la unidad de Prototipado (macro-proceso
  de St. Gallen): una carpeta por entregable. Van el
  [CFP](3-ACTO%202/1-CFP/README.md) (¿se puede capturar el parte en ≤ 60 s?),
  las ideas del Dark Horse y el
  [Funky Prototype](3-ACTO%202/3-Funky-Prototype/README.md) (parte multijugador).
- **[`3-actoNo3/`](3-actoNo3/)** — material del Acto III (el experimento
  científico y su ficha) y el paquete de entrega de los Actos II y III.
- **[`4-tercera-version/`](4-tercera-version/)** — la app de celulares (Flutter),
  su servidor con MySQL, la IA local y los requerimientos definitivos. Ver su
  [README](4-tercera-version/README.md) para la estructura y cómo correrlo.

## Cómo se publica el sitio

`1-primera-version/docs/` es lo único que se sirve en GitHub Pages. Como no
está en la raíz del repo, el despliegue usa un workflow de GitHub Actions
(`.github/workflows/pages.yml`) en vez de la opción simple de "Deploy from a
branch" — se dispara solo en cada `git push` a `main`.

## Equipo

Ahhmed Affif Jalife Burgueño (376285) · Elias Tamayo Salcedo (376290) ·
Verónica Acevedo Carrillo (380207) · Josselyn Alexa Rivera Chávez (379219) ·
Arturo Rafael Cornejo Escobar (365239)

Materia: Tecnologías Emergentes para el Desarrollo de Soluciones ·
Profesor: Antonio de Jesús García Chávez · UABC, FIAD.

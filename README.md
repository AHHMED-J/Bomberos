# Parte digital · Bomberos de Ensenada

Proyecto de "Ingeniería en Software y Tecnologías Emergentes" (UABC, FIAD)
para el H. Cuerpo de Bomberos de Ensenada. Las carpetas están numeradas en
el orden en que fueron saliendo:

- **[`1-primera-version/`](1-primera-version/)**: la primera versión.
  Mockups, prototipo funcional (Node/Express/MySQL), la investigación de
  usuarios (con el mapeo de 10 requisitos) y la suite de 6 interfaces. Sus
  requerimientos están en el Avance de Proyecto No. 1. Es la versión
  publicada en **https://ahhmed-j.github.io/Bomberos/**. Ver su
  [README](1-primera-version/README.md).
- **[`2-segunda-version/`](2-segunda-version/)**: el rediseño a partir de las
  pantallas nuevas (login con contraseña, documentos por división,
  Papelería, Administrar elementos, vista por Dirección). Tiene la bitácora
  de decisiones del 22 de octubre al 10 de noviembre,
  [`decisiones.md`](2-segunda-version/decisiones.md). Ver su
  [README](2-segunda-version/README.md).
- **[`3-actoNo2/`](3-actoNo2/)**: Acto II de la unidad de Prototipado
  (macro-proceso de St. Gallen), una carpeta por entregable: el
  [CFP](3-actoNo2/1-CFP/README.md) (¿se puede capturar el parte en ≤ 60 s?),
  las ideas del Dark Horse, el
  [Funky Prototype](3-actoNo2/3-Funky-Prototype/README.md) (parte
  multijugador), el Roadmap de 6 hitos y la reflexión.
- **[`3-actoNo3/`](3-actoNo3/)**: material del Acto III (el experimento
  científico y su ficha) y el paquete de entrega de los Actos II y III.
- **[`probandoFlutter/`](probandoFlutter/)**: prueba mínima de la llave en el
  chip seguro del iPhone con Face ID, antes de la tercera versión.
- **[`4-tercera-version/`](4-tercera-version/)**: la versión actual. La app
  de celulares (Flutter), su servidor con MySQL, la IA local y los
  requerimientos definitivos. Ver su [README](4-tercera-version/README.md).

Las carpetas anteriores no se editan. Cómo se conectan entre sí (qué pasó
con cada hito del roadmap, con cada requisito del mapeo y con cada
decisión) está en
[`4-tercera-version/docs/antecedentes.md`](4-tercera-version/docs/antecedentes.md).

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

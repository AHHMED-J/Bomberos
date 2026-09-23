# Parte digital · Bomberos de Ensenada

Proyecto de "Ingeniería en Software y Tecnologías Emergentes" (UABC, FIAD)
para el H. Cuerpo de Bomberos de Ensenada. Vive en dos carpetas, una por
versión del diseño:

- **[`primera-version/`](primera-version/)** — todo lo construido hasta
  ahora: los mockups, el prototipo funcional (Node/Express/MySQL), la
  investigación de usuarios y la suite de 6 interfaces de esa tarea. Es la
  versión que está publicada en
  **https://ahhmed-j.github.io/Bomberos/**. Ver su propio
  [README](primera-version/README.md) para el detalle completo.
- **[`segunda-version/`](segunda-version/)** — el rediseño en curso, a
  partir de las pantallas nuevas (login con contraseña, documentos por
  división, Papelería, Administrar elementos, vista por Dirección). Ver su
  propio [README](segunda-version/README.md) para qué falta y por dónde va.

## Cómo se publica el sitio

`primera-version/docs/` es lo único que se sirve en GitHub Pages. Como no
está en la raíz del repo, el despliegue usa un workflow de GitHub Actions
(`.github/workflows/pages.yml`) en vez de la opción simple de "Deploy from a
branch" — se dispara solo en cada `git push` a `main`.

## Equipo

Ahhmed Affif Jalife Burgueño (376285) · Elias Tamayo Salcedo (376290) ·
Verónica Acevedo Carrillo (380207) · Josselyn Alexa Rivera Chávez (379219) ·
Arturo Rafael Cornejo Escobar (365239)

Materia: Tecnologías Emergentes para el Desarrollo de Soluciones ·
Profesor: Antonio de Jesús García Chávez · UABC, FIAD.

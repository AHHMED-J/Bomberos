# Parte digital · Bomberos de Ensenada

Mockups de baja fidelidad de la aplicación **web** del sistema de parte digital
para el H. Cuerpo de Bomberos de Ensenada, derivados de los casos de uso en UML
del Avance de Proyecto no. 1. Son maquetas estáticas: sólo HTML y CSS, sin una
línea de JavaScript.

**Sitio:** https://ahhmed-j.github.io/Bomberos/

## Estructura

    docs/                   ← esto es el sitio que publica GitHub Pages
      index.html            portada: problema, actores, galería y trazabilidad
      pantallas.html        edición de trabajo: las láminas con sus RF (generada)
      pantallas-bomberos.html  la misma hoja sin requerimientos (generada)
      screens/              una pantalla por archivo; cada una abre sola
      css/
        tokens.css          variables: paleta del wireframe y paleta del sitio
        base.css            reset, tipografía de apoyo, iconos, utilidades
        components.css      tarjetas, campos, botones, chips, tablas, croquis…
        app.css             armazón de la app: barra superior, menú, paneles
        mobile.css          la misma pantalla adaptada a 390 px de celular
        sheet.css           la lámina y su pie de figura
        site.css            portada y navegación del sitio
      avance-proyecto-1.docx  copia del documento, para descargar desde el sitio
      .nojekyll             que GitHub sirva los archivos tal cual
    manifest.json           qué figura es cada pantalla, qué caso de uso y qué RF cubre
    build.py                genera pantallas.html
    dist/                   versión de un solo archivo (no se versiona)

## Cómo trabajar

- **Ver o ajustar una pantalla:** abre `docs/screens/<nombre>.html` en el
  navegador. Toma su estilo de `docs/css/`, así que un cambio en un componente
  se ve en todas.
- **Regenerar las hojas:** `python3 build.py`. Escribe `docs/pantallas.html`
  (con RF), `docs/pantallas-bomberos.html` (sin RF) y
  `dist/pantallas-parte-digital.html` (un solo archivo con el CSS incrustado).
  Cada lámina sale dos veces, en computadora y en celular: la de celular no es
  un archivo aparte, es el mismo marcado con la clase `.screen--mobile`.
- **Agregar una pantalla:** crea el archivo en `docs/screens/` copiando la
  estructura de otro (documento completo, con `<body class="preview">` y un
  `<div class="screen" id="…">`), regístrala en `manifest.json` y vuelve a
  correr el build. Para que salga también en la portada, agrega su tarjeta en
  `docs/index.html`.

## Publicar en GitHub Pages

1. `git push`
2. En GitHub: **Settings → Pages → Build and deployment**, en *Source* elige
   **Deploy from a branch** y en *Branch* pon **main** y la carpeta **/docs**.
3. En un par de minutos el sitio queda en
   https://ahhmed-j.github.io/Bomberos/

No hay build en el servidor: GitHub sirve los archivos tal cual. Si algo se ve
sin estilos, revisa que todas las rutas sean relativas (`css/…`, `screens/…`),
nunca absolutas (`/css/…`), porque el sitio vive en un subdirectorio.

## Convenciones

- Toda medida, color y tipografía sale de `docs/css/tokens.css`. En el HTML no
  hay atributos `style`.
- Cada icono es un `<svg class="icon" viewBox="0 0 24 24">` de trazo; hereda el
  color del texto que lo rodea.
- El estado actual se marca con `aria-current` (menú, pestañas, pasos,
  paginación), no con una clase de más.
- Las pantallas conservan su aspecto claro aunque el lector tenga el tema
  oscuro: son láminas, no interfaz viva. La portada y la hoja sí cambian.

## Correspondencia con el documento

| Figura | Pantalla | Casos de uso | Cubre |
|---|---|---|---|
| 8.1 | Acceso | Iniciar sesión | RF-01 |
| 8.2 | Formulario del parte | Crear un nuevo parte · Registrar la emergencia · Adjuntar evidencia | RF-02, RF-03, RF-06 |
| 8.3 | Croquis | Generar croquis con IA | RF-04, RF-05 |
| 8.3b | El croquis no se pudo generar | Generar croquis con IA (flujo alterno) | RF-04, RNF-01 |
| 8.4 | Resumen y firma | Firmar y enviar parte | RF-07 |
| 8.4b | Confirmación de envío | Firmar y enviar parte | RF-07 |
| 8.5 | Bandeja del jefe de turno | Revisar pendientes | RF-08 |
| 8.5b | Validar o devolver | Validar el parte · Devolver para corregir | RF-09 |
| 8.6 | Panel de la Dirección | Consultar partes · Filtrar y buscar · Exportar reporte | RF-10 |
| 8.6b | Detalle del parte | Ver detalle del parte | RF-10 |

## Equipo

Ahhmed Affif Jalife Burgueño (376285) · Elias Tamayo Salcedo (376290) ·
Verónica Acevedo Carrillo (380207) · Josselyn Alexa Rivera Chávez (379219) ·
Arturo Rafael Cornejo Escobar (365239)

Materia: Tecnologías Emergentes para el Desarrollo de Soluciones ·
Profesor: Antonio de Jesús García Chávez · UABC, FIAD.

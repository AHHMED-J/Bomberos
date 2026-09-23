# Suite de investigación de usuarios · Bomberos de Ensenada

Entregable de la tarea **"Instrumentos digitales para la investigación de
usuarios"** (Ingeniería Centrada en el Humano). Es un proyecto **aparte** de
`docs/` y `app/` (esos son el mockup y el prototipo del sistema "Parte
digital"): aquí viven las 6 interfaces que pide esta tarea específica.

## Cómo correrlo

No necesita instalación, servidor ni build: es HTML/CSS/JS plano.

```sh
open suite-investigacion/index.html
```

(o ábrelo directo desde el navegador — `Archivo → Abrir`). Al abrirlo por
primera vez se siembra solo con los datos reales de la investigación de
campo (7 respuestas de encuesta + sesión con el Capitán González, el
Maquinista Ortega y el Bombero Carrillo, 19 de septiembre de 2026).

## Qué cumple

- **Las 6 interfaces**, en un menú unificado: Entrevista a Expertos,
  Usuarios Extremos, Needfinding, Empathy Map, Roper Dynagram y Mapeo de
  Requerimientos (esta última, la obligatoria).
- **CRUD real** en cada una: crear, editar y borrar registros, con
  validación de campos requeridos.
- **Listas dinámicas dentro de cada registro** (por ejemplo el guion
  pregunta→respuesta de la entrevista, o las tareas observadas de un
  usuario extremo): se pueden agregar o quitar filas sin recargar nada.
- **Persistencia real**: `localStorage` del navegador. Todo lo que edites
  se queda guardado entre sesiones, en este equipo.
- **Exportación a JSON y CSV**, por colección, con un botón.
- **Dos visualizaciones con recálculo automático**:
  - La cuadrícula 2×2 del Empathy Map (Dice / Hace / Piensa / Siente).
  - La rueda del Roper Dynagram — se recalcula sola cada vez que agregas,
    editas o borras una persona asignada a un segmento.
- **Mapeo de Requerimientos**: vincula insight → requisito funcional →
  requisito UX → prioridad → estado, con:
  - **"Ley embebida"**: cada eje (Velocidad, Confianza, Permisos,
    Accesibilidad) mantiene una suma de prioridad fija (300). Subir la
    prioridad de un requisito baja automáticamente, y en proporción, la de
    los demás de su mismo eje — sin recargar la página.
  - **Vista de trazabilidad**: un botón que muestra la cadena completa
    insight → requisito → decisión de arquitectura de cada fila.
- **Diseño responsivo**: se usa igual de bien en celular que en escritorio.

## Qué está simulado / limitado

- No hay backend: todo vive en `localStorage`, por diseño (el PDF de la
  tarea lo permite explícitamente como opción de persistencia). Cada
  quien que abra el archivo en su propio navegador ve/edita su propia
  copia de los datos — no se comparte entre computadoras.
- Sin autenticación ni roles: la suite es de un solo usuario (quien la
  abre), consistente con que es una herramienta de captura personal de
  investigación, no un sistema multiusuario.

## Cómo está armado

```
suite-investigacion/
  index.html          shell de la app + navegación
  css/app.css          estilos (mismo lenguaje visual que docs/)
  js/
    store.js           motor de persistencia (CRUD sobre localStorage)
    export.js           exportar una colección a JSON o CSV
    schema.js            campos de cada interfaz + datos reales (semilla)
    form.js               formulario genérico, incl. campos "repeater"
    list.js                tabla genérica con editar/borrar
    charts.js                cuadrícula del Empathy Map + rueda del Roper
    pages.js                  arma cada una de las 6 páginas
    app.js                     enruta por el hash de la URL (#entrevistas, etc.)
```

Un solo motor de formulario/lista genérico (`form.js` + `list.js`), dirigido
por el esquema de cada interfaz (`schema.js`) — así las 6 interfaces
comparten el mismo comportamiento de CRUD y validación sin duplicar código,
y las dos que necesitan algo especial (Empathy Map, Roper Dynagram y Mapeo
de Requerimientos) lo agregan encima en `pages.js`.

## Datos reales cargados

10 personas reales: 7 respuestas de encuesta anónima al personal operativo
+ 3 personas de la sesión de campo del 19 de septiembre de 2026 (Capitán
Mauricio Javier González Navarro, 32 años; Maquinista José Antonio Ortega,
25 años; Bombero Alonso Carrillo, 15 años) — supera el mínimo de 4 usuarios
que pide la tarea, con experto de dominio y usuario extremo cubiertos.

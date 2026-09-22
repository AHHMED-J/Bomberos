# Investigación de usuarios

Trabajo de campo y datos ya estructurados para la tarea "Instrumentos
digitales para la investigación de usuarios" (`Examen_1_Investigacion de
usuarios.pdf`, en esta misma carpeta). Vive dentro del repo `Bomberos`
pero **no se publica**: sólo `docs/` es lo que sirve GitHub Pages, así
que nada de esta carpeta sale en el sitio — es la carpeta donde se
resguarda el material crudo y el contenido ya estructurado.

Es un entregable aparte del mockup del producto ("Parte digital", en
`docs/` y `app/`) — las 6 interfaces funcionales que pide esta tarea
todavía no existen; lo de aquí es el insumo para construirlas.

## Qué hay aquí

- `Bomberos (respuestas).xlsx` — encuesta al personal, 4 respuestas
  reales, sin datos que identifiquen a nadie.
- `Examen_1_Investigacion de usuarios.pdf` — el documento de tarea.
- `capturas/` — capturas de pantalla usadas como evidencia (la gráfica
  real de la encuesta, `forms-celular-vs-web.png`; también está
  publicada, recortada, en `docs/img/hallazgo-celular.png`).
- `entrevista-experto-01.md` — la sesión con el Capitán Mauricio Javier
  González Navarro, el Maquinista José Antonio Ortega y el Bombero
  Alonso Carrillo (32 / 25 / 15 años de experiencia), estructurada en
  los campos exactos de la interfaz "Entrevista a Expertos": perfil,
  guion pregunta→respuesta con citas clave, mapa de complejidad técnica,
  restricciones y riesgos, referencias, notas. Es un relato integrado de
  los tres, no atribuible frase por frase a uno solo. Un resumen de esto
  ya está publicado en `docs/investigacion.html`.
- `usuario-extremo-01.md` — segunda lectura de esa misma sesión,
  estructurada para la interfaz "Usuarios Extremos" (clasificación
  súper-experto, workarounds, necesidad extrema), anclada al perfil del
  Capitán porque es lo más claramente identificable en el texto. El
  Maquinista Ortega queda anotado como candidato a un perfil de usuario
  extremo propio más adelante. Resumen publicado en `docs/investigacion.html`.
- `insights-empathy-needfinding.md` — insights de esa sesión y de la
  encuesta, organizados para las interfaces "Empathy Map" y "Observación
  Directa / Needfinding". Publicado completo en `docs/investigacion.html`.
- `mapeo-requerimientos.md` — la tabla insight → requisito → prioridad →
  estado de validación para la interfaz **obligatoria** de Mapeo de
  Requerimientos, con notas sobre qué requisitos están relacionados entre
  sí (para la "ley embebida" de recálculo). Publicada completa en
  `docs/investigacion.html`.

Casi todo el contenido de esta carpeta ya tiene su resumen o versión
completa publicada en `docs/investigacion.html` — lo que se quedó sólo
aquí es la encuesta cruda, el PDF de la tarea, el guion sin resumir, y
las notas internas de "qué falta" de cada documento.

## Qué falta

- Completar el medio (presencial o remoto) de la sesión en
  `entrevista-experto-01.md` y `usuario-extremo-01.md` — la fecha
  (sábado 19 de septiembre de 2026) y los tres participantes ya están
  identificados.
- Insights de **Roper Dynagram** (segmentación por valores/estilos de
  vida) — ya hay suficientes personas reales identificadas (7, entre la
  encuesta y esta sesión) para armarlo sin entrevistar a nadie más;
  falta redactarlo como documento propio.
- Las 6 interfaces en sí (CRUD, validación, persistencia, exportación
  JSON/CSV, visualizaciones) — ese es el trabajo de código que sigue.
  No confundir con `app/`, que es el prototipo del producto "Parte
  digital", un entregable distinto.
- El documento de reflexión de 1-2 páginas (problema investigado, a quién
  se entrevistó, necesidades ocultas, cómo cambió la definición del
  problema) — se puede redactar a partir de lo que ya hay en esta carpeta.

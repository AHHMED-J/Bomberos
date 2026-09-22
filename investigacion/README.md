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

**Si vas a usar esta carpeta para generar el documento de reflexión,
empieza por `resumen-y-evolucion.md`** — es el único archivo que junta
el problema, a quién se entrevistó, las necesidades ocultas y cómo
cambió la definición del problema en una sola narrativa; los demás
archivos tienen el detalle método por método.

## Qué hay aquí

- `resumen-y-evolucion.md` — el problema investigado, a quién se
  entrevistó, las necesidades ocultas y cómo cambió la definición del
  problema, todo junto en una narrativa. **No está publicado** (es
  material de trabajo interno, no una pieza terminada para el sitio).
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
- `roper-dynagram-01.md` — 3 segmentos por valores (institucionales,
  prácticos de tiempo, conformistas sociales), con evidencia real de las
  4 respuestas de la encuesta y la sesión de campo, y la asignación de
  cada una de las 7 personas identificadas. **No está publicado todavía.**

Casi todo el contenido de esta carpeta ya tiene su resumen o versión
completa publicada en `docs/investigacion.html` — las excepciones son
`resumen-y-evolucion.md` y `roper-dynagram-01.md` (los dos más nuevos,
todavía no llevados al sitio), la encuesta cruda, el PDF de la tarea, el
guion sin resumir, y las notas internas de "qué falta" de cada documento.

## Qué falta

- Completar el medio (presencial o remoto) de la sesión en
  `entrevista-experto-01.md` y `usuario-extremo-01.md` — la fecha
  (sábado 19 de septiembre de 2026) y los tres participantes ya están
  identificados.
- Publicar `resumen-y-evolucion.md` y `roper-dynagram-01.md` en
  `docs/investigacion.html`, si se quiere que el sitio público quede
  tan completo como esta carpeta.
- Las 6 interfaces en sí (CRUD, validación, persistencia, exportación
  JSON/CSV, visualizaciones) — ese es el trabajo de código que sigue.
  No confundir con `app/`, que es el prototipo del producto "Parte
  digital", un entregable distinto.
- El documento de reflexión de 1-2 páginas en sí (versión final, con
  formato de entrega) — el insumo narrativo ya está en
  `resumen-y-evolucion.md`, sólo falta darle formato de 1-2 páginas.

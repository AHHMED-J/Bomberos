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
- `entrevista-experto-01.md` — la entrevista al Capitán Mauricio
  González, estructurada en los campos exactos de la interfaz
  "Entrevista a Expertos": perfil, guion pregunta→respuesta con citas
  clave, mapa de complejidad técnica, restricciones y riesgos,
  referencias, notas. Un resumen de esto ya está publicado en
  `docs/investigacion.html`.
- `usuario-extremo-01.md` — segunda lectura de esa misma entrevista,
  estructurada para la interfaz "Usuarios Extremos" (clasificación
  súper-experto, workarounds, necesidad extrema). Se reutiliza la misma
  persona como experto y como usuario extremo por falta de tiempo para
  entrevistar a alguien más — el costo es diversidad de datos, no validez.
- `insights-empathy-needfinding.md` — insights de esa entrevista y de la
  encuesta, organizados para las interfaces "Empathy Map" y "Observación
  Directa / Needfinding".
- `mapeo-requerimientos.md` — la tabla insight → requisito → prioridad →
  estado de validación para la interfaz **obligatoria** de Mapeo de
  Requerimientos, con notas sobre qué requisitos están relacionados entre
  sí (para la "ley embebida" de recálculo).

## Qué falta

- Completar los años de experiencia y la fecha/medio de la entrevista en
  `entrevista-experto-01.md` y `usuario-extremo-01.md` (alias y rol ya
  identificados: Capitán Mauricio González) — no se inventó ningún dato
  porque la tarea exige información real.
- Insights de **Roper Dynagram** (segmentación por valores/estilos de
  vida) — todavía no hay entrevistas suficientes para segmentar.
- Las 6 interfaces en sí (CRUD, validación, persistencia, exportación
  JSON/CSV, visualizaciones) — ese es el trabajo de código que sigue.
  No confundir con `app/`, que es el prototipo del producto "Parte
  digital", un entregable distinto.
- El documento de reflexión de 1-2 páginas (problema investigado, a quién
  se entrevistó, necesidades ocultas, cómo cambió la definición del
  problema) — se puede redactar a partir de lo que ya hay en esta carpeta.

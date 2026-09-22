# Mapeo de Requerimientos (Dynagram interactivo)

> Contenido para la interfaz **OBLIGATORIA** del documento de tarea.
> Trazabilidad insight → requisito funcional → requisito UX/no funcional →
> prioridad → estado de validación. Salió de `entrevista-experto-01.md` y
> `insights-empathy-needfinding.md`.

| # | Insight | Requisito funcional | Requisito UX / no funcional | Prioridad | Estado de validación |
|---|---|---|---|---|---|
| 1 | "Doble trabajo" WhatsApp → transcripción manual | Captura del reporte en tiempo real desde el sitio del incidente, con envío directo a los mandos | Debe tomar igual o menos pasos que mandar un WhatsApp — si es más lento, no lo van a adoptar | **Alta** | Validado en entrevista a experto |
| 2 | Desconfianza institucional / necesidad de amparo físico | Exportar o generar automáticamente una copia imprimible (PDF) de cada reporte enviado | El respaldo se genera solo, sin pasos extra del usuario | **Media** | Validado en entrevista a experto |
| 3 | 4–5 formatos distintos por turno sin unificar (novedades, incidente, revisión mecánica, FRAP, notas) | Un solo flujo digital que cubra los distintos tipos de documento de una salida/turno | Evitar que el usuario cambie de pantalla o repita datos entre formatos | **Alta** | Validado en entrevista a experto; falta confirmar con más usuarios |
| 4 | Formatos actuales sin fundamento normativo citado | Campo opcional de referencia a artículo/reglamento aplicable, por tipo de reporte | No obligatorio — sólo aplica a los reportes que fiscalía/investigación de incendios puede solicitar | **Media** | Señalado por experto, sin validar con más usuarios |
| 5 | Permisos diferenciados por rango/división real | Control de acceso por rol: sólo los perfiles autorizados (jefe de batallón, jefe operativo, coordinador) validan reportes de su división | Los roles deben reflejar turno + estación + división, no un esquema genérico admin/usuario | **Alta** | Validado en entrevista a experto |
| 6 | Preferencia de dispositivo — el experto no descarta computadora fija, a diferencia de la encuesta general | Diseño responsivo, igual de funcional en celular, tablet y computadora | — | **Media** | Contrasta con la encuesta (mayoría celular); revisar si es por su rol administrativo |
| 7 | "Letras grandes, iconos" (encuesta) | Tipografía e iconografía más grande en toda la interfaz | Prioriza accesibilidad para personal de mayor edad | **Alta** | Validado en encuesta *(ya implementado en el rediseño de "Parte digital")* |
| 8 | Retención legal de 10 años antes de destrucción de documentos (autorización de sindicatura) | Archivo de cada reporte por al menos 10 años, con proceso de baja controlado, no eliminación libre | Requisito no funcional: almacenamiento y trazabilidad de largo plazo | **Alta** | Señalado por experto, sin validar con más usuarios |
| 9 | Necesidad de que el sistema sea al menos tan rápido como el atajo de WhatsApp (el súper-usuario ya lo usa porque el proceso formal no da abasto) | Tiempo de captura de un parte nuevo por debajo de un umbral medible (ej. bajo 60 segundos para los campos mínimos) | Se valida con pruebas de tiempo, no sólo con opinión | **Alta** | Validado en la lectura de "usuario extremo" de la misma entrevista |

## Notas para quien construya la interfaz interactiva

- **"Ley embebida" (recálculo automático):** los requisitos #1 y #3 compiten
  por ser la prioridad más alta del primer sprint — ambos resuelven el
  mismo síntoma (el "doble trabajo"), así que si uno sube o baja de
  prioridad, el otro debería recalcularse junto con él en la vista de
  trazabilidad, no de forma independiente.
- Los requisitos #2, #4 y #8 están relacionados entre sí (todos nacen de
  la desconfianza institucional / necesidad legal de respaldo) — vale la
  pena poder agruparlos o vincularlos visualmente como un mismo eje,
  distinto del eje de "velocidad de captura" (#1, #3, #6).
- El requisito #9 sale de la lectura de "usuario extremo" de la misma
  sesión (`usuario-extremo-01.md`), no de una entrevista distinta.
- Faltan insights de **Roper Dynagram** (segmentación por valores). Ya no
  hace falta salir a entrevistar a nadie más para armarlo: con el
  Capitán González (32 años), el Maquinista Ortega (25) y el Bombero
  Carrillo (15) identificados, más las 4 respuestas de la encuesta, hay
  siete personas reales con roles y antigüedad distintos — suficiente
  para clasificar al menos 2-3 segmentos con evidencia real. Sigue
  pendiente de armar como su propio documento.

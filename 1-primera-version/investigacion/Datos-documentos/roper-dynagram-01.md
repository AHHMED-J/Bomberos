# Roper Dynagram — segmentación por valores

> Segmenta por valores/estilo de vida, no por edad o puesto. Las 4
> categorías de ejemplo del documento de tarea (Adventurers, Open
> Minded, Realists, Organics) son de un contexto de consumo general y
> no calzan bien con un cuerpo de bomberos — se definen 3 segmentos
> propios, con el mismo espíritu del método, anclados a evidencia real.
>
> **Actualizado:** la encuesta creció de 4 a 7 respuestas (el archivo
> `Bomberos (respuestas).xlsx` todavía sólo tiene las primeras 4; las 7
> están en las capturas de `capturas/`). Las 3 respuestas nuevas
> confirmaron y reforzaron el segmento "Prácticos de tiempo", que ya
> es, con datos reales, el más grande de los tres.

## Sujeto

Personal operativo del H. Cuerpo de Bomberos de Ensenada — las **10
personas reales** con las que se cuenta hasta ahora: los 7 encuestados
(anónimos) y los 3 de la sesión de campo del 19 de septiembre de 2026
(Capitán González, Maquinista Ortega, Bombero Carrillo).

## Segmentos definidos

### 1. Prácticos de tiempo
**Valores:** eficiencia, rapidez, disponibilidad, practicidad.
**Evidencia:** encuestado 1 — *"Por disponibilidad."* Encuestado 2 —
*"El móvil es más práctico y tenemos acceso todo el tiempo."*
Encuestado 4 — *"No escribirías tanto en la hoja sería más rápido en
el móvil."* Encuestado 5 — *"Porque es más fácil, sobre todo si hay
opciones para poder reducir el tiempo al hacerlo, también porque es
más fácil corregir con el teclado y finalmente por la reducción de
papel."* Encuestado 7 — *"Por tiempos."* La sesión de campo apoya el
mismo eje: el atajo de WhatsApp existe porque el papel es "más lento
que la necesidad real de reportar rápido".
**% observado:** **5 de 7 encuestados explícitos (71.4%)** — es, con
mucho, el segmento más grande de la muestra.

### 2. Institucionales / orden y control
**Valores:** seguridad, legalidad, control del entorno.
**Evidencia:** encuestado 6 — el único que prefirió "Página web" sobre
"Aplicación móvil" — justificó: *"Ya que está tranquilo controlado y
ordenado estar en un escritorio que estar en campo en un ambiente no
controlado."* La sesión de campo refuerza el mismo eje: el Capitán
insiste en el resguardo físico, la retención legal de 10 años y la
autorización de sindicatura antes de destruir un documento.
**% observado:** 1 de 7 encuestados explícito (14.3%) + la sesión de
campo.

### 3. Conformistas sociales
**Valores:** pertenencia, seguir la norma del grupo.
**Evidencia:** encuestado 3 — *"Por que todo mundo lo utiliza."*
**% observado:** 1 de 7 encuestados explícito (14.3%).

**Nota de correlación:** la distribución 71.4% / 14.3% / 14.3% de
estos tres segmentos coincide, casi al punto exacto, con la del diseño
preferido tras ver las dos imágenes (71.4% Celular / 14.3% Computadora
/ 14.3% Ninguna en particular — captura `encuesta-diseno-celular-vs-
computadora.png`). Es una coincidencia numérica sobre una muestra
chica, no una prueba de causalidad — pero es consistente con la
historia: quien valora rapidez/practicidad elige celular, quien valora
orden/control elige computadora.

## Asignación de cada persona

| Persona | Segmento | Evidencia |
|---|---|---|
| Encuestado 1 (anónimo) | Prácticos de tiempo | "Por disponibilidad" |
| Encuestado 2 (anónimo) | Prácticos de tiempo | "El móvil es más práctico y tenemos acceso todo el tiempo" |
| Encuestado 3 (anónimo) | Conformistas sociales | "Por que todo mundo lo utiliza" |
| Encuestado 4 (anónimo) | Prácticos de tiempo | "sería más rápido en el móvil" |
| Encuestado 5 (anónimo) | Prácticos de tiempo | "más fácil…reducir el tiempo…corregir con el teclado…reducción de papel" |
| Encuestado 6 (anónimo) | Institucionales / orden | "tranquilo controlado y ordenado…" |
| Encuestado 7 (anónimo) | Prácticos de tiempo | "Por tiempos" |
| Capitán González | Institucionales / orden | retención legal, sindicatura, POA, resguardo físico |
| Maquinista Ortega | Sin evidencia individual suficiente | sesión conjunta, no atribuible a él solo |
| Bombero Carrillo | Sin evidencia individual suficiente | sesión conjunta, no atribuible a él solo |

## Panel de salida por segmento

- **Prácticos de tiempo:** requisito UX → mínimos clics, velocidad
  igual o mejor que WhatsApp, autocorrección/facilidad de edición con
  teclado; tono directo, breve.
- **Institucionales / orden:** requisito UX → exportar/respaldo
  confiable y trazabilidad legal visible; tono formal, serio.
- **Conformistas sociales:** requisito UX → que se sienta como una app
  "normal", con patrones de interfaz ya conocidos; tono cercano, casual.

## Nota de honestidad de datos

Muestra todavía chica (10 personas), pero ya con una tendencia clara:
5 de 7 encuestados (71.4%) dan razones de eficiencia/practicidad de
forma independiente, sin que se les sugiriera la categoría — es una
señal real, no un artefacto de cómo se hizo la pregunta. Aun así, no
alcanza para un porcentaje estadísticamente robusto a nivel de toda la
corporación. La rueda/gráfico polar de la interfaz debe mostrar
claramente el tamaño de la muestra y recalcularse conforme entren más
usuarios — es exactamente la "ley embebida" que pide el Mapeo de
Requerimientos.

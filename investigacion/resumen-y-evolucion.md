# Resumen y evolución del problema

> Este documento junta lo que están dispersos en los demás archivos de
> `investigacion/` en una sola narrativa: el problema, a quién se
> entrevistó, qué necesidades ocultas salieron, y cómo cambió la
> definición del problema — los cuatro elementos que pide el
> "Documento de reflexión" de la tarea. Es material de trabajo, no la
> versión final de 1-2 páginas.

## El problema investigado

Hoy los bomberos de Ensenada documentan cada emergencia a mano. Los
reportes se acumulan durante el turno y alguien tiene que trasladar
físicamente la papelería hasta la dirección de bomberos para
entregarla. El proyecto "Parte digital" (`docs/` y `app/` en este
mismo repo) propone sustituir ese trámite por una app.

Antes de la investigación de campo, esa propuesta era una **hipótesis
de trabajo sin validar**: mockups derivados de casos de uso en UML, sin
haber hablado todavía con ningún bombero real (así lo dice el propio
`README.md` del repo, escrito antes de este trabajo de campo).

## A quién se entrevistó

- **7 respuestas de encuesta**, anónimas, al personal operativo
  (empezó con 4 y creció a 7; el archivo `Bomberos (respuestas).xlsx`
  todavía sólo tiene las primeras 4 — las 7 están documentadas en las
  capturas de `capturas/`).
- **Sesión de campo**, sábado 19 de septiembre de 2026, presencial en
  la estación, con tres personas reales identificadas: el **Capitán
  Mauricio Javier González Navarro** (32 años de experiencia — experto
  del dominio y usuario extremo), el **Maquinista José Antonio Ortega**
  (25 años) y el **Bombero Alonso Carrillo** (15 años). Detalle
  completo en `entrevista-experto-01.md` y `usuario-extremo-01.md`.

Entre la encuesta y la sesión, son **10 personas reales** — supera con
margen el mínimo de 4 que pide la tarea, con al menos 1 experto del
dominio identificado.

## Necesidades ocultas descubiertas

(Detalle completo en `insights-empathy-needfinding.md`.) Las tres que
más cambiaron el diseño:

1. **La resistencia a lo 100% digital no es tecnofobia, es desconfianza
   institucional.** El personal quiere un respaldo físico o exportable
   no porque desconfíe de la tecnología, sino porque no confía en que
   la dirección no vaya a restringirle el acceso al sistema.
2. **El canal informal (WhatsApp) ya es más rápido y confiable que el
   proceso formal en papel.** El "doble trabajo" (mandar por WhatsApp y
   después transcribir a mano) no es sólo ineficiencia: revela que
   cualquier sistema nuevo tiene que ser *al menos tan rápido* como
   WhatsApp, o el personal va a seguir usando el atajo informal por
   fuera del sistema.
3. **La jerarquía real es más compleja que "un admin y varios
   usuarios."** 4 turnos × 8-9 estaciones × 7 divisiones — un esquema
   de permisos genérico no la representa.
4. **La preferencia por celular esconde una limitación de
   infraestructura, no sólo un gusto.** 71.4% de los encuestados dijo
   que su estación no tiene una computadora compartida — diseñar
   pensando en "celular o computadora, según prefiera cada quien"
   ignora que para la mayoría no hay una elección real de por medio.

## Cómo cambió la definición del problema

**Antes de la investigación:** el problema se entendía como "falta un
medio digital para capturar y enviar el parte" — una sustitución
directa de papel por pantalla, agnóstica de qué dispositivo (la
maqueta original mostraba versión de computadora y de celular por
igual, sin preferencia declarada).

**Después de la investigación, tres cambios concretos:**

1. **De "computadora o celular" a "sólo celular."** 6 de 7 encuestados
   (85.7%) eligieron la app de celular sobre la web, con razones que
   apuntan a flexibilidad de horario ("Por tiempos"), disponibilidad
   ("tenemos acceso todo el tiempo") y adopción social ("todo mundo lo
   utiliza") — no sólo costumbre. Un hallazgo que refuerza esto todavía
   más: 71.4% de los encuestados dijo que su estación **no tiene** una
   computadora a la que todos tengan acceso — para la mayoría, celular
   no es sólo la opción preferida, es la única real. Por eso las
   pantallas del Parte digital ya no se muestran en versión de
   computadora.
2. **De "letra estándar" a "letra casi el doble de grande."** Una
   persona respondió textualmente "Letras grandes, iconos" al
   preguntarle qué le agregaría a la app; la sesión de campo explicó el
   porqué: buena parte del personal operativo es de mayor edad, algo
   que la encuesta por sí sola no había capturado. El texto principal
   pasó de 14.5px a 24px.
3. **De "digitalizar el envío" a "igualar la velocidad de WhatsApp."**
   Este es el cambio menos visible pero más grande: el problema ya no
   es sólo reemplazar el papel, es que el sistema nuevo tiene que ser
   tan rápido como el atajo informal que el personal ya usa, o no lo
   va a adoptar de verdad. Esto es lo que exige el requisito #9 de
   `mapeo-requerimientos.md` (tiempo de captura medible, no sólo
   opinión).

Un cuarto hallazgo **todavía no se ha traducido en un cambio de
diseño**, y vale la pena que el documento de reflexión lo mencione como
trabajo pendiente: la necesidad de que el sistema soporte archivo de
largo plazo (retención legal de 10 años) y permisos por jerarquía real,
no sólo por rol genérico — esto afecta más al backend/base de datos que
a las pantallas, y por eso no se ve todavía en el rediseño visual.

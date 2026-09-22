# Entrevista a Expertos — Caso 01

> Estructurado según los campos que pide la interfaz "Entrevista a Expertos"
> del documento de tarea (`Examen_1_Investigacion de usuarios.pdf`). Listo
> para copiar/pegar o importar en cuanto esa interfaz exista.

## Perfil del experto

| Campo | Valor |
|---|---|
| Alias | Mauricio González |
| Rol | Capitán |
| Dominio | Operación y administración de un cuerpo de bomberos (despacho de emergencias, jerarquía de mando, papeleo/reportes, presupuesto) |
| Años de experiencia | **(pendiente — completar)** |
| Organización | H. Cuerpo de Bomberos de Ensenada |
| Fecha | **(pendiente — completar)** |
| Medio | **(pendiente — presencial o remoto)** |

*Nota: no se rellenaron estos cuatro campos con datos inventados porque la
tarea exige datos reales, no ficticios. Dime alias/rol/años/fecha y los
actualizo.*

## Guion dinámico (pregunta → respuesta)

### 1. ¿Cómo es el proceso desde que una persona llama al 911 hasta que la emergencia ha finalizado?
La persona marca al 911; la llamada entra al centro de control C5 y se deriva al radiooperador de bomberos, que canaliza según el tipo de evento a la división correspondiente (investigación de incendios, salvavidas, forestales, bomberos estructurales, inspectores o atención prehospitalaria y rescate urbano). Se despacha la unidad por radio o teléfono.

> **Cita clave:** "Cualquier servicio pequeño puede escalar" — el cierre de una emergencia depende de múltiples factores (gravedad, pérdida de vidas) y se reporta de vuelta al 911 vía radio o teléfono al finalizar.

### 2. ¿Cómo es la jerarquía en una emergencia o en un operativo y cómo se reparten los roles?
El encargado de turno tiene el mando directo. Hay un jefe de batallón por turno (A, B, C, D) distribuidos en las estaciones (1 a 8/9). Director, Subdirector y Jefe de Batallón permanecen en la zona exterior enfocados en dirección estratégica/táctica junto al capitán. Los bomberos hacen el trabajo de campo con equipo de respiración autónoma (aire comprimido seco, no oxígeno). El maquinista opera la unidad y regula el recurso hídrico.

> **Cita clave:** jerarquía real de 4 turnos × 8-9 estaciones × múltiples divisiones — no es una jerarquía plana, un sistema de permisos "un solo admin" no la representa.

### 3. ¿Qué tipo de papeleo tienen que elaborar?
Parte de novedades (bitácora de estación), hoja de incidente/reporte por cada salida, listas de asistencia, revisión mecánica (checklist de unidad), y FRAP (atención prehospitalaria, la llenan los paramédicos).

> **Cita clave:** "Se generan entre 4 y 5 hojas diarias por turno", entregadas a dirección al día siguiente; la bitácora física se queda en la estación.

### 4. De todo ese papeleo, ¿conviene dejarlo en físico o en digital?
Conviene un resguardo mixto: aunque exista plataforma digital, el archivo físico (o copia escaneada/fotografiada) funciona como amparo de la estación.

> **Cita clave:** "en caso de que la dirección restrinja el acceso al sistema" — la razón del respaldo físico no es desconfianza en lo digital, es desconfianza institucional/jerárquica sobre quién controla el acceso.

Respaldos institucionales adicionales: número de incidente en las grabaciones del 911, o el NUC (Número Único de Caso) que otorga la fiscalía para peritajes de investigación de incendios.

### 5. ¿Les convendría tener la bitácora en físico o en digital?
La bitácora es control interno de estación/capitán (colonia, calle, propietario). La hoja de incidente es el documento detallado que sí va a dirección: hora de salida, tipo de reporte, teléfono, descripción redactada, personal con número de empleado, corporaciones de apoyo externo (Cruz Roja, Seguridad Pública).

### 6. ¿Qué son exactamente las "notas" y tienen un formato específico?
Reportes de fallas mecánicas, faltantes de insumos/mantenimiento, o conducta de un elemento. Sin formato rígido ni estructura legal especial — hoja membretada "notas" con renglones libres.

### 7. ¿Qué problemas detectan actualmente en el proceso de la papelería?
Falta de fundamentación normativa: los formatos internos no citan el marco legal/artículos bajo los que se rigen (a diferencia de un acta de inspección) — sólo importa legalmente si fiscalía/investigación de incendios lo pide.

> **Cita clave:** el archivo físico tiene un **periodo de resguardo obligatorio de 10 años** antes de poder pedir autorización a sindicatura para destruirlo — genera volúmenes grandes de papel acumulado.

### 8. ¿Cuántas divisiones existen y cómo se beneficiarían de una plataforma digital?
Bomberil Estructural, Inspectores (Subdirección Técnica), Forestales, Salvavidas/Acuática, Atención Prehospitalaria, Rescate Urbano, Investigadores de Incendios.

> **Cita clave:** beneficio económico (menos gasto de POA en papel/tinta/impresoras) y de tiempo — "elimina el doble trabajo actual de enviar la información por WhatsApp y luego transcribirla manualmente en la estación."

### 9. ¿Se les facilitaría más trabajar en celular, tablet o en una computadora fija?
"Sería práctico operar en computadora, tablet o celular" — no descarta ninguno. Una app móvil/tableta agilizaría el envío directo de novedades e imágenes a los mandos, formalizando lo que ya hacen de forma informal por WhatsApp.

### 10. ¿Quién es responsable de revisar los partes según su rango?
Los jefes de batallón, el jefe operativo y los coordinadores de cada área son los perfiles autorizados a acceder y validar reportes de su respectiva división.

## Mapa de complejidad técnica

- **Conceptos clave:** C5 (centro de control), NUC (Número Único de Caso, lo otorga fiscalía), FRAP (Formato de Registro de Atención Prehospitalaria), POA (Presupuesto de Operación Anual), equipo de respiración autónoma (aire comprimido seco, no oxígeno), revisión mecánica (checklist de unidad: códigos, luces, sirenas, cristales, llantas, radio).
- **Jerga del dominio:** "parte de novedades", "hoja de incidente", "bitácora", "rebombear agua", "encargado de turno", "jefe de batallón", "maquinista", "amparo" (respaldo físico).
- **Dependencias entre componentes:** 911 → C5 → radiooperador → división correspondiente → unidad de emergencia → cierre reportado de vuelta al 911. En paralelo, hoy: WhatsApp informal → transcripción manual en estación (el "doble trabajo").
- **Actores del ecosistema:** C5/911, radiooperador, jefe de batallón (por turno A/B/C/D), Director, Subdirector, capitán/encargado de turno, bomberos operativos, maquinista, paramédicos (FRAP), Cruz Roja, Seguridad Pública, fiscalía (NUC), sindicatura (autorización de baja documental).

## Restricciones y riesgos técnicos señalados por el experto

1. El sistema no puede ser 100% digital sin respaldo: se necesita amparo físico o exportable mientras el personal no confíe en que dirección no va a restringir el acceso.
2. Retención legal obligatoria de 10 años antes de poder destruir un documento — el sistema necesita archivo de largo plazo, no sólo captura y envío.
3. Los formatos actuales no citan fundamento normativo — si el sistema digital va a tener valor legal ante fiscalía/investigación de incendios, probablemente necesite ese campo, aunque hoy no sea obligatorio.
4. Los permisos de validación deben reflejar la jerarquía real (por división y rango), no un esquema genérico admin/usuario.

## Referencias / fuentes recomendadas

No se mencionaron documentos o reglamentos específicos por nombre en esta entrevista — pendiente de preguntar en una siguiente sesión si existe un reglamento interno citable.

## Notas y siguientes pasos

- Completar los años de experiencia y la fecha/medio de la entrevista (alias y rol ya identificados: Capitán Mauricio González).
- Profundizar en qué campos exactos lleva cada una de las ~4-5 hojas diarias (parte de novedades, hoja de incidente, revisión mecánica, FRAP, notas) para diseñar el formulario digital sin dejar ninguna fuera.
- Este experto no descarta computadora fija como dispositivo — contrasta con la encuesta general (mayoría celular). Vale la pena preguntar si es porque su rol es más administrativo que operativo de campo.
- Éste cuenta como el **experto del dominio** que pide la tarea de campo, y también como el **usuario extremo** (ver `usuario-extremo-01.md`) — se reutilizó la misma entrevista para ambos por falta de tiempo para entrevistar a alguien más.

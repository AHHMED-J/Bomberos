# Requerimientos y límites · Tercera versión

> Versión definitiva, acordada por el equipo en noviembre de 2026 y
> actualizada el 11 de noviembre con las decisiones de las notas del
> equipo. Si algo de `1-primera-version/`, `2-segunda-version/` o
> `3-actoNo2/` dice otra cosa, manda lo que está aquí.
>
> Los IDs son los del Avance de Proyecto No. 1
> (`1-primera-version/docs/avance-proyecto-1.docx`, Tablas 3 y 4). Ese
> documento pide conservarlos entre entregas, así que los que ya existían
> mantienen su número y los nuevos siguen la numeración.
>
> Las decisiones de la sección 1 llevan ID (D-01 a D-20) para citarlas.
> Lo que viene de antes (la v1, la v2, los hitos del roadmap y el mapeo de
> requisitos) está explicado en [`antecedentes.md`](antecedentes.md).
>
> Qué cambió en este archivo y cuándo: sección 8.

## 1. Decisiones del equipo

**Plataforma**

- **D-01 · Plataforma.** La app para elementos y revisores es solo para
   celulares y se hace en Flutter. Dirección usa una página web.

**Acceso y usuarios**

- **D-02 · Acceso en equipo compartido.** Se elimina. Cada elemento entra desde
   su propio celular.
- **D-03 · Alta de usuarios.** Dirección da de alta a cada usuario y le entrega
   su usuario y contraseña. El usuario es su número de empleado, para que
   cada persona tenga un identificador único que no se repite. No hay
   código de alta.
- **D-04 · Contraseña.** Cada usuario puede cambiarla o quedarse con la que le
   dieron. Si la olvida, va a Dirección a recuperar el acceso.
- **D-05 · Un celular por usuario.** Después de entrar con su contraseña, en ese
   celular también puede entrar con la biometría (huella o cara).
- **D-06 · Permisos.** Dirección decide quién puede revisar, firmar como revisor
   y enviar partes a Dirección.
- **D-07 · Nombre.** "Administración" y "Dirección" son lo mismo. En pantallas,
   base de datos y documentos se usa solo **Dirección**.

**Firma, revisión y sellado**

- **D-08 · Firma.** Firma en trazo, una por usuario (relación 1:1). Cada usuario
   la sube y la actualiza desde su celular. Antes de ponerla en el parte se
   pide **la biometría del celular o la contraseña del usuario**, igual que
   al confirmar una transferencia en un banco digital. La biometría la
   verifica el celular y la app nunca la guarda. La app no tiene un PIN
   propio.
- **D-09 · Copia de la firma.** Cada parte guarda una copia de las firmas con las
   que se firmó. Si un usuario actualiza su firma, sus partes anteriores no
   cambian.
- **D-10 · Propietario y testigo.** No tienen usuario. Firman en trazo en el
    momento, en el celular del bombero, sin biometría ni contraseña.
- **D-11 · Revisión.** El parte lo firman dos personas, por separado y no al
    mismo tiempo: primero quien lo llena y después el encargado que lo
    revisa. El parte tiene dos opciones: **Guardar borrador** y **Enviar**.
    El autor y el revisor no pueden ser la misma persona: si el encargado
    llena el parte, lo revisa otro revisor de la división. El revisor no
    edita el contenido: lo firma y lo envía, o lo devuelve con nota.
- **D-12 · Envío.** No hay entrega por lote. Cuando el revisor firma, el parte se
    envía directo a Dirección.
- **D-13 · Solo lectura.** Después de enviar el parte firmado, quien lo llenó
    solo puede verlo en modo lectura, a menos que se lo regresen para
    corregir. Los partes nunca se borran.
- **D-14 · Sellado.** Cuando el revisor valida el parte, se sella: se saca su
    hash SHA-256 y se guarda junto con él, para poder comprobar que nadie
    lo modificó después. El hash se saca de todo el parte (datos, firmas,
    fotos y croquis), siempre en el mismo orden. Dirección tiene un botón
    **Verificar sello**. Si el revisor lo devuelve para corregirlo, se
    tiene que volver a firmar, y el sello se hace hasta que se valide. No se
    usará el resguardo de 10 años ni la pantalla de Archivo.
- **D-15 · Copia en PDF para la estación.** Al validar el parte, la app genera
    sola una copia en PDF con el hash del sello impreso, para que la
    estación la descargue e imprima como respaldo físico.

**Croquis**

- **D-16 · Croquis.** El lugar se ubica por GPS o escribiendo una dirección o
    coordenadas. Desde ahí se puede mover el mapa para afinar el punto,
    guardar la imagen en vista de relieve o solo la base, y dibujar encima
    para marcar los detalles.

**Inteligencia artificial**

- **D-17 · Dictado.** Se usan dos modelos de IA: uno transcribe el audio a texto
    para la descripción, y otro interpreta lo dictado y llena los campos
    del parte, usando delimitadores para separar los datos generales de la
    descripción.
- **D-18 · Resumen.** Un modelo de texto a texto resume el parte. Se comparte
    copiando el texto: la app tiene un botón **Copiar** y el bombero lo
    pega en WhatsApp. No hay conexión directa con WhatsApp.
- **D-19 · Reglas de la IA:**
    - La IA llena los campos y el bombero confirma. Nada entra a la hoja
      sin esa confirmación.
    - El audio se borra en cuanto se transcribe.
    - El resumen para WhatsApp no es parte del documento oficial y no se
      guarda.
- **D-20 · Versión de producción.** Incluye el dictado por voz y la firma doble.

## 2. Requerimientos funcionales

"Frente a la v1" compara con las Tablas 3 y 4 del Avance de Proyecto No. 1
(ver [`antecedentes.md`](antecedentes.md)).

| ID | Requerimiento | Actor | Frente a la v1 |
|---|---|---|---|
| RF-01 | Iniciar sesión con número de empleado y contraseña. En el celular propio, también con la biometría. | Todos | **Cambia.** Antes era la credencial del dispositivo, sin contraseña. |
| RF-02 | Capturar los datos del servicio: tipo, fecha, horas, ubicación, unidades y personal en sitio. | Elemento | Igual. Ahora también se puede dictar (RF-15). |
| RF-03 | Guardar el parte como borrador desde que se crea, aun sin conexión. | Elemento | Igual. Es el botón **Guardar borrador**. |
| RF-04 | Ubicar el croquis por GPS, dirección o coordenadas, y mover el mapa para afinar el punto. | Elemento | **Cambia.** Antes la IA generaba el croquis a partir de la descripción. |
| RF-05 | Guardar la imagen del croquis en vista de relieve o solo la base, y dibujar encima los detalles. | Elemento | **Cambia.** Antes se editaban los elementos que generaba la IA. |
| RF-06 | Adjuntar fotografías al parte. | Elemento | Igual. |
| RF-07 | Firmar el parte con la firma en trazo propia, confirmada con la biometría del celular o la contraseña, y enviarlo a revisión. | Elemento | **Cambia.** Antes se firmaba con la credencial del dispositivo. |
| RF-08 | Listar los partes pendientes de revisión. | Revisor | Igual. |
| RF-09 | Devolver el parte con una nota de corrección, o firmarlo (trazo + biometría o contraseña) y enviarlo a Dirección. | Revisor | **Cambia.** Ahora el revisor también firma, y su firma es la que envía. |
| RF-10 | Consultar, filtrar, exportar y ver el detalle de los partes por fecha, tipo y unidad. | Dirección | Igual. |
| RF-11 | Dar de alta usuarios con su número de empleado como usuario y entregarles su contraseña. | Dirección | **Nuevo.** Reemplaza el alta con código de un solo uso. |
| RF-12 | Habilitar a qué usuarios se les permite revisar, firmar como revisor y enviar a Dirección. | Dirección | **Nuevo.** En la v2 lo hacía el encargado en "Administrar elementos". |
| RF-13 | Subir y actualizar la firma en trazo propia desde el celular. | Todos | **Nuevo.** |
| RF-14 | Sellar el parte validado con su hash SHA-256 y poder comprobar después que no cambió. | Sistema, Dirección | **Nuevo** como requerimiento. El sellado ya existía en `1-primera-version/app/src/sellado.js`. |
| RF-15 | Dictar el parte por voz: el audio se transcribe y la IA llena los campos para que el elemento los confirme. | Elemento, servicio de IA | **Nuevo.** |
| RF-16 | Generar un resumen del parte y copiarlo para compartirlo por WhatsApp. | Usuario, servicio de IA | **Nuevo.** |
| RF-17 | Mostrar el parte enviado en solo lectura a quien lo llenó, salvo que se lo devuelvan. | Sistema | **Nuevo.** |
| RF-18 | Cambiar la contraseña propia desde el celular. | Todos | **Nuevo.** |
| RF-19 | Generar la copia en PDF del parte validado, con el hash del sello impreso. | Sistema, estación | **Nuevo.** |

## 3. Requerimientos no funcionales

| ID | Requerimiento | Estado en la v3 |
|---|---|---|
| RNF-01 | El parte se captura y se guarda sin conexión a internet. | Se mantiene. El dictado, el mapa y la búsqueda de direcciones sí necesitan internet (pregunta 6). |
| RNF-02 | Llenar el parte no toma más tiempo que en papel. | Se mantiene. El dictado ayuda a cumplirlo. |
| RNF-03 | La descripción no sale del dispositivo sin autorización de la institución. | Se mantiene, pero choca con mandar el audio a una IA externa y con el resumen por WhatsApp (pregunta 6). |
| RNF-04 | Funciona en los teléfonos que el personal ya trae. | Se mantiene. |
| RNF-05 | El sistema no guarda datos biométricos: la huella o la cara se verifican en el teléfono. | Se mantiene. |
| RNF-06 | Nada de lo que llena la IA entra a la hoja sin la confirmación del elemento. | **Nuevo.** |
| RNF-07 | El audio se borra en cuanto se transcribe. | **Nuevo.** |
| RNF-08 | El resumen para WhatsApp no forma parte del documento oficial y no se guarda. | **Nuevo.** |
| RNF-09 | Cada número de empleado identifica a una sola persona. | **Nuevo.** |
| RNF-10 | Las contraseñas se guardan con bcrypt, nunca en texto. | **Nuevo.** |

## 4. Límites: lo que no entra

- **Acceso en equipo compartido** (QR y confirmación en el teléfono). Se
  elimina: cada elemento usa su propio celular.
- **Alta de credencial con código de un solo uso.** La reemplaza el alta
  que hace Dirección (RF-11).
- **PIN propio de la app.** Se confirma con la biometría del celular o con
  la contraseña del usuario.
- **Versión web para elementos y revisores.** La app es solo para
  celulares; la web es solo para Dirección.
- **Administrar elementos por el encargado.** Los permisos los da
  Dirección (RF-12).
- **Papelería** (entrega por lote del turno). Cada parte se envía uno por
  uno cuando lo firma el revisor.
- **Resguardo de 10 años y pantalla de Archivo** ([requisito #8 del mapeo](antecedentes.md#2-los-10-requisitos-del-mapeo)). Solo se guarda el sello
  SHA-256. Los partes no se borran del sistema; el control de vencimientos
  y la destrucción autorizada por sindicatura quedan fuera.
- **Croquis generado por IA a partir del texto.** Lo reemplaza el croquis
  sobre mapa (RF-04 y RF-05).
- **Parte multijugador.** Se quita del [hito 4 · Functional Prototype](antecedentes.md#3-los-6-hitos-del-roadmap).
- **Lista de asistencia, Notas y Revisión mecánica.**
- **Conexión directa con WhatsApp.** El resumen se copia y se pega.
- **Siguen fuera, como en la v1:** estadísticas, la conexión con el C-5 o
  el 911, y el FRAP de los paramédicos.

**Pospuesto, no descartado.** Todavía no se implementa, pero no se ha
decidido dejarlo fuera:

- Cambiar de celular desde la app (activar uno nuevo y desactivar el
  anterior). Por ahora lo hace Dirección al restablecer el acceso.
- Bloquear el acceso tras varios intentos fallidos.
- Dar de baja a un usuario (desactivarlo en vez de borrarlo).

## 5. Documentos que esta versión deja atrás

Se movió a [`antecedentes.md`](antecedentes.md#5-documentos-que-la-v3-deja-atrás),
junto con la línea de tiempo, los 10 requisitos del mapeo y los 6 hitos del
roadmap.

## 6. Preguntas abiertas y decisiones

Las preguntas que las decisiones originales no cubrían, con lo que se
decidió el 10 y 11 de noviembre de 2026. La 6 sigue abierta.

| # | Pregunta | Propuesta | Decisión |
|---|---|---|---|
| 1 | ¿Cómo firman el propietario y el testigo? No tienen usuario, así que la regla 1:1 no les aplica. | Firman en trazo en el momento, en el celular del bombero, sin PIN. | **Como se propuso**, sin biometría ni contraseña (D-10). |
| 2 | Si un usuario actualiza su firma, ¿cambian sus partes viejos? | No. Al firmar se guarda una copia del trazo dentro del parte, no un enlace a la firma actual. Si no, el hash dejaría de coincidir. | **Como se propuso** (D-09). |
| 3 | ¿Qué entra exactamente en el hash? | Los datos del parte, las dos firmas, las fotos y el croquis, siempre en el mismo orden. Más un botón "Verificar sello" en Administración. | **Como se propuso**, con el botón en Dirección (D-14). |
| 4 | ¿Cómo se guardan y recuperan contraseñas y PIN? | Con bcrypt, no con SHA-256. Cambio obligatorio la primera vez, Administración la restablece, bloqueo tras varios PIN equivocados, y al dar de baja se desactiva al usuario en vez de borrarlo. | **Con bcrypt.** El cambio **no** es obligatorio: el usuario puede quedarse con la que le dieron. Dirección la restablece si la olvida. No hay PIN de la app. El bloqueo por intentos y la baja de usuarios se posponen (sección 4). |
| 5 | ¿Qué pasa si el encargado llena el parte? ¿Puede el revisor editarlo? | Lo revisa otro revisor de la división; nadie firma como autor y revisor del mismo parte. El revisor no edita: firma y envía, o devuelve con nota. | **Como se propuso** (D-11). |
| 6 | ¿Qué hace la IA sin señal, y cómo se cumple el RNF-03? | Se graba en el celular y se transcribe al recuperar la señal (el audio vive en el celular solo hasta entonces). Avisar que el audio se procesa fuera y quitar nombres y teléfonos del resumen. | **Sin decidir.** |
| 7 | ¿Cómo se manda el resumen por WhatsApp? | Con el botón "Compartir" del celular o un enlace wa.me. La API oficial pide cuenta de negocio y tiene costo. | **Botón Copiar**: el bombero pega el texto en WhatsApp. Sin conexión directa (D-18). |
| 8 | ¿Huella o PIN? | PIN obligatorio y huella opcional. La huella en web necesita WebAuthn y HTTPS. | **Biometría del celular (huella o cara) o la contraseña del usuario.** No hay PIN de la app. La web no la usan elementos ni revisores (D-01 y D-08). |
| 9 | ¿Sigue el parte multijugador del [hito 4 · Functional Prototype](antecedentes.md#3-los-6-hitos-del-roadmap)? | | **No.** Se quita del hito 4. |
| 10 | ¿Siguen Lista de asistencia, Notas y Revisión mecánica, del [hito 6 · Final Prototype](antecedentes.md#3-los-6-hitos-del-roadmap)? | | **No.** Quedan fuera de esta versión. |
| 11 | ¿Sigue la copia en PDF para la estación ([requisito #2 del mapeo](antecedentes.md#2-los-10-requisitos-del-mapeo), [hito 5 · X-is-finished](antecedentes.md#3-los-6-hitos-del-roadmap))? | | **Sí**, generada sola al validar, con el hash del sello impreso (D-15, RF-19). |
| 12 | ¿"Administración" es la misma "Dirección" de la v1 y la v2? | Usar un solo nombre en pantallas, base de datos y documentos. | **Sí, son la misma.** Se usa solo **Dirección** (D-07). |

## 7. Estado de la implementación

Al 11 de noviembre de 2026. La app está en `app/` y el servidor en
`servidor/`. El detalle de acceso, firma, revisión y sellado está en
[`avances-acceso-y-firma.md`](avances-acceso-y-firma.md).

| ID | Estado | Cómo quedó |
|---|---|---|
| RF-01 | Hecho | Pantalla de acceso con número de empleado y contraseña. En el celular registrado, también con biometría. |
| RF-02 | Hecho | Hoja de incidente, a mano o dictada. |
| RF-03 | Parcial | El parte se guarda solo en el teléfono a cada cambio, aun sin conexión. No hay un botón "Guardar borrador". |
| RF-04 | Parcial | Mapa con la ubicación por GPS en tiempo real, que se puede mover. Falta ubicar escribiendo una dirección o coordenadas. |
| RF-05 | Parcial | Se captura la imagen del mapa y se dibuja encima. Falta elegir entre vista de relieve y solo la base. |
| RF-06 | Simulado | El botón suma una foto de ejemplo; falta la cámara real. |
| RF-07 | Hecho | Firma en trazo de la cuenta, confirmada con biometría o contraseña. |
| RF-08 | Hecho | Bandeja de revisión por división. |
| RF-09 | Hecho | Devolver con nota, o firmar y validar. Solo valida un capitán de la división que no sea el autor. |
| RF-10 | Pendiente | No existe la página web de Dirección. |
| RF-11 | Parcial | Por comando (`npm run usuario -- alta`), mientras no exista la web. |
| RF-12 | Parcial | Se habilita al dar de alta (`--capitan`). No hay pantalla para cambiarlo. |
| RF-13 | Hecho | Pantalla Mi cuenta. |
| RF-14 | Hecho | Sello al validar y ruta para verificarlo. Falta el botón en la web de Dirección. Las imágenes de fotos y croquis todavía no se suben, así que el sello cubre su número y su referencia, no las imágenes. |
| RF-15 | Hecho | Dictado con Whisper y Ollama en la Mac del equipo; en otras compus, respuestas de ejemplo. |
| RF-16 | Hecho | Resumen con botón Copiar. |
| RF-17 | Hecho | La app solo deja editar partes en progreso o devueltos, y el servidor rechaza reenviar uno ya enviado. |
| RF-18 | Hecho | Pantalla Mi cuenta. |
| RF-19 | Pendiente | Los botones "Copia PDF" existen pero todavía no hacen nada. |

## 8. Cambios a este archivo

**11 de noviembre de 2026 · documentación**

- Las decisiones de la sección 1 llevan ID (D-01 a D-20) y el resto del
  documento las cita así.
- Las menciones a los hitos y al mapeo enlazan a
  [`antecedentes.md`](antecedentes.md), que explica de qué documento
  salen.
- La sección 5 se movió a `antecedentes.md`.

**11 de noviembre de 2026**

- Se llenó la columna "Decisión" de la sección 6 con las decisiones de
  las notas del equipo. La pregunta 6 sigue abierta.
- Se agregaron a la sección 1 las decisiones nuevas: plataforma,
  contraseña, un celular por usuario, nombre único, copia de la firma,
  propietario y testigo, copia en PDF y resumen con botón Copiar.
- "Huella o PIN" pasa a "biometría del celular o contraseña", porque no
  hay PIN de la app (RF-01, RF-07, RF-09 y RNF-05).
- "Administración" pasa a "Dirección" en todo el documento.
- Nuevos: RF-18 (cambiar la contraseña), RF-19 (copia en PDF) y RNF-10
  (contraseñas con bcrypt).
- Sección 4: se agregaron los límites de las notas y lo pospuesto.
- Sección 7 nueva: estado de la implementación.
- Las rutas a `3-ACTO 2/` pasan a `3-actoNo2/`, el nombre actual de la
  carpeta.

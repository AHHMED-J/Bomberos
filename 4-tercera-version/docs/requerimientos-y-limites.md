# Requerimientos y límites · Tercera versión

> Versión definitiva, acordada por el equipo en noviembre de 2026. Si algo
> de `1-primera-version/`, `2-segunda-version/` o `3-ACTO 2/` dice otra
> cosa, manda lo que está aquí.
>
> Los IDs son los del Avance de Proyecto No. 1
> (`1-primera-version/docs/avance-proyecto-1.docx`, Tablas 3 y 4). Ese
> documento pide conservarlos entre entregas, así que los que ya existían
> mantienen su número y los nuevos siguen la numeración.

## 1. Decisiones del equipo

**Acceso y usuarios**

1. **Acceso en equipo compartido.** Se elimina. Cada elemento entra desde
   su propio celular.
2. **Alta de usuarios.** Administración da de alta a cada usuario y le
   entrega su usuario y contraseña. El usuario es su número de empleado,
   para que cada persona tenga un identificador único que no se repite.
3. **Permisos.** Administración decide quién puede revisar, firmar como
   revisor y enviar partes a Administración.

**Firma, revisión y sellado**

4. **Firma.** Firma en trazo, una por usuario (relación 1:1). Cada usuario
   la sube y la actualiza desde su celular. Antes de ponerla en el parte se
   pide huella o PIN como segunda capa de seguridad, igual que al confirmar
   una transferencia en un banco digital.
5. **Revisión.** El parte lo firman dos personas, por separado y no al
   mismo tiempo: primero quien lo llena y después el encargado que lo
   revisa. El parte tiene dos opciones: **Guardar borrador** y **Enviar**.
6. **Envío.** No hay entrega por lote. Cuando el revisor firma, el parte se
   envía directo a Administración.
7. **Solo lectura.** Después de enviar el parte firmado, quien lo llenó
   solo puede verlo en modo lectura, a menos que se lo regresen para
   corregir.
8. **Sellado.** Cuando el revisor valida el parte, se sella: se saca su
   hash SHA-256 y se guarda junto con él, para poder comprobar que nadie
   lo modificó después. Si el revisor lo devuelve para corregirlo, se
   tiene que volver a firmar, y el sello se hace hasta que se valide. No se
   usará el resguardo de 10 años ni la pantalla de Archivo.

**Croquis**

9. **Croquis.** El lugar se ubica por GPS o escribiendo una dirección o
   coordenadas. Desde ahí se puede mover el mapa para afinar el punto,
   guardar la imagen en vista de relieve o solo la base, y dibujar encima
   para marcar los detalles.

**Inteligencia artificial**

10. **Dictado.** Se usan dos modelos de IA: uno transcribe el audio a texto
    para la descripción, y otro interpreta lo dictado y llena los campos
    del parte, usando delimitadores para separar los datos generales de la
    descripción.
11. **Resumen.** Un modelo de texto a texto resume el parte.
12. **Reglas de la IA:**
    - La IA llena los campos y el bombero confirma. Nada entra a la hoja
      sin esa confirmación.
    - El audio se borra en cuanto se transcribe.
    - El resumen para WhatsApp no es parte del documento oficial y no se
      guarda.
13. **Versión de producción.** Incluye el dictado por voz y la firma doble.

## 2. Requerimientos funcionales

| ID | Requerimiento | Actor | Frente a la v1 |
|---|---|---|---|
| RF-01 | Iniciar sesión con número de empleado y contraseña. | Todos | **Cambia.** Antes era la credencial del dispositivo, sin contraseña. |
| RF-02 | Capturar los datos del servicio: tipo, fecha, horas, ubicación, unidades y personal en sitio. | Elemento | Igual. Ahora también se puede dictar (RF-15). |
| RF-03 | Guardar el parte como borrador desde que se crea, aun sin conexión. | Elemento | Igual. Es el botón **Guardar borrador**. |
| RF-04 | Ubicar el croquis por GPS, dirección o coordenadas, y mover el mapa para afinar el punto. | Elemento | **Cambia.** Antes la IA generaba el croquis a partir de la descripción. |
| RF-05 | Guardar la imagen del croquis en vista de relieve o solo la base, y dibujar encima los detalles. | Elemento | **Cambia.** Antes se editaban los elementos que generaba la IA. |
| RF-06 | Adjuntar fotografías al parte. | Elemento | Igual. |
| RF-07 | Firmar el parte con la firma en trazo propia, confirmada con huella o PIN, y enviarlo a revisión. | Elemento | **Cambia.** Antes se firmaba con la credencial del dispositivo. |
| RF-08 | Listar los partes pendientes de revisión. | Revisor | Igual. |
| RF-09 | Devolver el parte con una nota de corrección, o firmarlo (trazo + huella o PIN) y enviarlo a Administración. | Revisor | **Cambia.** Ahora el revisor también firma, y su firma es la que envía. |
| RF-10 | Consultar, filtrar, exportar y ver el detalle de los partes por fecha, tipo y unidad. | Administración | Igual (en la v1 el actor se llamaba Dirección). |
| RF-11 | Dar de alta usuarios con su número de empleado como usuario y entregarles su contraseña. | Administración | **Nuevo.** Reemplaza el alta con código de un solo uso. |
| RF-12 | Habilitar a qué usuarios se les permite revisar, firmar como revisor y enviar a Administración. | Administración | **Nuevo.** En la v2 lo hacía el encargado en "Administrar elementos". |
| RF-13 | Subir y actualizar la firma en trazo propia desde el celular. | Todos | **Nuevo.** |
| RF-14 | Sellar el parte validado con su hash SHA-256 y poder comprobar después que no cambió. | Sistema, Administración | **Nuevo** como requerimiento. El sellado ya existía en `1-primera-version/app/src/sellado.js`. |
| RF-15 | Dictar el parte por voz: el audio se transcribe y la IA llena los campos para que el elemento los confirme. | Elemento, servicio de IA | **Nuevo.** |
| RF-16 | Generar un resumen del parte para compartirlo por WhatsApp. | Usuario, servicio de IA | **Nuevo.** |
| RF-17 | Mostrar el parte enviado en solo lectura a quien lo llenó, salvo que se lo devuelvan. | Sistema | **Nuevo.** |

## 3. Requerimientos no funcionales

| ID | Requerimiento | Estado en la v3 |
|---|---|---|
| RNF-01 | El parte se captura y se guarda sin conexión a internet. | Se mantiene. El dictado, el mapa y la búsqueda de direcciones sí necesitan internet (pregunta 6). |
| RNF-02 | Llenar el parte no toma más tiempo que en papel. | Se mantiene. El dictado ayuda a cumplirlo. |
| RNF-03 | La descripción no sale del dispositivo sin autorización de la institución. | Se mantiene, pero choca con mandar el audio a una IA externa y con el resumen por WhatsApp (pregunta 6). |
| RNF-04 | Funciona en los teléfonos que el personal ya trae. | Se mantiene. |
| RNF-05 | El sistema no guarda datos biométricos: la huella se verifica en el teléfono. | Se mantiene. |
| RNF-06 | Nada de lo que llena la IA entra a la hoja sin la confirmación del elemento. | **Nuevo.** |
| RNF-07 | El audio se borra en cuanto se transcribe. | **Nuevo.** |
| RNF-08 | El resumen para WhatsApp no forma parte del documento oficial y no se guarda. | **Nuevo.** |
| RNF-09 | Cada número de empleado identifica a una sola persona. | **Nuevo.** |

## 4. Límites: lo que no entra

- **Acceso en equipo compartido** (QR y confirmación en el teléfono). Se
  elimina: cada elemento usa su propio celular.
- **Alta de credencial con código de un solo uso.** La reemplaza el alta
  que hace Administración (RF-11).
- **Administrar elementos por el encargado.** Los permisos los da
  Administración (RF-12).
- **Papelería** (entrega por lote del turno). Cada parte se envía uno por
  uno cuando lo firma el revisor.
- **Resguardo de 10 años y pantalla de Archivo.** Solo se guarda el sello
  SHA-256. Los partes no se borran del sistema; el control de vencimientos
  y la destrucción autorizada por sindicatura quedan fuera.
- **Croquis generado por IA a partir del texto.** Lo reemplaza el croquis
  sobre mapa (RF-04 y RF-05).
- **Siguen fuera, como en la v1:** estadísticas, la conexión con el C-5 o
  el 911, y el FRAP de los paramédicos.

## 5. Documentos que esta versión deja atrás

No se editan: se quedan como registro de cómo llegamos aquí. Lo que
contradigan, lo resuelve este archivo.

| Documento | Qué tiene | Qué cambia con la v3 |
|---|---|---|
| `1-primera-version/docs/avance-proyecto-1.docx` | RF-01 a RF-10 y RNF-01 a RNF-05 (Tablas 3 y 4) | RF-01, 04, 05, 07 y 09 cambian; se agregan RF-11 a RF-17 y RNF-06 a RNF-09. |
| `1-primera-version/docs/arquitectura-informacion.pdf` | Alcance (sección 1.3) y rutas por RF (Tabla 3) | Salen `/acceso/estacion`, `/registro` y `/direccion/archivo`. |
| `1-primera-version/investigacion/Datos-documentos/mapeo-requerimientos.md` | 10 requisitos de la investigación con prioridad | El #8 (resguardo de 10 años) queda fuera del prototipo. |
| `1-primera-version/manifest.json` y `README.md` | Qué RF cubre cada pantalla | Acceso compartido y alta de credencial ya no existen. |
| `2-segunda-version/README.md` | Los 6 puntos que faltaban frente a la v1 | Quedan decididos en la sección 1 de este archivo. |
| `2-segunda-version/consistencia-datos.md` | Papelería fuera de alcance | Papelería se elimina. |
| `3-ACTO 2/4-Roadmap-6-hitos/Roadmap_6_hitos.pdf` | Qué entra en cada hito | El hito 5 ya no lleva "firma con credencial" sino trazo + huella o PIN. |

## 6. Preguntas abiertas

Cosas que las decisiones no cubren todavía. Cada una trae una propuesta
para discutir; la columna de decisión se llena en la junta.

| # | Pregunta | Propuesta | Decisión |
|---|---|---|---|
| 1 | ¿Cómo firman el propietario y el testigo? No tienen usuario, así que la regla 1:1 no les aplica. | Firman en trazo en el momento, en el celular del bombero, sin PIN. | |
| 2 | Si un usuario actualiza su firma, ¿cambian sus partes viejos? | No. Al firmar se guarda una copia del trazo dentro del parte, no un enlace a la firma actual. Si no, el hash dejaría de coincidir. | |
| 3 | ¿Qué entra exactamente en el hash? | Los datos del parte, las dos firmas, las fotos y el croquis, siempre en el mismo orden. Más un botón "Verificar sello" en Administración. | |
| 4 | ¿Cómo se guardan y recuperan contraseñas y PIN? | Con bcrypt, no con SHA-256. Cambio obligatorio la primera vez, Administración la restablece, bloqueo tras varios PIN equivocados, y al dar de baja se desactiva al usuario en vez de borrarlo. | |
| 5 | ¿Qué pasa si el encargado llena el parte? ¿Puede el revisor editarlo? | Lo revisa otro revisor de la división; nadie firma como autor y revisor del mismo parte. El revisor no edita: firma y envía, o devuelve con nota. | |
| 6 | ¿Qué hace la IA sin señal, y cómo se cumple el RNF-03? | Se graba en el celular y se transcribe al recuperar la señal (el audio vive en el celular solo hasta entonces). Avisar que el audio se procesa fuera y quitar nombres y teléfonos del resumen. | |
| 7 | ¿Cómo se manda el resumen por WhatsApp? | Con el botón "Compartir" del celular o un enlace wa.me. La API oficial pide cuenta de negocio y tiene costo. | |
| 8 | ¿Huella o PIN? | PIN obligatorio y huella opcional. La huella en web necesita WebAuthn y HTTPS. | |
| 9 | ¿Sigue el parte multijugador del hito 4? | | |
| 10 | ¿Siguen Lista de asistencia, Notas y Revisión mecánica? | | |
| 11 | ¿Sigue la copia en PDF para la estación (mapeo #2, hito 5)? | | |
| 12 | ¿"Administración" es la misma "Dirección" de la v1 y la v2? | Usar un solo nombre en pantallas, base de datos y documentos. | |

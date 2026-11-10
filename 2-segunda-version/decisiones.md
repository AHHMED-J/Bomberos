# Decisiones para el hito 4 en adelante

Tomadas el 22 de octubre de 2026, antes de empezar el Functional Prototype
(hito 4 del [roadmap](../3-ACTO%202/4-Roadmap-6-hitos/Roadmap_6_hitos.pdf)).
Cierran los pendientes de este mismo [README](README.md) («qué de los 6
puntos se recupera» y «¿se reutiliza el stack?») y lo que la
[Ficha de Experimento](../Acto%20III%20-%20Ficha%20de%20Experimento.pdf)
pide que exista desde el hito 4.

## Arquitectura

| Tema | Decisión | Por qué |
|---|---|---|
| Stack | Se reutiliza `1-primera-version/app/`: Node, Express, EJS y MySQL | Ya tiene roles, bandeja, sellado, resguardo y 29 pruebas. El roadmap lo da por hecho. |
| Sincronización | **Socket.IO** sobre el mismo Express, una sala por parte | Reconecta solo y cae a polling cuando la señal es mala. Los datos se quedan en MySQL, que es lo que pide el resguardo legal. |
| Dos personas en el mismo campo | **Último en escribir gana, con aviso** al que perdió su texto para que lo recupere | Nadie bloquea a nadie, igual que en el Funky. Cada cambio queda en la bitácora (ver abajo), así que nada se pierde de verdad. |
| Sin señal | **Cola local y reenvío** al reconectar, con un indicador de «sin conexión, se enviará después» | En zona rural la app tiene que seguir sirviendo. El borrador en `localStorage` del CFP ya hace la mitad. Una PWA offline completa queda para después. |
| Frontend | **EJS + JS vanilla con módulos ES**. Sólo la Hoja de incidente lleva JS de cliente | Se reutilizan `parte.js`, `evidencia.js` y `funky.js` casi tal cual. Lo demás de v1 ya funciona con formularios. La página llega dibujada y pesa poco (la meta de la Ficha es cargar en < 2 s). Se reconsidera React o Vue en el hito 6 si los cuatro documentos terminan siendo multijugador. |
| Hosting de prueba (hitos 4 y 5) | **Railway o Render**, con despliegue desde GitHub | HTTPS automático, que hace falta para la credencial, la cámara y la ubicación. Aguanta las dos semanas de la prueba A/B. |
| Hosting de producción (hito 6) | **Se decide con la Dirección** | Es dato oficial con resguardo de 10 años. Probablemente tiene que vivir en infraestructura del Ayuntamiento o con un contrato a su nombre. |

## Personas y permisos

| Tema | Decisión |
|---|---|
| Roles | **Rango real + permiso por división.** Cada usuario tiene su rango (bombero, maquinista, jefe de turno…) y, aparte, un permiso Editor o Revisor por división, que es lo que maneja «Administrar elementos». Dirección es un permiso global. |
| Quién manda en un parte | **El encargado que lo creó**: presiona Llegada y Regreso, firma y envía. Puede pasarle el mando a otro de los unidos si se tiene que ir. |
| Reparto de secciones | **Libre con presencia**, como el Funky: cada quien entra a la sección que quiera y ve dónde están los demás. |
| Acceso | **Credencial WebAuthn** (huella o PIN del teléfono), como dibuja `docs/screens/acceso.html`. Respaldo: código de un solo uso que da la Dirección si alguien cambia o pierde el teléfono (ya existe en v1 como `codigo_alta`). No hay contraseñas. |
| Firma | El **encargado firma con su credencial**: sello digital ligado a su matrícula. **Propietario y testigo** no tienen cuenta y firman **con trazo del dedo**. |

## Qué se recupera de v1

De los 6 puntos de la lista del README:

| Punto | Decisión |
|---|---|
| 1. Autenticación con credencial | **Se recupera** (ver Acceso arriba). |
| 2. Firma con credencial | **Se recupera** para el encargado. |
| 3. Sellado y resguardo de 10 años | **Se recupera.** |
| 4. Bandeja de revisión con nota de devolución | **Se recupera**, filtrada por la división del revisor. |
| 5. Buscar y filtrar para la Dirección | **Se recupera**: texto completo, fecha, tipo, unidad, C-5 y NUC. |
| 6. Detalle del parte para la Dirección | **Se recupera**, con su trazabilidad. |

Además se agrega la **copia en PDF para la estación** (requisito #2 de
`mapeo-requerimientos.md`): cada parte enviado genera un PDF que la
estación puede guardar o imprimir.

**Quedan para el hito 6**, cuando existan los cuatro documentos (no se
descartan):

- Papelería: entrega por lote del turno.
- Exportar a CSV o PDF desde la Dirección.
- La navegación división → turno → fecha de la Dirección.
- Lista de asistencia, Notas y Revisión mecánica. Se definen después del
  hito 5 con lo que costó terminar la Hoja de incidente. Mientras tanto
  sólo se juntan sus formatos en papel.

## Experimento

- **La prueba A/B se programa desde el primer día del hito 4.** Al crear
  un parte se sortea el modo (individual o multijugador) y se guarda en el
  parte. Al enviarlo se guarda el tiempo activo, medido como en el CFP
  (huecos de más de 30 s cuentan 30 s).
- El feature flag `enable_parte_multijugador` vive en la base de datos, no
  en el código, para que el kill switch se active sin volver a desplegar.
  Al apagarlo, el parte en curso se conserva y sigue en modo individual.

## Cambios que implica en `schema.sql`

Se harán en la copia que use el hito 4. `1-primera-version/` se queda
congelada.

- `parte.hora_llegada TIME NULL`: la escribe el botón Llegada junto con
  `latitud` y `longitud`, que ya existen.
- `parte.modo ENUM('individual','multijugador')` y
  `parte.seg_activo INT UNSIGNED NULL`, para el experimento.
- `parte.elaboro_id` pasa a significar «encargado actual». Si se transfiere
  el mando, la bitácora conserva quién lo creó.
- `usuario.rol` se reemplaza por un catálogo `rango` más una tabla
  `permiso (usuario_id, division_id, tipo ENUM('editor','revisor'))`, y un
  `usuario.es_direccion` para el permiso global.
- `parte_personal.unido_en DATETIME NULL`: quien se une al parte aparece
  en «Personal de turno» (`NULL` = agregado a mano).
- Tabla nueva `parte_cambio (parte_id, campo, valor, usuario_id,
  version, en)`: la bitácora por campo. Sirve para el aviso de «último
  gana», para demostrar que no se perdieron datos (criterio del hito 4 y
  guardarraíl de la Ficha) y como trazabilidad.
- `firma.nombre VARCHAR(160) NULL`: el nombre del propietario o testigo,
  que no tienen `usuario_id`.
- `revision.paso`: los cuatro pasos de v1 se reemplazan por las secciones
  de la hoja v2.
- Tabla nueva `bandera (nombre, activa)` para el feature flag.

## Pendientes antes de programar

En este orden:

1. [ ] **Correr las pruebas de tiempo del CFP** con 5 personas o más. Es
       el criterio del hito 1 (mediana de ~60 s), que todavía no tiene
       evidencia, y es la línea base del grupo A. Guardar el CSV
       anonimizado en `3-ACTO 2/1-CFP/`.
2. [ ] **Conseguir los formatos en papel** en la estación: Hoja de
       incidente, Lista de asistencia, Notas y Revisión mecánica, uno en
       blanco y uno lleno con los datos tachados. Comparar la Hoja campo
       por campo contra `docs/screens/hoja-incidente.html` antes de
       cerrar el esquema.
3. [ ] **Preguntas para el Capitán González Navarro:**
       - ¿Cuál es la lista real de rangos?
       - ¿Qué rangos validan partes en cada división? El experto mencionó
         jefe de batallón, jefe operativo y coordinador.
       - ¿Quién es el encargado de un parte cuando sale más de una unidad?
4. [ ] **Preguntas para la Dirección:**
       - ¿Dónde viviría la versión de producción?
       - ¿Quién entrega los códigos de alta?
       - ¿Qué artículos del reglamento van en `fundamento_normativo`? Hoy
         dicen «POR DEFINIR».
       - ¿Hace falta un aviso de privacidad? Se capturan datos de
         propietarios y testigos.
5. [ ] Crear el proyecto en Railway o Render con MySQL y HTTPS.
6. [ ] Aplicar los cambios al esquema y empezar el hito 4.

## Cambios del 8 de noviembre de 2026

Se agregan después de la nota legal (el multijugador no va en producción) y
de definir el dictado por voz. Donde chocan con lo de arriba, mandan estos.

| Tema | Decisión |
|---|---|
| Plataforma | **App móvil para iOS** (no se publica, se instala en los teléfonos del equipo para mostrar avances al profesor) y **página web sólo para Dirección**, que no genera partes. Corrige la versión anterior de este día, que suponía PWA en Safari. Hay que confirmar el framework (el texto del dictado decía Flutter) y si hay cuenta de Apple Developer de pago, porque sin ella iOS no permite passkeys en una app nativa. |
| Dictado | La pestaña «Con voz» de la Hoja graba en el navegador y manda el audio a un servicio con Whisper large-v3 (GPU, aparte de Express). El texto vuelve como **BORRADOR** y no entra a la hoja hasta que el bombero lo confirma. Ver pantallas V1 a V8 en Figma. |
| Audio | **Se borra apenas se transcribe**, no al confirmar. Quedan el borrador y el texto final. Pendiente confirmarlo con la Dirección. |
| Envío | El servidor rechaza un parte con algún dictado sin confirmar, no sólo la pantalla. |
| Firma del revisor | El revisor (capitán o encargado de turno) **firma con su credencial** (huella, PIN o cara) **y además con trazo del dedo**. Las dos firmas entran al sello. |
| Experimento A/B | Pasa a **teclado contra dictado**, porque la variante ganadora sí puede ir a producción. `parte.modo` queda como `ENUM('teclado','dictado')`. El multijugador, si se llega a probar, es un tercer grupo sólo de prototipo. Hay que avisarle al profesor porque cambia la hipótesis de la Ficha. |

### Cambios al esquema por esto

- Tabla `dictado (id, parte_id, campo, usuario_id, duracion_s, texto_borrador, texto_final, estado, creado_en)`. `estado`: pendiente, transcrito, confirmado, descartado. No lleva ruta de audio porque se borra.
- `firma`: el revisor también tiene `tipo` de firma (credencial y trazo).
- `parte.modo` cambia de `individual/multijugador` a `teclado/dictado`.

### Pendientes nuevos

- [ ] Dónde corre la GPU del prototipo (Railway y Render no dan GPU).
- [ ] Avisar al profesor del cambio de hipótesis del experimento.
- [ ] Preguntar a la Dirección si el audio puede salir a un servidor de terceros y si se borra al confirmar.
- [ ] Probar el dictado y WebAuthn en un iPhone real, en Safari y en pantalla de inicio.
- [ ] Dibujar en Figma la pantalla de firma del revisor (credencial más trazo).
- [ ] Replantear los hitos 4 y 5 del roadmap sin multijugador.

### Dictado del parte completo con IA (nuevo, 8 de noviembre)

- El bombero dicta **todo el parte** y un **segundo modelo** acomoda la información en los campos de la hoja. Lo que no mencionó se completa a mano.
- Cada campo llenado por la IA se marca *Entendido*, *Revisar* o *Falta*. Nada entra a la hoja hasta que el bombero confirma.
- Si falta información y no la tiene en ese momento, el parte queda **en progreso en el teléfono** (almacenamiento local) para continuar luego.
- El mismo modelo genera un **resumen informal** para copiar y mandar a grupos de WhatsApp. No es parte del documento oficial ni se guarda.
- El revisor es el **capitán (encargado de turno)**. Cada revisión le pide huella, PIN o cara antes de usar su firma de trazo guardada.
- Dirección tiene **versión web de escritorio**: Partes, Detalle, Administrar elementos y Experimento (pantallas W1 a W4).
- Servicio de IA del prototipo: Colab y, en el peor caso, la Mac del equipo. Los dos modelos pueden vivir en el mismo servicio.

Pendientes: validar con el Capitán qué campos acepta que llene una IA; probar con audios reales si el modelo de llenado acierta; definir qué hace el bombero si pierde el teléfono con un parte en progreso.

### Aclaraciones del mismo día (tarde)

- **La app móvil es nativa, no se usa Safari.** El permiso de micrófono es el del sistema; si se niega, la pantalla V7 manda a Ajustes de iOS.
- **La web es sólo para Dirección** (consulta, administración, experimento). El frontend EJS de v1 sólo aplica a esa web; la app necesita una **API JSON** sobre el mismo Express.
- **Segundo audio:** suma, no resta. La IA interpreta si corrige algo anterior y lo muestra como *Corregido* con el valor previo (pantalla G6); nada se borra sin confirmar.
- **Dictado abierto a todos:** cualquier bombero puede dictar, sin restringir por rango.
- Pendiente: confirmar framework de la app, cuenta de Apple Developer y cómo se haría la firma con credencial (ver pregunta abierta al usuario).

### Framework y firma de la app (8 de noviembre, noche)

Sin cuenta de Apple Developer de pago (el equipo no la va a comprar) y sin framework definido.

| Tema | Decisión |
|---|---|
| Framework de la app | **Flutter** (recomendado). Alternativa: React Native con Expo si el equipo ya domina JavaScript y quiere evitar Xcode. Si alguien del equipo ya sabe uno, se elige ese. |
| Instalación | Xcode y Apple ID gratis desde la Mac. La app caduca cada 7 días: reinstalar antes de cada demo. |
| Firma en la app | **Llave en el chip seguro del iPhone**, protegida con Face ID o huella. La privada no sale ni se sincroniza con iCloud. Servidor guarda la pública. Entrar: reto al azar. Firmar parte: reto = hash del contenido. Sustituye a la passkey de WebAuthn, que en app nativa exige cuenta de pago. |
| WebAuthn estándar | Queda en la **web de Dirección** (navegador de escritorio, passkeys reales, HTTPS y dominio fijo; `localhost` sirve para pruebas). |
| Cambio de teléfono | La llave se pierde con el teléfono; se necesita un código de alta nuevo de la Dirección. Pregunta abierta: qué pasa con partes en progreso locales. |
| Datos | Tabla de credenciales con `tipo ENUM('enclave','webauthn')` y llave pública. Partes en progreso y audios por enviar en SQLite local del teléfono. |
| Servidor | Express suma una **API JSON** para la app; EJS queda sólo para la web de Dirección. |

Pendientes: verificar qué paquete de Flutter crea llaves en el chip seguro y firma con biometría; decidir si agregar otra cara o huella invalida la llave.

### Prueba de la llave en el chip seguro (8 de noviembre, noche)

- `probandoFlutter/` tiene la app mínima y un servidor de prueba en Node (sin dependencias). **Todavía no se probó en un iPhone**: sólo pasó `flutter analyze`.
- El paquete `biometric_signature` (13.3.0) sí crea llaves ECDSA P-256 en el Secure Enclave y firma con Face ID. Su documentación indica que, por defecto, **agregar o quitar una cara o huella invalida la llave** (se puede desactivar con `setInvalidatedByBiometricEnrollment: false`).
- Si la llave se invalida, la app debe crear una nueva y registrarla otra vez con un código de alta nuevo: sumar a la pregunta abierta del cambio de teléfono.

### El dictado es un botón flotante de la Hoja (8 de noviembre, noche)

- **No hay pestaña «Escribir / Con voz».** Un botón «Dictar» queda fijo en la pantalla mientras se baja por la hoja. Así el bombero ve las casillas y sabe qué decir.
- Mientras graba, un panel inferior muestra el tiempo, la onda y **qué falta mencionar** (campos aún vacíos), sin tapar las casillas de arriba. Las casillas vacías llevan una sugerencia («Di: unidad E7, estación 3»).
- Después, los campos quedan marcados in situ como *Entendido*, *Revisar* o *Falta*, y una barra inferior ofrece «Dictar más» y «Confirmar».
- Se quitó la pestaña de E4, E5 y P2 en Figma. Las pantallas D1 a D8 (sección 6) reemplazan a V1 a V8 y a G1 a G3.

### Esqueleto de la app (9 de noviembre)

Se creó `app-bomberos/` con datos de ejemplo y **sin IA real** (sólo los enchufes):

- `movil/`: app Flutter sólo iOS (`mx.edu.uabc.bomberos_parte`) con las pantallas de Figma por rol (acceso, hoja, dictado D1–D8, G4–G6, envío y firma, bandeja y validación C1–C3). Riverpod, go_router y SQLite local. Selector de rol en Depuración. Guarda modo (`teclado`/`dictado`) y tiempo activo para la prueba A/B.
- `servidor/`: API de prueba en Express (puerto 3100, datos en memoria). `/api/ia/*` responde JSON fijo marcado `TODO(IA)`; contratos en `servidor/CONTRATOS-IA.md`.
- `estructura-app.html`: mapa visual de pantallas, arquitectura, dictado, carpetas, firma, estado y enchufes de IA.
- El multijugador no se implementó (fuera de producción).

### Quién es quién: «Elaboró» y Capitán (10 de noviembre)

«Encargado» se usaba para dos cosas distintas y se confundía con el «encargado de turno». Se separan:

| | Quién es | Qué puede hacer |
|---|---|---|
| **Elaboró** (antes «Encargado del parte») | El Editor que **creó ese parte**. No es un rol ni un permiso: es una condición de cada parte (campo `elaboro_id`, igual que en v1). | Llegada, Regreso, firmar con credencial, Enviar y reenviar si lo devuelven. |
| **Capitán** (= encargado de turno = Revisor) | Rango con permiso Revisor por división. | Ver la bandeja, validar o devolver con nota, firmar con credencial y trazo. No crea partes. |

- En la app sólo hay dos roles: **Editor** y **Capitán**. Se quitó `Rol.encargado` del código y del servidor; en Figma «Encargado» pasó a «Elaboró» / «quien elabora».
- Otros Editores pueden ver la hoja pero no presionan Llegada/Regreso ni envían.
- **Folio `PE-AAAA-NNNN`:** viene de v1 (`siguienteFolio()` en `1-primera-version/app/src/parte.js`): año y consecutivo de 4 dígitos. En el esqueleto el consecutivo es de ejemplo. El repositorio no define qué significan las letras «PE».

### Cambios de pantalla pedidos (10 de noviembre)

- Login sin los dos textos explicativos.
- Mis documentos ya no lista qué campos faltan; sólo el contador «Faltan N» y la barra.
- En la hoja se quitó el aviso «Faltan: …». Los campos obligatorios vacíos se marcan con borde rojo.
- Se quitó la etiqueta «Auto» y la casilla «Hora de llegada» (queda el botón Llegada, que guarda la hora).

### IA local en la Mac (10 de noviembre)

Mientras no se resuelva si el audio puede salir a Colab, las dos IAs corren **en la Mac del equipo** (detalle y comandos en `app-bomberos/ia-local/README.md`).

| | Decisión | Por qué |
|---|---|---|
| IA 1 · transcripción | Whisper large-v3 con whisper.cpp (`whisper-server` en 127.0.0.1) | Corre con Metal: ~1.8 s por 10 s de audio. Modelo fuera del repo. |
| IA 2 · llenado y resumen | `qwen2.5:14b` en Ollama | En 10 casos ficticios no inventó nada; `gemma3:12b` inventó una descripción y tardó más. |
| Quién decide | El modelo **propone**; reglas fijas en `llenado.js` **verifican** | La evidencia debe estar literal en el dictado; con negaciones, nombres o lugar el campo queda en «revisar»; las opciones deben estar dichas, no deducidas. |
| Acceso | Cabecera `X-Clave-Local` o sesión válida | La clave está sólo en `servidor/.env` (ignorado por git) y llega a la app con `--dart-define`. |
| Datos sensibles | El audio se borra siempre; los logs sólo guardan métricas; el resumen quita propietario, testigo y teléfonos | Aplica la decisión del 8 de noviembre: el audio se borra después de cada transcripción. |

Resultados con voz sintética y casos ficticios: IA 2 sola 31/32; de audio a campos 30/32; 0 valores inventados y 0 negaciones perdidas. **No sirven todavía como resultado del experimento**: falta medir con dictados reales de bomberos (ruido, radio, acento) antes de la prueba A/B teclado contra dictado.

> Recordatorio: el parte multijugador no va en producción (por temas legales). Esto tampoco es producción: es una demo local para el profesor.

### Micrófono real en la app (10 de noviembre)

- La app graba con el paquete `record` 7.1.2: AAC en m4a, 16 kHz, mono, 32 kbps (unos 240 KB por minuto), que es el formato que espera Whisper.
- El audio no se queda en el teléfono: se graba en la carpeta temporal, al detener se lee a memoria y el archivo se borra. Si no hay señal, se guarda en SQLite hasta enviarlo (esto ya estaba decidido el 8 de noviembre). Si la app se cierra a mitad de una grabación, los restos se borran en la siguiente.
- Límite: la grabación se detiene sola a los 175 s, porque el servidor rechaza más de 180 s. Los errores `audio_muy_largo` y `audio_ilegible` se muestran en la pantalla D6 con su motivo.
- Para probar sin micrófono está el interruptor «Micrófono simulado» en Depuración.
- Probado en el simulador con el micrófono de la Mac: el m4a es válido, no queda en disco y el servidor lo lee. **Falta probarlo en un iPhone con un dictado real.**

### Resguardo de 10 años descartado (10 de noviembre)

- La segunda versión **no** incluye el resguardo de 10 años de la v1 (`archivo.resguardo_hasta` ni la pantalla de Archivo con los vencidos). Se quitó de los pendientes.
- Se mantiene la huella SHA-256 del contenido, que va dentro de la firma del Capitán al validar (pantalla C3).

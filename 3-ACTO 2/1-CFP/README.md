# Hito 1 · Critical Function Prototype (CFP)

**Pregunta que responde:** ¿se puede levantar y enviar un parte con los
campos mínimos y 1 foto desde el celular en 60 s o menos?

Sale del requisito #9 de
`1-primera-version/investigacion/Datos-documentos/mapeo-requerimientos.md`:
si capturar el parte es más lento que mandar un WhatsApp, el personal no lo
va a adoptar, y entonces lo demás (firma, archivo, permisos) da igual.

## Cómo se usa

1. Abre `index.html` en el navegador (doble clic basta).
2. En el panel de prueba escribe el nombre del participante y lee el
   escenario ficticio.
3. **Nuevo parte.** El cronómetro de la fase 1 arranca con el primer toque
   dentro del parte, no antes: leer el escenario no cuenta.
4. En el lugar: **Llegada**, foto, lo que alcance, y
   **Guardar y continuar después** (o enviar ahí mismo).
5. En la estación: **Continuar el parte**, **Regreso**, terminar y **Enviar**.
6. **Descargar CSV** al final de la sesión.

## Qué decidimos

- **Campos mínimos (obligatorios):** No. C-5, tipo de servicio, lugar
  (escrito o la ubicación registrada), descripción y al menos 1 foto.
- **Se llena solo:** fecha, unidad, turno, estación y personal de turno
  (perfil simulado: usuario 1 del seed).
- **Dos botones arriba del parte:**
  - **Llegada:** escribe la hora de llegada y el lugar del servicio, con la
    dirección (OpenStreetMap, requiere internet) o, si no se encuentra,
    con las coordenadas.
  - **Regreso:** escribe la hora de regreso.
  La hora de salida se escribe a mano.
  Las horas se reemplazan cada vez que se presiona el botón; el lugar
  nunca reemplaza algo escrito a mano.
- **Hora de llegada:** campo nuevo, no está en la hoja de la v2. Si el CFP
  lo valida, hay que agregarlo también al diseño y a la base de datos.
- **Horas:** se teclean sólo los dígitos en formato de 24 h (`0230`). El
  campo pone los dos puntos y, al completar los minutos, pasa solo al
  siguiente campo (salida → llegada → regreso → unidad).
- **Pantalla limpia:** el parte sólo tiene etiquetas, campos y botones,
  como la app real. Lo poco que hay que explicar (botones, formato de
  horas, qué se llena solo, qué queda fuera) está en la columna «Guía del
  parte», fuera del teléfono.
- **El resto de secciones** está en el mismo orden que la hoja de la v2,
  todas opcionales. Firma con credencial y croquis quedan fuera del CFP.
- **Envío simulado:** el parte no sale del dispositivo (sólo las
  coordenadas, para buscar la dirección). El borrador y los
  intentos viven en `localStorage`.

## Cómo se mide el tiempo

Se cuenta el **tiempo activo**: el tiempo entre una interacción con el
parte y la siguiente. Si pasan más de 30 s sin tocarlo (teléfono guardado,
pantalla bloqueada, atendiendo la emergencia), ese hueco cuenta sólo 30 s.
Así se mide lo que cuesta capturar, no lo que dura el incidente; tomar una
foto con la cámara cabe en ese margen. El tiempo con la página cerrada no
cuenta.

El borrador se guarda solo con cada cambio. Si la página se recarga o se
cierra a media fase, al abrirla se continúa en la misma fase.

## Qué mide cada intento (columnas del CSV)

| Columna | Qué es |
|---|---|
| `seg_lugar`, `seg_estacion`, `seg_total` | Segundos activos en cada fase (ver «Cómo se mide el tiempo») |
| `enviado_desde` | `lugar` si se envió sin guardar, `estacion` si se retomó |
| `boton_llegada`, `boton_regreso` | Hora en que se presionó cada botón (vacío si no se usó) |
| `ubicacion_registrada`, `precision_m` | Si el botón «Llegada» obtuvo la ubicación y con qué precisión |
| `inicio` | Fecha y hora local en que se abrió el parte |
| `fotos` | Fotos adjuntas |
| `campos_totales`, `campos_llenos` | Campos del parte y cuántos tenían algo |
| `campos_autollenados`, `campos_escritos` | Cuántos se llenaron solos (y no se cambiaron) contra cuántos escribió la persona |
## Estructura

    index.html        panel de prueba · el parte (teléfono) · guía del parte
    css/cfp.css       estilos (usa tokens.css y base.css de la v2)
    js/almacen.js     localStorage
    js/base.js        perfil simulado, estado y utilidades de fecha
    js/cronometro.js  un cronómetro por fase
    js/parte.js       filas, autollenado, guardar/restaurar, validación
    js/evidencia.js   ubicación + hora, fotos
    js/intentos.js    tabla de intentos y CSV
    js/app.js         el flujo y el arranque

Los scripts son clásicos (no módulos) para que funcione desde `file://`;
el orden en que los carga `index.html` importa.

## Límites

- Mientras se procesa una foto o se busca la ubicación (sin lugar
  escrito), «Enviar» dice «Procesando…» y espera.

- En el celular la cámara y la ubicación sólo funcionan si la página se
  sirve por `https` o `localhost`, no abriendo el archivo.
- En la computadora la foto se elige de un archivo, no de la cámara.

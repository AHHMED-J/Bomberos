# Prototipo navegable · Parte Digital

Implementación del sitemap y la base de datos del documento de arquitectura
de la información (`docs/arquitectura-informacion.pdf`). Node + Express +
EJS del lado del servidor + MySQL.

La maqueta publicada (`docs/`) no se toca: este prototipo la lee.

## Cómo correrlo

Hace falta **Node 18 o mayor** y **MySQL 8** corriendo en local.

```sh
cd app
npm install
cp .env.example .env     # y pon ahí tu usuario y contraseña de MySQL
npm run db:crear         # crea la base y la llena con datos de ejemplo
npm start                # http://localhost:3000
```

Y para comprobar que todo funciona, con el servidor ya levantado:

```sh
npm run probar           # recorre el flujo completo · 29 comprobaciones
```

Los dos scripts están explicados más abajo, en las decisiones.

## Usuarios de prueba

No hay contraseñas: en `/acceso` se elige con quién entrar. El menú de
arriba cambia según el rol.

| Nombre | No. | Rol | División | Ve |
|---|---|---|---|---|
| Jalife Burgueño, Ahhmed | 376285 | bombero | Estructural | Inicio · Nuevo parte · Consulta |
| Acevedo Carrillo, Verónica | 380207 | bombero | Estructural | lo mismo |
| Rivera Chávez, Josselyn Alexa | 379219 | revisor | Estructural | Bandeja · Consulta |
| Tamayo Salcedo, Elias | 376290 | revisor | Rescate urbano | Bandeja · Consulta |
| Cornejo Escobar, Arturo | 365239 | dirección | — | Partes · Archivo · Personal |

Hay un sexto usuario sin credencial ("Bombero de nuevo ingreso") para probar
`/registro`. Su código de alta es **4F2K9**, el mismo que dibuja el mockup.

## La demo del task flow completo

Es el Flujo 3 combinado con el 1 (figuras 3 y 5). Once pasos:

1. `/acceso` → entra como **Jalife Burgueño, Ahhmed** (bombero).
2. Cae en `/partes`, la Johnson Box: arriba el parte devuelto, abajo el
   borrador a medias.
3. **Levantar reporte de salida** → se crea un parte en estado `borrador` y
   la URL ya tiene su id: `/partes/11/datos`.
4. Llena el paso 1 con **Incendio estructural** (división Estructural) y
   continúa. Cada paso se guarda al pasar al siguiente.
5. Paso 2: agrega a alguien del personal de turno y captura al propietario
   con su teléfono.
6. Paso 3: escribe la descripción y aprieta **Generar croquis**.
7. Paso 4: marca si requiere peritaje, guarda el cierre y **Firmar con
   huella o PIN**.
8. Sale el comprobante con el folio y a qué revisor le llegó.
9. Cierra sesión y entra como **Rivera Chávez, Josselyn Alexa** (revisora de
   Estructural). El parte está en su bandeja; el de Tamayo no lo ve, porque
   es de otra división.
10. Ábrelo: arriba el Qué, Cuándo, Dónde y Quién, luego la revisión
    automática de campos vacíos y los dos botones.
    - **Devolver con nota** → vuelve a la Johnson Box del bombero y al
      abrirlo lleva al paso que le dijiste.
    - **Validar** → se sella el documento en `almacen/`, se guarda su hash
      SHA-256 y `resguardo_hasta` = fecha del servicio + 10 años.
11. Entra como **Cornejo Escobar, Arturo** (Dirección): el parte está en
    `/direccion/partes` con su trazabilidad, y en `/direccion/archivo` se
    ven los resguardos ya vencidos.

## Rutas

Las de la Tabla 3 del documento. La columna de la derecha dice de qué
pantalla de `docs/screens/` salió cada vista.

| Ruta | Pantalla | Sale de |
|---|---|---|
| `/acceso` | Acceso | `acceso.html` |
| `/registro` | Alta de credencial | `registro-credencial.html` |
| `/acceso/estacion` | Equipo compartido | `acceso-compartido.html` |
| `/partes` | Inicio · Mis partes | **nueva** (Figura 6) |
| `/partes/nuevo` → `/partes/:id/datos` | 1 Datos del servicio | `formulario.html` |
| `/partes/:id/personas` | 2 Personas y apoyos | **nueva** |
| `/partes/:id/croquis` | 3 Descripción y croquis | `croquis.html` + `croquis-sin-respuesta.html` |
| `/partes/:id/firma` | 4 Cierre y firma | `resumen-firma.html` + cierre **nuevo** |
| `/partes/:id/enviado` | Envío confirmado | `envio-confirmado.html` |
| `/revision` | Bandeja de revisión | `bandeja.html` |
| `/revision/:id` | Revisar parte | `bandeja-detalle.html`, reordenada (Figura 7) |
| `/consulta` | Consulta | `panel-direccion.html` |
| `/direccion/partes` | Partes | `panel-direccion.html` |
| `/direccion/partes/:id` | Detalle del parte | `panel-detalle.html` |
| `/direccion/archivo` | Archivo | **nueva** |
| `/direccion/personal` | Personal | **nueva** |

Las cinco pantallas nuevas son las que el documento pide y los mockups no
tenían: Inicio · Mis partes, el paso 2, el cierre del paso 4, Archivo y
Personal.

**Una diferencia deliberada con la Tabla 3:** ahí la única pantalla de
detalle es `/direccion/partes/:id`, que es de la Dirección. Como el bombero
y el revisor también necesitan abrir lo que consultan, los renglones de
`/consulta` llevan a una pantalla que ya existe en vez de a una nueva:

- el **bombero**, a `/partes/:id/enviado` (su comprobante) si el parte ya
  salió de sus manos, o a `/partes/:id/datos` si sigue en borrador o se lo
  devolvieron;
- el **revisor**, a `/revision/:id`. Si el parte ya está validado, esa
  pantalla se muestra sin botones de decisión, así que funciona como vista
  de sólo lectura. Si todavía es un borrador, lo dice y tampoco los dibuja:
  sólo un parte en estado `enviado` se puede validar o devolver.

## Decisiones

### El CSS de la maqueta se sirve, no se copia

`docs/css/` se monta en `/css` como estático de sólo lectura, y encima se
carga `public/css/app-ui.css`, que es lo único propio.

Se eligió así porque `docs/` está congelado (es lo publicado en GitHub
Pages), así que no hay riesgo de que las hojas compartidas cambien bajo la
app, y porque todo lo que el prototipo modifica queda en un solo archivo
que se puede leer de corrido: pantalla completa en vez de la lámina de
402 px, `input`/`select`/`textarea` de verdad con el aspecto de `.control`,
estados de foco y de campo obligatorio vacío, y las pantallas nuevas.

La contra es que `/app` no es autocontenido: depende de `../docs/css`. Para
un prototipo que se corre desde el repo no estorba; si hiciera falta,
copiarlas es un `cp` y cambiar dos rutas en `views/parcial/arriba.ejs`.

Las fuentes se piden a Google Fonts con el mismo `<link>` de la maqueta.
No hay archivos de íconos ni de imágenes: todos los íconos son SVG en línea
(`views/parcial/icono.ejs`).

### Los dos scripts

**`npm run db:crear`** (`scripts/cargar-bd.js`) levanta la base desde cero:
corre `db/schema.sql` y luego `db/seed.sql` con `mysql2`, así que no hace
falta tener el cliente `mysql` instalado ni en el PATH. Es un solo comando y
deja siempre el mismo estado conocido, que es justo lo que se quiere antes
de una demo o de una prueba.

Ojo: `schema.sql` empieza con `DROP DATABASE IF EXISTS parte_digital`. Cada
vez que se corre, borra y vuelve a crear todo.

**`npm run probar`** (`scripts/probar-flujo.js`) recorre el prototipo de
principio a fin y comprueba 29 cosas. No usa navegador: habla con el
servidor por HTTP, igual que lo haría una persona haciendo clic. Cubre el
Flujo 3 combinado con el 1, los permisos por rol y por división, y el
sellado con su hash.

```sh
npm start        # en una terminal
npm run probar   # en otra
```

Sirve para tres cosas: comprobar que un cambio no rompió nada, demostrar el
sistema completo sin hacer un solo clic, y dejar escrito cuál es el
recorrido. Necesita la base recién creada, porque cuenta con los datos de
`seed.sql`.

### Stack

Express con plantillas del lado del servidor y **sin JavaScript de
cliente**, igual que la maqueta. Cada acción es un enlace o un `<form>`, así
que el sitemap de la Figura 1 se ve tal cual en las URLs y el prototipo se
puede recorrer con el historial del navegador. Las consultas van a mano con
`mysql2`, sin ORM, para que se lean igual que en la Tabla 3.

### Base de datos

`db/schema.sql` tiene las 17 tablas de la Figura 2 con sus claves foráneas
y los índices de la Tabla 4 (`idx_parte_estado_fecha`,
`idx_parte_elaboro_estado`, `idx_parte_fecha`, `idx_parte_c5`,
`idx_parte_nuc`, `idx_archivo_resguardo`, el FULLTEXT `ft_parte_texto` y los
UNIQUE de `folio`, `no_empleado`, `credential_id` y `archivo.parte_id`).
Todo InnoDB y `utf8mb4`.

`db/seed.sql` trae datos **ficticios**, sacados de los mockups y de las
figuras 6 y 7 del documento. No se usó nada del formato en papel real.
`fundamento_normativo` va con renglones marcados "POR DEFINIR con la
Dirección": los artículos del reglamento se capturan con ellos, no se
inventan.

## Qué está simulado

Va marcado en el código con la palabra `SIMULADO` y a la vista en la
pantalla, con la etiqueta gris de "Simulado".

| Qué | Cómo está | Qué sí es real |
|---|---|---|
| **Sesión** | Selector de usuario de prueba en `/acceso`, guardado en una cookie. Sin contraseñas. | Cada parte queda ligado a `parte.elaboro_id`, y la bandeja filtra por la división de quien revisa. |
| **Firma WebAuthn** | Un botón "Firmar con huella o PIN". No hay `navigator.credentials`. | El renglón en la tabla `firma` con el `credential_id`, la hora y quién firmó. La tabla `credencial` tiene su forma real: sólo llave pública, nunca la huella (RNF-05). |
| **Croquis** | Reconoce palabras en la descripción y arma un SVG de ejemplo con el trazo del mockup. No entiende la escena, sólo empareja palabras clave (`elementosDe` en `src/croquis.js`). | Si la descripción está vacía sale la pantalla "croquis sin respuesta"; el parte se guarda igual, porque el croquis es opcional. |
| **PDF sellado** | El documento sellado es HTML, no PDF (`views/sellado.ejs`, guardado en `almacen/`). | El hash SHA-256 se calcula sobre el archivo, y `resguardo_hasta` = fecha del servicio + 10 años. Cambiar a PDF es reemplazar `sellar()` en `src/sellado.js`. |
| **Autoguardado** | Se guarda al pasar de paso, no campo por campo, y no hay guardado sin conexión. | El parte se crea como `borrador` al abrirlo, y entrar a `/partes/:id/firma` sin lo obligatorio manda al primer paso incompleto. |
| **Fotos, exportar PDF y CSV, alta de personas nuevas** | No implementados. | — |

## Cómo está armado

```
app/
  db/schema.sql     17 tablas, claves foráneas e índices
  db/seed.sql       datos de ejemplo (ficticios)
  scripts/
    cargar-bd.js    crea la base y la llena
    probar-flujo.js recorre el prototipo y comprueba 29 cosas
  src/
    server.js       rutas, estáticos, manejo de errores
    db.js           el pool de MySQL
    sesion.js       quién entró y el menú por rol
    parte.js        consultas del parte, qué le falta, la búsqueda
    croquis.js      el croquis (simulado, por palabras clave)
    sellado.js      sellar, hashear y fijar el resguardo
    formato.js      fechas, horas y estados en pantalla
    rutas/          acceso · partes · revision · direccion
  views/
    parcial/        el armazón, los pasos y los íconos
    partes/ revision/ direccion/
  public/css/app-ui.css
  almacen/          los documentos sellados (no se versiona)
```

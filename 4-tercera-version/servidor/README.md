# Servidor de la tercera versión

El servidor de la app (`app-bomberos/movil`) para lo que pide la tercera
versión: acceso con usuario y contraseña, firma, revisión y envío, y
sellado. Guarda en MySQL. Node.js y Express 5.

Las rutas de la IA (dictado, llenado de campos y resumen) y la revisión del
parte se cargan tal cual de [`app-bomberos/servidor`](../../app-bomberos/servidor/),
así que el croquis y la IA de la app siguen funcionando igual. Por eso este
servidor necesita que `app-bomberos/` esté en el repo.

## Correrlo

```bash
cd 4-tercera-version/servidor
npm install
cp .env.example .env      # y ajusta los datos de MySQL
npm run db:crear          # crea la base bomberos_v3 y sus tablas
npm run datos-prueba      # los usuarios y partes de ejemplo de la app
npm start                 # puerto 3100, el mismo que usa la app
```

`npm run datos-prueba` deja a cada usuario de ejemplo con la contraseña
`prueba<matrícula>` (por ejemplo `376285` / `prueba376285`).

`app-bomberos/ia-local/correr-app.sh` ya enciende este servidor.

```bash
npm run probar            # prueba de punta a punta (usa la base de .env)
```

`db:crear` no borra nada: si las tablas ya existen, las deja como están. Si
tenías la base de una versión anterior de este servidor, bórrala primero
(`DROP DATABASE bomberos_v3`), porque la tabla `usuario` cambió.

## Lo que hace Dirección

Mientras no exista su página web:

```bash
npm run usuario -- alta 380999 "Apellido, Nombre" [--capitan] [--division "División Estructural"]
npm run usuario -- restablecer 380999
```

- `alta` crea al usuario e imprime la contraseña que se le entrega. Su
  usuario es su número de empleado (la matrícula). `--capitan` lo habilita
  para revisar.
- `restablecer` es para quien olvidó su contraseña: le da una nueva y borra
  la llave de su celular, para que la registre otra vez al entrar.

## Cómo funciona

**Entrar.** Con el número de empleado y la contraseña. El usuario la puede
cambiar desde la app.

**Biometría.** Al entrar con contraseña, la app crea una llave en el chip
seguro del celular y registra aquí la pública. Es una por usuario: si la
cuenta ya tiene una, ese otro celular no se registra y confirma con la
contraseña. Con la llave registrada se puede entrar con la biometría: el
servidor manda un reto y el celular lo firma. La huella y la cara nunca
llegan al servidor.

**Firma.** Cada usuario sube su firma en trazo. Al Enviar (autor) y al
Validar (revisor), el servidor pone en el parte una copia de esa firma. Para
eso el usuario confirma que es él con la biometría de su celular o con su
contraseña, sobre un reto que lleva el hash SHA-256 del contenido del parte.
Un reto vale 5 minutos y una sola vez.

**Revisión y envío.**

- Un parte enviado no se vuelve a enviar, a menos que lo devuelvan.
- Devuelto con nota, quien lo llenó lo corrige y vuelve a firmar.
- Valida un capitán de la división del parte, y nunca quien lo llenó.
- Al validar queda sellado y enviado a Dirección.

**Sellado.** Al validar se saca el SHA-256 de todo el parte, siempre en el
mismo orden: los datos, el número de fotos, lo que trae del croquis, y las
firmas del autor y del revisor con sus trazos. `GET /api/partes/:folio/sello`
lo vuelve a sacar y dice si coincide con el guardado. La app todavía no sube
las imágenes de las fotos ni del croquis; cuando lo haga, entran al sello.

## Rutas

| Ruta | Sesión | Manda | Recibe |
|---|---|---|---|
| `POST /api/acceso/entrar` | no | `no_empleado`, `contrasena` | `token`, `usuario` |
| `POST /api/acceso/reto` | no | `usuario_id` | `reto` |
| `POST /api/acceso/verificar` | no | `usuario_id`, `reto`, `firma` | `token`, `usuario` |
| `POST /api/acceso/llave` | sí | `llave_publica` | `ok` |
| `POST /api/acceso/contrasena` | sí | `actual`, `nueva` | `ok` |
| `POST /api/acceso/trazo` | sí | `trazo` | `usuario` |
| `POST /api/partes/folio` | no | — | `folio` |
| `GET /api/partes?usuario=…` | no | — | `partes` |
| `POST /api/partes/:folio/reto` | no | `contenido` | `reto`, `hash` |
| `POST /api/partes/:folio/enviar` | no | `parte`, `reto`, y `firma` o `contrasena` | `parte` |
| `GET /api/partes/:folio/sello` | no | — | `sello`, `calculado`, `coincide` |
| `GET /api/revision/bandeja?division=…` | no | — | `partes` |
| `POST /api/revision/:folio/devolver` | no | `nota`, `seccion`, `revisor_id` | `parte` |
| `POST /api/revision/:folio/validar` | no | `reto`, `revisor_id`, y `firma` o `contrasena` | `parte` |
| `POST /api/ia/…` | como en `app-bomberos/servidor` | | |

La sesión va en `Authorization: Bearer <token>`. `usuario` trae `id`,
`nombre`, `matricula`, `rango`, `rol`, `division`, `estacion`, `trazo` y
`tiene_llave`. Los errores llegan como `{ "error": "codigo" }`.

Las rutas de partes y de revisión no piden sesión, igual que en
`app-bomberos/servidor`: lo que protege la firma es la confirmación de cada
envío y cada validación.

## Archivos

    src/server.js          arma Express
    src/db.js              conexión a MySQL (filas, fila, ejecutar, transaccion)
    src/datos.js           usuarios, sesiones, partes, firmas y folios en MySQL
    src/firma.js           retos y confirmación (biometría o contraseña)
    src/sello.js           el sello SHA-256 del parte
    src/de-la-app.js       lo que se carga de app-bomberos/servidor
    src/rutas/acceso.js    entrar, biometría, llave, contraseña y trazo
    src/rutas/partes.js    folio, lista, reto, enviar y verificar sello
    src/rutas/revision.js  bandeja, devolver y validar
    db/schema.sql          las tablas
    scripts/               crear la base, datos de ejemplo, usuarios y la prueba

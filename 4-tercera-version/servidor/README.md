# Servidor del parte digital

El servidor de la app (`4-tercera-version/app`): acceso con usuario y
contraseña, firma, revisión y envío, sellado, y las dos IAs (dictado y
resumen, ver [`CONTRATOS-IA.md`](CONTRATOS-IA.md)). Node.js y Express 5.

Los usuarios, las firmas y los partes se guardan en **MySQL**, así que hace
falta tenerlo instalado y prendido en la compu que corre el servidor.

## Prepararlo (una sola vez)

```bash
cd 4-tercera-version/servidor
npm install
cp .env.example .env      # y pon el usuario y la contraseña de TU MySQL (DB_USER, DB_PASSWORD)
npm run db:crear          # crea la base bomberos_v3 y sus tablas
npm run datos-prueba      # carga los usuarios y partes de ejemplo
```

En la Mac, `arrancar/configurar.sh` ya crea el `.env` (con la clave de la
IA); ahí solo falta llenar los datos de MySQL y correr los dos últimos
comandos. `arrancar/correr-app.sh --preparar-bd` hace `npm install` y esos
dos comandos antes de encender todo.

Cada quien tiene su propio `.env` (no se sube al repo) y su propia base: lo
que se crea en una compu no aparece en otra.

`npm run datos-prueba` deja a cada usuario de ejemplo con la contraseña
`prueba<matrícula>`:

| Usuario | Contraseña | Quién |
|---|---|---|
| `380207` | `prueba380207` | Acevedo Carrillo, Verónica (bombero) |
| `376285` | `prueba376285` | Jalife Burgueño, Ahhmed (bombero) |
| `300112` | `prueba300112` | Cap. J. Navarro (capitán, revisor) |

## Correrlo

```bash
npm start                 # puerto 3100
```

`arrancar/correr-app.sh` lo enciende solo. Si MySQL no está listo, el
servidor arranca y lo avisa en la terminal: la IA contesta, pero entrar,
enviar y validar fallan hasta arreglarlo.

```bash
npm test                  # pruebas de la IA (no necesitan MySQL)
npm run probar            # prueba de punta a punta del acceso, la firma y el sello (usa la base de .env)
```

`db:crear` no borra nada: si las tablas ya existen, las deja como están.

## Lo que hace Administración

Lo hace desde su página web (`../administracion`, ver su README). Desde la
terminal sigue funcionando, y así se crea la **primera** cuenta de
Administración:

```bash
npm run usuario -- alta 900002 "Apellido, Nombre" --administracion
npm run usuario -- alta 380999 "Apellido, Nombre" [--capitan] [--division "División Estructural"]
npm run usuario -- restablecer 380999
```

- `alta` crea al usuario e imprime la contraseña que se le entrega (12
  caracteres). Su usuario es su número de empleado. `--capitan` lo habilita
  para revisar; `--administracion` crea una cuenta que sólo entra a la página.
- `restablecer` le da una contraseña nueva, borra la llave de su celular y
  sus llaves de acceso web, y cierra sus sesiones.

Quien está dado de baja (`activo = 0`) no entra a la app ni a la página, y
sus sesiones abiertas dejan de servir. Las cuentas de Administración no
entran a la app.

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
| `POST /api/ia/transcribir`, `/llenar-campos`, `/resumen` | ver [`CONTRATOS-IA.md`](CONTRATOS-IA.md) | | |

La sesión va en `Authorization: Bearer <token>`. `usuario` trae `id`,
`nombre`, `matricula`, `rango`, `rol`, `division`, `estacion`, `trazo` y
`tiene_llave`. Los errores llegan como `{ "error": "codigo" }`.

Las rutas de partes y de revisión todavía no piden sesión: lo que protege la
firma es la confirmación de cada envío y cada validación.

### Rutas de Administración (`/api/admin/…`)

Sesión por cookie HttpOnly, no por `Authorization`. Todo lo que cambia algo
exige el encabezado `Origin` de la página (`ADMIN_ORIGENES`) y cuerpo JSON.

| Ruta | Qué hace |
|---|---|
| `POST /acceso/entrar` | número de empleado + contraseña → sesión a medias |
| `POST /acceso/llave/opciones-registro`, `/llave/registrar` | crear una llave de acceso (WebAuthn) |
| `POST /acceso/llave/opciones-acceso`, `/llave/verificar` | confirmar con la llave → sesión completa |
| `POST /acceso/llave-sola/opciones`, `/llave-sola/verificar` | entrar sólo con la llave |
| `GET /acceso/yo` · `POST /acceso/salir` · `POST /acceso/contrasena` | la sesión |
| `GET /acceso/llaves` · `DELETE /acceso/llaves/:id` | mis llaves |
| `GET /partes` · `/partes/opciones` · `/partes/exportar` | lista con filtros, opciones y CSV (RF-10) |
| `GET /partes/:folio` · `/partes/:folio/sello` | detalle y verificar sello (RF-14) |
| `GET /usuarios` · `POST /usuarios` | lista y alta (RF-11) |
| `PATCH /usuarios/:id` · `POST /usuarios/:id/restablecer` | permisos, datos, baja (RF-12) y contraseña |
| `GET /bitacora` | quién hizo qué |

Prueba de punta a punta: `npm run probar-admin` (30 pruebas, con un
autenticador WebAuthn de software).

## Archivos

    servidor.js            arma Express y arranca
    src/entorno.js         carga el .env
    src/db.js              conexión a MySQL (filas, fila, ejecutar, transaccion)
    src/datos.js           usuarios, sesiones, partes, firmas y folios en MySQL
    src/datos-ejemplo.js   los usuarios y partes de ejemplo que carga datos-prueba
    src/firma.js           retos y confirmación (biometría o contraseña)
    src/sello.js           el sello SHA-256 del parte
    src/validacion.js      la revisión del parte y el contenido que se firma (igual que en la app)
    src/rutas/acceso.js    entrar, biometría, llave, contraseña y trazo
    src/rutas/partes.js    folio, lista, reto, enviar y verificar sello
    src/rutas/revision.js  bandeja, devolver y validar
    src/rutas/ia.js        las rutas de las dos IAs (y src/ia/, lo que hay detrás)
    src/admin/             la API de Administración: config, sesión por cookie,
                           límite de intentos, bitácora y rutas (acceso, partes,
                           usuarios, bitácora)
    db/schema.sql          las tablas
    scripts/               crear la base, datos de ejemplo, usuarios y la prueba

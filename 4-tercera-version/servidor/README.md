# Servidor de la tercera versión

Hace lo mismo que [`app-bomberos/servidor`](../../app-bomberos/servidor/)
—las mismas rutas y las mismas respuestas—, pero guarda en MySQL en lugar
de en memoria. La app (`app-bomberos/movil`) funciona con él sin cambiarle
nada: solo hay que apuntarla a este servidor.

Node.js, Express 5 y MySQL.

## Correrlo

```bash
cd 4-tercera-version/servidor
npm install
cp .env.example .env      # y ajusta los datos de MySQL
npm run db:crear          # crea la base bomberos_v3 y sus tablas
npm run datos-prueba      # los mismos usuarios, código y partes de ejemplo de la app
npm start                 # puerto 3100, el mismo que usa la app
```

```bash
npm run probar            # prueba de punta a punta (usa la base de .env)
npm run usuario -- alta 380999 "Apellido, Nombre" [--capitan] [--division "División Estructural"]
npm run usuario -- codigo 380999        # otro código, para otro celular
npm run usuario -- restablecer 380999   # contraseña nueva
```

`db:crear` no borra nada: si las tablas ya existen, las deja como están.

## Rutas

Las que ya usa la app:

| Ruta | Para qué |
|---|---|
| `GET /api/salud` | Saber si el servidor está arriba. |
| `GET /api/acceso/codigo/:codigo` | A quién pertenece un código de alta. |
| `POST /api/acceso/alta` | Registrar la llave pública del celular con el código. |
| `POST /api/acceso/reto` | Pedir el reto para entrar. |
| `POST /api/acceso/verificar` | Mandar la firma del reto y recibir la sesión. |
| `POST /api/partes/folio` | Un folio nuevo. |
| `GET /api/partes?usuario=…` | Los partes de un usuario. |
| `POST /api/partes/:folio/reto` | El reto para firmar el parte (lleva el hash de su contenido). |
| `POST /api/partes/:folio/enviar` | Revisar el parte, comprobar la firma y mandarlo a revisión. |
| `GET /api/revision/bandeja?division=…` | Los partes de una división. |
| `POST /api/revision/:folio/devolver` | Devolverlo con una nota. |
| `POST /api/revision/:folio/validar` | Firma del revisor (llave del celular + trazo) y sello. |
| `POST /api/ia/transcribir`, `/llenar-campos`, `/resumen` | Dictado y resumen. |

Una más, de las notas de la tercera versión. La app todavía no tiene esa
pantalla:

| Ruta | Para qué |
|---|---|
| `POST /api/acceso/entrar` | Entrada manual: `no_empleado` (la matrícula) y `contrasena`. Devuelve `token` y `usuario`. |

## Qué se toma de `app-bomberos/servidor`

Para no tener dos copias que se desfasen, [`src/de-la-app.js`](src/de-la-app.js)
carga directo de esa carpeta:

- `src/validacion.js`: la revisión del parte y el contenido que se firma,
  que tiene que coincidir byte a byte con la app.
- `src/rutas/ia.js` y `src/ia/`: las rutas de la IA, con su configuración en
  `app-bomberos/servidor/.env`.

Por eso este servidor necesita que `app-bomberos/` esté en el repo.

## Diferencias con el servidor de la app

- Los datos sobreviven a un reinicio: usuarios, códigos, llaves, sesiones,
  retos, partes y firmas están en MySQL.
- Un usuario puede tener varias llaves. Dar de alta otro celular no quita la
  anterior.
- Un parte ya enviado o validado no se puede volver a enviar (`ya_enviado`).
- Solo valida un usuario con rol `capitan`, y nunca quien llenó el parte
  (`no_es_revisor`, `es_su_parte`).
- Cada firma queda guardada en `firma_parte`: quién, con qué reto, la firma
  del celular y, en la del revisor, su trazo.
- Los folios nuevos llevan el año en curso.

## Archivos

    src/server.js          arma Express
    src/db.js              conexión a MySQL (filas, fila, ejecutar, transaccion)
    src/datos.js           usuarios, llaves, sesiones, partes y folios en MySQL
    src/firma.js           retos y verificación de firmas
    src/de-la-app.js       lo que se carga de app-bomberos/servidor
    src/rutas/acceso.js    código, alta, reto, verificar y entrada manual
    src/rutas/partes.js    folio, lista, reto y enviar
    src/rutas/revision.js  bandeja, devolver y validar
    db/schema.sql          las tablas
    scripts/               crear la base, datos de ejemplo, usuarios y la prueba

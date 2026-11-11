# Servidor de la tercera versión · acceso y firma

API JSON (Node.js + Express 5 + MySQL) para la app de celulares:

- Entrada manual con número de empleado y contraseña.
- Entrada con la biometría (huella o cara) o el PIN del celular.
- Firma del parte por el autor (Enviar) y por el revisor (Validar),
  confirmada de la misma forma.

La huella, la cara y el PIN los revisa el celular. Lo que llega al servidor
es una firma hecha con una llave que vive en el chip seguro del celular
(Secure Enclave o Android Keystore) y que el celular solo deja usar después
de reconocer a su dueño. El servidor la comprueba con la llave pública.

Es otro servidor que el de `app-bomberos/servidor/` (el prototipo con datos en
memoria): este guarda todo en MySQL.

## Correrlo

```bash
cd 4-tercera-version/servidor
npm install
cp .env.example .env      # y ajusta los datos de MySQL
npm run db:crear          # crea la base bomberos_v3 y sus tablas
npm run datos-prueba      # dos usuarios y un parte en borrador para probar
npm start                 # http://localhost:3000
```

```bash
npm run probar            # prueba de punta a punta (usa la base de .env)
npm run usuario -- alta 4521 "Nombre Apellido" [--revisor] [--division "Estructural"]
npm run usuario -- restablecer 4521
```

`db:crear` no borra nada: si las tablas ya existen, las deja como están.

## Rutas

| Ruta | Sesión | Manda | Recibe |
|---|---|---|---|
| `POST /api/acceso/entrar` | no | `noEmpleado`, `contrasena` | `token`, `usuario` |
| `POST /api/acceso/dispositivo` | sí | `plataforma` (`android`/`ios`), `llavePublica` (EC P-256, base64 o PEM) | `dispositivoId`, `claveDispositivo` |
| `POST /api/acceso/reto` | no | `claveDispositivo` | `retoId`, `mensaje`, `usuario` |
| `POST /api/acceso/desbloquear` | no | `claveDispositivo`, `retoId`, `firma` | `token`, `usuario` |
| `POST /api/acceso/salir` | sí | — | `ok` |
| `POST /api/partes/:id/reto` | sí, con celular | `accion` (`enviar`/`validar`) | `retoId`, `mensaje`, `folio` |
| `POST /api/partes/:id/firmar` | sí, con celular | `accion`, `retoId`, `firma` | `estado` |

La sesión va en `Authorization: Bearer <token>`. "Con celular" quiere decir
que la sesión salió de `desbloquear`, o de `entrar` seguido de `dispositivo`.

`firma` es la firma ECDSA (SHA-256, en base64) que hace el celular sobre el
texto exacto de `mensaje`. Con `biometric_signature` es `createSignature` con
`payload: mensaje`.

Los errores llegan como `{ "error": "CODIGO", "mensaje": "texto para el usuario" }`.

## Archivos

    src/server.js          arma Express y responde los errores
    src/db.js              conexión a MySQL (filas, fila, ejecutar, transaccion)
    src/confirmacion.js    llaves, firmas, mensaje del reto y hash canónico
    src/retos.js           crear y cumplir retos
    src/sesion.js          tokens de sesión y filtros de Express
    src/rutas/acceso.js    entrar, registrar el celular, desbloquear, salir
    src/rutas/partes.js    reto y firma del parte, con las reglas de revisión
    db/schema.sql          las tablas
    scripts/               crear la base, datos de prueba, usuarios y la prueba

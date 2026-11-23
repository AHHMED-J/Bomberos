# Administración · página web

La página donde Administración consulta los partes y maneja a los usuarios.
React + TypeScript con Vite. Le habla sólo al servidor (`../servidor`), nunca
a MySQL.

| Pantalla | Qué hace | Requerimiento |
|---|---|---|
| Acceso | Número de empleado + contraseña, y después la llave de acceso. O sólo la llave. | RF-01 |
| Partes | Filtrar por estado, fechas, tipo, unidad, división o texto. Exportar a CSV. | RF-10 |
| Detalle | El parte completo en sólo lectura, sus firmas en trazo, cómo se confirmó cada una, imprimir en el formato «Reporte de salida de incidente» de la Dirección (botón «Ver formato»), y **Verificar sello**. | RF-10, RF-14 |
| Usuarios | Alta (la contraseña se muestra una sola vez), hacer o quitar revisor, editar, restablecer contraseña, dar de baja o reactivar. | RF-11, RF-12 |
| Bitácora | Quién entró, quién falló al entrar y todo lo que se hizo. | — |
| Mi cuenta | Mis llaves de acceso y mi contraseña. | — |

## Cómo se entra

Igual que en la app: número de empleado y contraseña, o directo con la
biometría. En el navegador la biometría es una **llave de acceso** (WebAuthn,
también llamada passkey): Touch ID, Face ID, Windows Hello o una llave USB.

- La **primera vez**, con la contraseña que le entregaron, la persona crea su
  llave de acceso y después cambia la contraseña.
- Desde ahí entra con contraseña **y** llave, o sólo con la llave. **La
  contraseña sola nunca abre la página.**
- La huella o la cara nunca salen del equipo: el servidor sólo guarda una
  llave pública y comprueba la firma de un reto.

## Seguridad

| Riesgo | Qué lo detiene |
|---|---|
| Robo de contraseña | Hace falta además la llave de acceso, que vive en el equipo. |
| Página falsa (phishing) | La llave de acceso sólo firma para este dominio (`ADMIN_RP_ID`). |
| Adivinar contraseñas | 5 intentos en 15 min por número de empleado (20 por IP), y la misma respuesta si el número no existe. |
| Robo de la sesión con un script | La sesión va en una cookie `HttpOnly`: JavaScript no la puede leer. |
| Otra página actuando en tu nombre (CSRF) | Cookie `SameSite=Strict`, encabezado `Origin` obligatorio y sólo JSON. |
| Scripts inyectados (XSS) | React escapa todo el texto y la política de contenido sólo permite archivos del mismo servidor. |
| Sesión olvidada abierta | Se cierra a los 30 min sin uso y a las 8 h siempre. |
| Fijar la sesión antes de entrar | El token cambia al confirmar con la llave. |
| Copiar una respuesta de la llave | Cada reto sirve una vez y por 5 minutos; si la llave lleva contador, debe subir. |
| Una contraseña vieja que alguien conoce | Las cuentas nuevas o restablecidas deben cambiarla al entrar. |
| Quedarse sin quien administre | Nadie puede darse de baja ni quitarse su última llave. |
| No saber qué pasó | Bitácora de entradas, intentos fallidos, altas, bajas, permisos y exportaciones. |
| Fórmulas en el CSV | Una celda que empieza con `=`, `+`, `-` o `@` se exporta como texto. |

Lo que falta para usarla fuera de esta Mac está en «En la estación».

## Correrla en la Mac

Con MySQL y el servidor encendidos (`../servidor`, `npm start`). Antes, una
vez, `npm run db:crear` en el servidor para crear las tablas nuevas.

**Para desarrollar** (recarga al guardar):

```bash
cd 4-tercera-version/administracion
npm install          # la primera vez
npm run dev          # http://localhost:5180/administracion/
```

**Como quedaría de verdad** (la sirve el propio servidor, con su política de seguridad):

```bash
npm run build        # crea dist/
# y abre http://localhost:3100/administracion/  (reinicia el servidor la primera vez)
```

Usa `localhost`, no `127.0.0.1` ni la IP: WebAuthn sólo funciona en un
dominio con HTTPS, o en `localhost`.

**La cuenta de ejemplo** es `900001` / `prueba900001` (la carga
`npm run datos-prueba`). Para una cuenta nueva:

```bash
cd ../servidor && npm run usuario -- alta 900002 "Apellido, Nombre" --administracion
```

## En la estación (fuera de esta Mac)

1. Un nombre para el servidor (p. ej. `admin.bomberos.local`) y un
   certificado HTTPS para ese nombre. WebAuthn no acepta una IP.
2. En `servidor/.env`:

        ADMIN_RP_ID=admin.bomberos.local
        ADMIN_ORIGENES=https://admin.bomberos.local
        ADMIN_COOKIE_SEGURA=1

   Con la cookie segura se activan además el prefijo `__Host-` y HSTS.
3. Si cambia `ADMIN_RP_ID`, las llaves registradas con el nombre anterior ya
   no sirven: cada quien la vuelve a crear (restablecer su contraseña).
4. El límite de intentos vive en la memoria del servidor: con más de un
   servidor tendría que ir en MySQL o Redis.

## Archivos

    src/main.tsx              arranca React y carga las fuentes Barlow (sin Google Fonts)
    src/App.tsx               qué se ve según la sesión, y las rutas
    src/api.ts                las llamadas al servidor y sus tipos
    src/sesion.tsx            pregunta al servidor quién está dentro
    src/usarSesion.ts         useSesion()
    src/textos.ts             mensajes, etiquetas, secciones de la hoja y formatos
    src/componentes.tsx       escudo, iconos, chips, avisos, diálogo, paginación y firma en trazo
    src/estilos.css           los colores y tipografías de la app (tema.dart)
    src/paginas/              una por pantalla

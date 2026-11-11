# App del parte digital (Flutter)

La app de celulares de la tercera versión: la usan los bomberos para llenar,
firmar y enviar el parte, y los capitanes para revisarlo. Corre en iPhone
(se instala desde la Mac) y, para probar, como programa de Windows.

La app nunca habla directo con MySQL ni con los modelos de IA: todo pasa por
el [servidor](../servidor/README.md).

- Qué hace y qué falta: [`docs/requerimientos-y-limites.md`](../docs/requerimientos-y-limites.md), sección 7.
- Cómo correrla: [`docs/correr-en-windows.md`](../docs/correr-en-windows.md) o [`docs/correr-en-mac.md`](../docs/correr-en-mac.md).
- Las opciones `--dart-define` (`DATOS`, `IA`, `SERVIDOR_URL`, `MICROFONO_SIMULADO`): [`docs/correr-en-windows.md`](../docs/correr-en-windows.md#las-opciones-de-simulación).
- El mapa de pantallas y piezas: [`docs/estructura-app.html`](../docs/estructura-app.html).

## Carpetas de `lib/`

    main.dart        arranca la app
    rutas.dart       qué pantalla va en cada ruta (go_router)
    acceso/          entrar, sesión, Mi cuenta (firma y contraseña) y confirmar con biometría o contraseña
    hoja/            la Hoja de incidente, la lista de documentos, enviar y la revisión antes de enviar
    dictado/         el botón Dictar, su panel y las pantallas del dictado
    croquis/         el mapa en vivo, la captura y el dibujo encima
    revision/        la bandeja del capitán, devolver con nota y validar
    datos/           modelos, catálogo de campos, datos de ejemplo y los repositorios (local y servidor)
    servicios/       firma con la llave del celular, las tres IAs, grabadora y ubicación
    compartido/      tema, lienzo de firma y widgets comunes

## Pruebas

```bash
flutter analyze
flutter test                                   # pruebas de la app, sin servidor
```

`test/servidor_contrato_test.dart` revisa que la app y el servidor se
entiendan. Se salta si no se le dice dónde está el servidor; con el servidor
y MySQL encendidos:

```bash
SERVIDOR_URL=http://localhost:3100 flutter test test/servidor_contrato_test.dart
```

En PowerShell: `$env:SERVIDOR_URL="http://localhost:3100"; flutter test test/servidor_contrato_test.dart`.

`integration_test/grabadora_real_test.dart` graba 3 s con el micrófono real
en un simulador o teléfono: cómo correrla está en
[`docs/correr-en-mac.md`](../docs/correr-en-mac.md#correr-la-app-desde-el-iphone-a-mano).

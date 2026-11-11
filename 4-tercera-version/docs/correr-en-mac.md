# Correr todo en la Mac y el iPhone

Cómo prender MySQL, el servidor y la IA real en la Mac, e instalar la app en
el iPhone. Para Windows, ver [`correr-en-windows.md`](correr-en-windows.md).

> **Falta comprobarlo a mano.** Los scripts de `arrancar/` se movieron al
> reorganizar las carpetas (antes estaban en `ia-local/`) y todavía no se
> han vuelto a correr en la Mac. Tampoco se ha hecho el recorrido completo
> en el iPhone. Si un comando falla por una ruta, es probable que venga de
> ahí.

## Las piezas

| Pieza | Qué es | Cómo se prende |
|---|---|---|
| MySQL | La base de datos | Tiene que estar encendido antes que el servidor |
| IA real | Whisper (transcribe) y Ollama con `qwen2.5:14b` (llena campos y resume) | `arrancar/correr-app.sh` o `ia-local/iniciar-ia.sh` |
| Servidor | Guarda y decide: acceso, firma, revisión, sello y las rutas de la IA | `arrancar/correr-app.sh` o `npm start` |
| App | Lo que ve el bombero, instalada en el iPhone | `arrancar/correr-app.sh` o `flutter run` |

    iPhone  ──►  servidor (Mac, 3100)  ──►  MySQL
                                     └─►  Whisper / Ollama

## Qué instalar (una vez)

- **Node.js** y **MySQL 8**.
- **Flutter** y **Xcode**. Se instala con un Apple ID gratis, sin cuenta de
  pago: la app instalada caduca a los 7 días, así que hay que reinstalarla
  antes de cada demo.
- Para la IA real: whisper.cpp, el modelo de Whisper, Ollama con
  `qwen2.5:14b` y ffmpeg. La lista y dónde va cada uno está en
  [`ia-local/README.md`](../ia-local/README.md).

La primera vez, `arrancar/configurar.sh` crea `servidor/.env` con
`IA_MODO=local` y una clave al azar. Hay que abrirlo y poner el usuario y
la contraseña de MySQL (`DB_USER`, `DB_PASSWORD`).

## Encender todo

**Lo más fácil (un solo comando):** con el iPhone conectado por cable, desbloqueado y en la misma Wi-Fi que la Mac:

```bash
cd 4-tercera-version/arrancar
./correr-app.sh          # enciende IAs + servidor (modo local), detecta la IP e instala la app con la clave
./detener.sh             # al terminar: apaga servidor, Whisper y saca el modelo de la memoria
```

`correr-app.sh` instala la versión *release* (se abre desde el inicio del iPhone sin la Mac conectada;
la IA sí necesita la Mac encendida y en la misma red). `./correr-app.sh --depurar` instala la de depuración.

La app usa la IA real **por defecto**. Si una respuesta viene de ejemplo, el panel muestra «Ejemplo · sin IA».

Paso a paso, si se quiere hacer a mano:

```bash
cd 4-tercera-version/arrancar
./configurar.sh          # una sola vez: crea servidor/.env (IA_MODO=local + clave al azar, permisos 600)
../ia-local/iniciar-ia.sh   # arranca whisper-server y precarga el modelo en Ollama
cd ../servidor && npm start
# … probar …
cd ../arrancar && ./detener.sh   # apaga Whisper y saca el modelo de la memoria
```

### La base de datos (primera vez)

El servidor guarda usuarios, firmas y partes en MySQL, así que tiene que estar instalado y encendido, y
`servidor/.env` debe llevar sus datos (`DB_USER`, `DB_PASSWORD`; ver `servidor/README.md`). La primera
vez, y cada vez que cambien las dependencias del servidor:

```bash
./correr-app.sh --preparar-bd   # npm install + crea la base + carga los datos de ejemplo, y luego lo de siempre
```

No borra nada y se puede repetir. Si MySQL no está listo, el servidor arranca y lo avisa: la IA contesta,
pero entrar, enviar y validar fallan.

## Usuarios de ejemplo

Los carga `--preparar-bd`. Están en
[`servidor/README.md`](../servidor/README.md#usuarios-de-ejemplo).

## Correr la app desde el iPhone, a mano

```bash
flutter run --dart-define=IA=servidor \
            --dart-define=SERVIDOR_URL=http://<ip-de-la-mac>:3100 \
            --dart-define-from-file=../servidor/.env   # toma CLAVE_LOCAL del .env sin mostrarla
```

- No pases la clave con `$(grep …)`: si la variable sale vacía, la app se instala sin clave y el servidor responde 401.
  `--dart-define-from-file` la lee directo del `.env`.
- La clave sólo viaja como `X-Clave-Local` a `/api/ia/*`. Si la app entró con sesión real del servidor,
  basta el `Bearer` y no hace falta la clave.
- La app espera hasta 120 s en las rutas de IA (el resto, 20 s).
- El micrófono es real (`app/lib/servicios/grabadora_real.dart`, paquete `record`): AAC/m4a, 16 kHz, mono.
  El archivo vive en la carpeta temporal sólo mientras se graba; al detener se lee a memoria y se borra.
  A los 175 s se detiene solo (el servidor acepta hasta 180 s).
- Para probar sin micrófono: interruptor «Micrófono simulado» en Depuración, o `--dart-define=MICROFONO_SIMULADO=true`.
- Prueba en simulador o teléfono (graba 3 s y comprueba que el servidor lo puede leer):

  ```bash
  xcrun simctl privacy <id-simulador> grant microphone mx.edu.uabc.bomberosParte   # sólo simulador
  flutter test integration_test/grabadora_real_test.dart -d <id> \
    --dart-define=SERVIDOR_URL=http://<ip>:3100 --dart-define-from-file=../servidor/.env
  ```

## Si algo falla

Los errores de la IA (Whisper u Ollama apagados, falta el modelo, falta la
clave, el puerto ocupado) están en
[`ia-local/README.md`](../ia-local/README.md#si-algo-falla).

# IA local (en la Mac del equipo)

Las dos IAs corren **en esta Mac**. Ni el audio ni el texto salen a internet.

```
iPhone ──audio──▶ servidor (3100) ──▶ whisper-server (127.0.0.1:8178)  IA 1 · Whisper large-v3
                       │                     └─ el audio se borra al terminar
                       └──texto──▶ Ollama (127.0.0.1:11434)            IA 2 · qwen2.5:14b
                                     └─ propone campos → reglas verifican → la app pide confirmar
```

| Pieza | Qué es | Dónde vive |
|---|---|---|
| whisper.cpp 1.9.5 | `brew install whisper.cpp` (usa Metal) | Homebrew |
| Modelo Whisper large-v3 (3.1 GB) | `ggml-large-v3.bin` | `~/.bomberos-ia/modelos/` (**fuera del repo**) |
| Ollama + `qwen2.5:14b` (9 GB) | `ollama pull qwen2.5:14b` | `~/.ollama` |
| ffmpeg | convierte m4a → WAV 16 kHz mono | Homebrew |
| Código | `servidor/src/ia/*.js`, `servidor/src/rutas/ia.js` | repo |

## Uso

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

Para volver a respuestas fijas sin modelos: `IA_MODO=fijo` en `servidor/.env` (o borrar el `.env`).

### La base de datos

El servidor guarda usuarios, firmas y partes en MySQL, así que tiene que estar instalado y encendido, y
`servidor/.env` debe llevar sus datos (`DB_USER`, `DB_PASSWORD`; ver `servidor/README.md`). La primera
vez, y cada vez que cambien las dependencias del servidor:

```bash
./correr-app.sh --preparar-bd   # npm install + crea la base + carga los datos de ejemplo, y luego lo de siempre
```

No borra nada y se puede repetir. Si MySQL no está listo, el servidor arranca y lo avisa: la IA contesta,
pero entrar, enviar y validar fallan.

### En Windows

`iniciar.ps1` hace en un solo comando lo que aquí hacen `ia-local/iniciar-ia.sh` + `npm start`. No instala la app en
el celular: eso sólo se puede desde la Mac.

```powershell
cd 4-tercera-version\arrancar
.\iniciar.ps1                # enciende la IA (si IA_MODO=local) y el servidor; Ctrl+C apaga todo
.\iniciar.ps1 -PrepararBd    # antes: npm install + crea la base + carga los datos de ejemplo
```

- Si `servidor\.env` no existe, lo crea con una clave al azar y deja `IA_MODO=fijo`; hay que abrirlo y
  poner el usuario y la contraseña de MySQL.
- Con `IA_MODO=fijo` no hace falta ningún modelo: sirve para probar acceso, firma, revisión y sello.
- Con `IA_MODO=local` revisa que estén `ffmpeg`, `whisper-server` (whisper.cpp) y Ollama con su modelo, y
  dice cuál falta. El modelo de Whisper va en `%USERPROFILE%\.bomberos-ia\modelos\ggml-large-v3.bin`.
  Esta parte (encender Whisper y Ollama) todavía no se ha probado en una compu con los modelos instalados.

### Desde el iPhone

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

## Seguridad (lo que NO entra al repo)

`4-tercera-version/.gitignore` excluye: `.env`, llaves (`*.pem`, `*.key`), modelos (`*.bin`, `*.gguf`, `modelos/`),
audios (`*.m4a`, `*.wav`…), `ia-local/audios/` y `ia-local/resultados/`. No hay APIs de terceros ni tokens.

- `configurar.sh` genera la clave con `openssl rand` y **no la imprime**; verifica que `.env` esté ignorado.
- whisper-server y Ollama escuchan sólo en `127.0.0.1`: desde la red únicamente se llega al servidor (3100), que pide clave o sesión.
- El audio se escribe en una carpeta temporal 0700, se convierte, se transcribe y **se borra siempre** (`finally`).
- Los logs sólo llevan conteos y milisegundos, nunca lo dictado.
- El resumen para WhatsApp quita propietario, testigo y teléfonos **antes** del modelo y vuelve a tachar la salida.

## Evaluación

Todo con **casos ficticios** (`evaluacion/casos.json`: nombres «Ficticio», teléfonos 555).

```bash
cd evaluacion
node evaluar.js qwen2.5:14b gemma3:12b   # sólo IA 2, con el texto exacto del dictado
./generar-audios.sh                      # voz «Eddy (español MX)» de la Mac → audios/ (ignorado)
node probar-audio.js                     # de punta a punta por HTTP, como la app (servidor en modo local)
```

Resultados del 10-nov-2026 (M4 Pro, 24 GB):

| Prueba | Aciertos | Inventados | Negaciones perdidas | Tiempo |
|---|---|---|---|---|
| IA 2 sola, `qwen2.5:14b` | 31/32 | 0 | 0 | ~12 s por caso |
| IA 2 sola, `gemma3:12b` | 32/32 | 1 | 0 | ~17 s (por eso no se eligió) |
| Audio → Whisper → IA 2 | 30/32 | 0 | 0 | Whisper ~1.8 s por 10 s de audio; llenado 3–35 s |

- Seguridad comprobada: sin clave → 401; audio en silencio → 422 `audio_vacio`; `audio_borrado: true` en los 10 casos.
- WER de Whisper con voz sintética: 0 % en 7 de 10 casos; el peor 18 % (números: «ENS-26-118843» → «26, 118,843»).
- Fallos que quedan: lugar incompleto con muletillas («por el Sauzal, más o menos»); Whisper escribe «uno» como «1».
  Lugar, nombres y personal siempre llegan como «revisar», así que el bombero los ve antes de enviar.

**Cuidado al leer estos números:**

- Son 10 casos escritos por quien escribió las reglas: hay riesgo de sobreajuste.
- La voz sintética es limpia; un bombero real dicta con sirena, radio y prisa. **Falta medir con audios reales.**
- Los ejemplos de `PISTAS` en `llenado.js` **no deben** coincidir con los casos: el modelo los copia
  (pasó con el número C-5 y por eso se cambiaron; con eso la IA 2 bajó de 32/32 a 31/32, que es el número honesto).
- El glosario de Whisper (`glosario.js`) sí trae colonias reales de Ensenada que salen en los casos; es a propósito.

## Si algo falla

| Error | Causa | Arreglo |
|---|---|---|
| `503 whisper_apagado` | no corre whisper-server | `ia-local/iniciar-ia.sh` |
| `503 ollama_apagado` | Ollama cerrado | abrir Ollama o `ollama serve` |
| `404 modelo_no_descargado` | falta el modelo | `ollama pull qwen2.5:14b` |
| `401 sin_autorizacion` | falta la clave | revisar `--dart-define=CLAVE_LOCAL` |
| `EADDRINUSE :3100` | ya hay otro servidor | cerrarlo, o `PORT=3101 npm start` |

Registros de whisper-server: `~/.bomberos-ia/registros/whisper-server.log`.

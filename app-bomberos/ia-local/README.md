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

```bash
cd app-bomberos/ia-local
./configurar.sh          # una sola vez: crea servidor/.env (IA_MODO=local + clave al azar, permisos 600)
./iniciar.sh             # arranca whisper-server y precarga el modelo en Ollama
cd ../servidor && npm start
# … probar …
cd ../ia-local && ./detener.sh   # apaga Whisper y saca el modelo de la memoria
```

Para volver a respuestas fijas sin modelos: `IA_MODO=fijo` en `servidor/.env` (o borrar el `.env`).

### Desde el iPhone

```bash
flutter run --dart-define=IA=servidor \
            --dart-define=SERVIDOR_URL=http://<ip-de-la-mac>:3100 \
            --dart-define=CLAVE_LOCAL=$(grep ^CLAVE_LOCAL= ../servidor/.env | cut -d= -f2)
```

- La clave sólo viaja como `X-Clave-Local` a `/api/ia/*`. Si la app entró con sesión real del servidor,
  basta el `Bearer` y no hace falta la clave.
- La app espera hasta 120 s en las rutas de IA (el resto, 20 s).
- El micrófono es real (`movil/lib/servicios/grabadora_real.dart`, paquete `record`): AAC/m4a, 16 kHz, mono.
  El archivo vive en la carpeta temporal sólo mientras se graba; al detener se lee a memoria y se borra.
  A los 175 s se detiene solo (el servidor acepta hasta 180 s).
- Para probar sin micrófono: interruptor «Micrófono simulado» en Depuración, o `--dart-define=MICROFONO_SIMULADO=true`.
- Prueba en simulador o teléfono (graba 3 s y comprueba que el servidor lo puede leer):

  ```bash
  xcrun simctl privacy <id-simulador> grant microphone mx.edu.uabc.bomberosParte   # sólo simulador
  flutter test integration_test/grabadora_real_test.dart -d <id> \
    --dart-define=SERVIDOR_URL=http://<ip>:3100 --dart-define=CLAVE_LOCAL=…
  ```

## Seguridad (lo que NO entra al repo)

`app-bomberos/.gitignore` excluye: `.env`, llaves (`*.pem`, `*.key`), modelos (`*.bin`, `*.gguf`, `modelos/`),
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
| `503 whisper_apagado` | no corre whisper-server | `./iniciar.sh` |
| `503 ollama_apagado` | Ollama cerrado | abrir Ollama o `ollama serve` |
| `404 modelo_no_descargado` | falta el modelo | `ollama pull qwen2.5:14b` |
| `401 sin_autorizacion` | falta la clave | revisar `--dart-define=CLAVE_LOCAL` |
| `EADDRINUSE :3100` | ya hay otro servidor | cerrarlo, o `PORT=3101 npm start` |

Registros de whisper-server: `~/.bomberos-ia/registros/whisper-server.log`.

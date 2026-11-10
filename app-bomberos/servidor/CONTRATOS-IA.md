# Contratos de las dos IAs

El servidor tiene dos modos (variable `IA_MODO` en `servidor/.env`):

| Modo | Qué responde | Para qué |
|---|---|---|
| `fijo` (predeterminado) | JSON de ejemplo, `modelo: "fijo-sin-ia"` | pruebas y desarrollo sin modelos |
| `local` | Whisper + Ollama **en la Mac** (nada sale a internet) | demo y evaluación; ver `ia-local/README.md` |

| # | Endpoint | Modelo (modo local) | Cliente en la app (`movil/lib/servicios/ia/`) |
|---|---|---|---|
| 1 | `POST /api/ia/transcribir` | IA 1 · Whisper large-v3 con whisper.cpp | `ServicioTranscripcion` → `ServidorTranscripcion` |
| 2 | `POST /api/ia/llenar-campos` | IA 2 · `qwen2.5:14b` en Ollama + reglas que verifican | `ServicioLlenadoCampos` → `ServidorLlenadoCampos` |
| 3 | `POST /api/ia/resumen` | IA 2 · mismo modelo, resumen informal | `ServicioResumen` → `ServidorResumen` |

**Autorización (sólo modo local):** cada petición a `/api/ia/*` debe traer la cabecera
`X-Clave-Local: <CLAVE_LOCAL de servidor/.env>` **o** `Authorization: Bearer <token de sesión>`.
Si no, `401 sin_autorizacion`. La clave vive sólo en `.env` (ignorado por git), nunca en el repo.

Para que la app los use: `--dart-define=IA=servidor --dart-define=SERVIDOR_URL=http://<ip-de-la-mac>:3100`
(o el interruptor «IA desde el servidor» en Depuración). Sin eso usa `Falso*`, que no necesita red.

Reglas que valen para los tres:

- Todo va en JSON UTF-8. Errores: `{ "error": "<codigo>", "mensaje": "<texto opcional>" }`.
- **Nada de lo que devuelve la IA es oficial**: la app lo pinta como propuesta y el bombero confirma.
  El envío del parte se rechaza (422) si queda algún campo dictado sin confirmar.
- El audio **se borra apenas se transcribe**: en modo local vive en una carpeta temporal (permisos 0700)
  sólo mientras Whisper lo lee y se borra en un `finally`, aunque falle. Nunca va a logs.
- Los logs del servidor sólo llevan métricas (segundos de audio, número de campos, milisegundos), nunca texto.
- Errores comunes del modo local: `503 whisper_apagado` / `503 ollama_apagado` (falta `ia-local/iniciar.sh`),
  `404 modelo_no_descargado`, `502 whisper_error`, `502 ollama_json_invalido`.

---

## 1 · `POST /api/ia/transcribir`

Entrada:

```json
{
  "audio_base64": "<m4a/AAC 16 kHz mono en base64>",
  "formato": "m4a",
  "duracion_s": 47.2,
  "idioma": "es"
}
```

Salida 200:

```json
{
  "texto": "Incendio de pastizal. Unidad E7 de la estación 3…",
  "idioma": "es",
  "duracion_s": 47.2,
  "modelo": "whisper-large-v3",
  "segmentos": [ { "inicio": 0.0, "fin": 2.1, "texto": "Incendio de pastizal." } ],
  "audio_borrado": true
}
```

| Caso | Respuesta | En la app |
|---|---|---|
| Falta `audio_base64` | 400 `falta_audio` | error genérico, el audio queda en el teléfono |
| Casi silencio (pico < −45 dB) o menos de 2 s | 422 `audio_vacio` | pantalla D6 «Casi no se escuchó nada» |
| ffmpeg no puede leerlo | 422 `audio_ilegible` | error genérico |
| Más de 180 s (`AUDIO_MAX_S`) | 413 `audio_muy_largo` | pedir que dicte en dos partes |
| Audio > 25 MB | 413 `audio_muy_grande` | error genérico |

En modo local la duración la mide el servidor con ffmpeg; `duracion_s` de la entrada se ignora.
| Sin red | (sin respuesta) | D3: se guarda en SQLite y se reenvía al volver la señal |

Pendiente: base64 es simple pero pesa +33 %. Si los audios son largos, cambiar a `multipart/form-data`
con el campo `audio`.

## 2 · `POST /api/ia/llenar-campos`

Entrada:

```json
{
  "transcripcion": { "texto": "Corrijo, llegamos a las 14:35…", "idioma": "es" },
  "campos_actuales": {
    "tipo_servicio": { "valor": "Incendio de pastizal", "confirmado": true },
    "hora_llegada":  { "valor": "14:20", "confirmado": true }
  },
  "catalogo": [
    { "id": "hora_llegada", "etiqueta": "Hora de llegada", "seccion": "datosServicio", "tipo": "hora", "obligatorio": false },
    { "id": "tipo_servicio", "etiqueta": "Tipo de servicio", "seccion": "datosServicio", "tipo": "opcion",
      "obligatorio": true, "opciones": ["Incendio estructural", "Incendio de pastizal", "…"] }
  ]
}
```

- `campos_actuales` sólo trae lo que ya tiene valor. Sirve para que el **segundo audio sume** y para
  detectar **correcciones**.
- `catalogo` es la lista de `movil/lib/datos/catalogo_campos.dart`. La IA sólo puede usar esos `id`.

Salida 200:

```json
{
  "modelo": "<nombre del modelo>",
  "campos": [
    { "campo": "hora_llegada", "valor": "14:35", "estado": "corregido", "confianza": 0.88,
      "valor_anterior": "14:20", "evidencia": "Corrijo, llegamos a las 14:35" },
    { "campo": "propietario", "valor": "Manuel Torres", "estado": "revisar", "confianza": 0.70,
      "valor_anterior": null, "evidencia": "El propietario es Manuel Torres" },
    { "campo": "hora_control_fuego", "valor": "", "estado": "falta", "confianza": 0,
      "valor_anterior": null, "evidencia": null }
  ],
  "descartados": 2
}
```

`descartados` (sólo modo local) = cuántas propuestas del modelo tiraron las reglas de verificación
(`src/ia/llenado.js`, función pura `verificar`). El modelo **propone**; las reglas deciden:

- la `evidencia` tiene que estar (casi) literal en la transcripción, y las palabras del valor también → si no, posible invento;
- una opción del catálogo tiene que estar **dicha**, no deducida («colonia» no implica zona «Urbana»);
- `unidad` y `no_incidente_c5` deben tener forma de clave/número;
- `fecha` no se dicta (la pone la app);
- con negación («no hubo…»), nombres, lugar, personal o descripción → siempre `revisar`, nunca `entendido`;
- si había valor y cambia → `corregido` con `valor_anterior`; si es igual, no se manda.

`confianza` en modo local es una regla fija (0.9 `entendido`, 0.6 `revisar`/`corregido`), no una probabilidad del modelo.

| Llave | Tipo | Regla |
|---|---|---|
| `campo` | string | Un `id` del catálogo. Otro id = se descarta. |
| `valor` | string | Vacío sólo si `estado = falta`. Horas `HH:MM`, fechas `DD/MM/AAAA`, opciones tal cual del catálogo. |
| `estado` | `entendido` · `revisar` · `falta` · `corregido` | `entendido` = seguro; `revisar` = dudoso; `falta` = no lo mencionó; `corregido` = cambia algo que ya había. |
| `confianza` | número 0..1 | Sugerencia: `entendido` ≥ 0.85; `revisar` < 0.85. |
| `valor_anterior` | string o null | **Obligatorio si `estado = corregido`** (el valor que había). Null en los demás. |
| `evidencia` | string o null | Fragmento de la transcripción de donde salió el valor (para mostrarlo al bombero). |

Qué hace la app con cada estado (pantallas D5 y G6):

- Todo entra **sin confirmar**. `Confirmar` / `Aceptar los cambios` lo vuelve del bombero.
- `falta` sólo marca la casilla si sigue vacía («Sin dato · se llena a mano»); nunca borra.
- `corregido` conserva `valor_anterior`; `Dejar como estaba` lo restaura. Nada se borra sin confirmar.
- La app también marca como corrección cualquier valor distinto de uno que ya existía, aunque la IA no lo diga.

## 3 · `POST /api/ia/resumen`

Entrada:

```json
{
  "campos": { "tipo_servicio": "Incendio de pastizal", "lugar_servicio": "Calle López Mateos, El Sauzal",
              "unidad": "E7 · Estación 3", "hora_llegada": "14:20", "descripcion": "…" },
  "transcripcion": "<opcional: texto del último dictado>"
}
```

Salida 200:

```json
{ "texto": "🚒 Incendio de pastizal en El Sauzal\nE7 de la Estación 3 llegó a las 14:20…",
  "advertencia": "Borrador informal. No es documento oficial ni se guarda.",
  "modelo": "<nombre del modelo>" }
```

- Texto corto (≤ 600 caracteres) para pegar en WhatsApp.
- **Sin datos personales** de propietario ni testigo (nombres, teléfonos). En modo local esos campos
  se quitan **antes** de pasarlos al modelo y la salida se vuelve a tachar (`[nombre]`, `[teléfono]`).
- **No se guarda** en el servidor ni en el teléfono: sólo se copia (pantalla G5).

---

## Preguntas abiertas

- ¿Qué campos acepta el Capitán que llene una IA? (pendiente en `decisiones.md`).
- ¿Puede el audio salir a Colab (servidor de terceros)? Pendiente con la Dirección. Mientras tanto, modo local.
- Medido sólo con voz sintética de la Mac y 10 casos ficticios (ver `ia-local/README.md`).
  Falta medir con audios reales de bomberos (ruido de sirena, radio, acento) antes de la prueba A/B.

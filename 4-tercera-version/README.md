# Parte digital · Tercera versión

La app, su servidor y los requerimientos definitivos que acordó el equipo
en noviembre de 2026. Donde algo de las carpetas anteriores lo contradiga,
manda esta.

Las versiones anteriores no se tocan: se quedan como registro de cómo
llegamos aquí. De dónde viene cada cosa (la v1, la v2, los Actos, los
hitos del roadmap y el mapeo de requisitos) está en
[`docs/antecedentes.md`](docs/antecedentes.md).

## Estructura

Cada carpeta responde una pregunta:

| Carpeta | Qué hay | Pregunta |
|---|---|---|
| [`docs/`](docs/) | Antecedentes, requerimientos y límites, avances, el diagrama de la app y cómo correrla | ¿Qué se pidió y qué se hizo? |
| [`app/`](app/) | La app de celulares, en Flutter | ¿Qué ve y toca el bombero? |
| [`servidor/`](servidor/) | El servidor (Node.js) y las tablas de MySQL | ¿Quién guarda y decide? |
| [`ia-local/`](ia-local/) | La IA real: Whisper y Ollama, y su evaluación | ¿Cómo se dicta de verdad? |
| [`arrancar/`](arrancar/) | Los comandos que prenden todo | ¿Cómo se corre? |

La app nunca habla directo con la base ni con los modelos: siempre pasa por
el servidor.

    app  ──►  servidor  ──►  MySQL              usuarios, firmas y partes
                        └─►  Whisper / Ollama   sólo con la IA real

## Documentos

Cada tema está escrito en un solo lugar; los demás documentos enlazan ahí.

| Para saber… | Lee |
|---|---|
| De dónde viene cada cosa: v1, v2, Actos, hitos, mapeo y bitácora | [`docs/antecedentes.md`](docs/antecedentes.md) |
| Qué se decidió y qué se pide: decisiones D-01 a D-20, RF, RNF, límites, preguntas abiertas y estado por RF | [`docs/requerimientos-y-limites.md`](docs/requerimientos-y-limites.md) |
| Qué se programó de acceso, firma, revisión y sellado, y cómo se probó | [`docs/avances-acceso-y-firma.md`](docs/avances-acceso-y-firma.md) |
| Cómo se ve la app por dentro (pantallas y piezas) | [`docs/estructura-app.html`](docs/estructura-app.html) |
| Cómo correr todo en Windows | [`docs/correr-en-windows.md`](docs/correr-en-windows.md) |
| Cómo correr todo en la Mac y el iPhone | [`docs/correr-en-mac.md`](docs/correr-en-mac.md) |
| Cómo funciona el servidor: rutas, tablas, usuarios de ejemplo y comandos de Dirección | [`servidor/README.md`](servidor/README.md) |
| Qué piden y contestan las rutas de la IA | [`servidor/CONTRATOS-IA.md`](servidor/CONTRATOS-IA.md) |
| La IA real (Whisper y Ollama) y su evaluación | [`ia-local/README.md`](ia-local/README.md) |
| Cómo está organizada la app y sus pruebas | [`app/README.md`](app/README.md) |
| Qué cambió en el servidor al pasar de memoria a MySQL (histórico) | [`servidor/CAMBIOS.md`](servidor/CAMBIOS.md) |

## Cómo correrlo

Hace falta MySQL instalado y encendido. El paso a paso está en:

- **Windows** (servidor, y la app como programa de escritorio):
  [`docs/correr-en-windows.md`](docs/correr-en-windows.md).
- **Mac** (servidor, IA real y la app en el iPhone):
  [`docs/correr-en-mac.md`](docs/correr-en-mac.md).

Sin la IA real, el servidor contesta textos de ejemplo (`IA_MODO=fijo`) y
todo lo demás funciona. Los usuarios de ejemplo y los comandos de pruebas
están en [`servidor/README.md`](servidor/README.md#usuarios-de-ejemplo) y
[`app/README.md`](app/README.md#pruebas).

## Qué cambia frente a las versiones anteriores

Acceso, permisos, firma, entrega, sellado, croquis, captura y resumen
cambiaron frente a la v1 y la v2. La tabla está en
[`docs/antecedentes.md`](docs/antecedentes.md#4-qué-cambia-frente-a-la-v1-y-la-v2),
junto con de dónde viene cada cosa (los hitos del roadmap, el mapeo de
requisitos y la bitácora de decisiones).

## Cómo fluye un parte

1. El elemento entra con su número de empleado y contraseña.
2. Llena la Hoja de incidente, escribiendo o dictando. La IA propone los
   campos y él los confirma.
3. Puede **Guardar borrador** las veces que quiera.
4. Al **Enviar**, pone su firma en trazo y la confirma con la biometría del celular o con su contraseña.
   Desde ahí el parte queda en solo lectura para él.
5. El revisor lo abre:
   - si falta algo, lo **devuelve con nota** y se regresa al paso 2 (hay
     que volver a firmar);
   - si está bien, pone su firma (trazo + biometría o contraseña), el parte se
     **sella** con SHA-256 y se **envía a Dirección**.
6. Dirección lo consulta y puede comprobar que el sello coincide.

El detalle de cada punto, con su ID, está en
[`docs/requerimientos-y-limites.md`](docs/requerimientos-y-limites.md). Antes de
programar, revisen la sección 6 de ese archivo: son las preguntas que las
decisiones todavía no cubren.

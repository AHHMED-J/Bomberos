# Parte digital · Tercera versión

La app, su servidor y los requerimientos definitivos que acordó el equipo
en noviembre de 2026. Donde algo de las carpetas anteriores lo contradiga,
manda esta.

Las versiones anteriores no se tocan: se quedan como registro de cómo
llegamos aquí.

## Estructura

Cada carpeta responde una pregunta:

| Carpeta | Qué hay | Pregunta |
|---|---|---|
| [`docs/`](docs/) | Requerimientos y límites, avances y el diagrama de la app | ¿Qué se pidió y qué se hizo? |
| [`app/`](app/) | La app de celulares, en Flutter | ¿Qué ve y toca el bombero? |
| [`servidor/`](servidor/) | El servidor (Node.js) y las tablas de MySQL | ¿Quién guarda y decide? |
| [`ia-local/`](ia-local/) | La IA real: Whisper y Ollama, y su evaluación | ¿Cómo se dicta de verdad? |
| [`arrancar/`](arrancar/) | Los comandos que prenden todo | ¿Cómo se corre? |

La app nunca habla directo con la base ni con los modelos: siempre pasa por
el servidor.

    app  ──►  servidor  ──►  MySQL              usuarios, firmas y partes
                        └─►  Whisper / Ollama   sólo con la IA real

Documentos:

    docs/requerimientos-y-limites.md   la lista definitiva: decisiones, RF, RNF, límites y preguntas abiertas
    docs/avances-acceso-y-firma.md     lo implementado de acceso, firma, revisión y sellado
    docs/estructura-app.html           el diagrama de la app
    docs/correr-en-windows.md          paso a paso en Windows, debug y release, y las opciones de simulación
    servidor/README.md                 cómo funciona el servidor y su lista de rutas
    servidor/CAMBIOS.md                qué cambió en el servidor al pasar a MySQL
    ia-local/README.md                 la IA real en la Mac

## Cómo correrlo

Hace falta MySQL instalado y encendido. La primera vez, el comando crea
`servidor/.env`: hay que abrirlo, poner el usuario y la contraseña de MySQL
(`DB_USER`, `DB_PASSWORD`) y volver a correrlo.

**En Windows** (servidor, y la app como programa de escritorio):

```powershell
cd 4-tercera-version\arrancar
.\iniciar.ps1 -PrepararBd     # la primera vez; después, sin -PrepararBd
```

y en otra terminal:

```powershell
cd 4-tercera-version\app
flutter run -d windows --dart-define=DATOS=servidor
```

**En Mac** (servidor, IA real y la app en el iPhone, conectado por cable):

```bash
cd 4-tercera-version/arrancar
./correr-app.sh --preparar-bd   # la primera vez; después, sin --preparar-bd
./detener.sh                    # al terminar
```

La IA real necesita lo que explica [`ia-local/README.md`](ia-local/README.md).
Sin eso, el servidor contesta textos de ejemplo (`IA_MODO=fijo`) y todo lo
demás funciona.

Usuarios de ejemplo (los carga `--preparar-bd`): `376285` / `prueba376285`
(bombero) y `300112` / `prueba300112` (capitán, revisor).

Pruebas:

```bash
cd servidor && npm test && npm run probar    # IA y flujo completo contra MySQL
cd app && flutter analyze && flutter test    # la app
```

## Qué cambia

| Tema | Antes (v1 / v2) | Ahora (v3) |
|---|---|---|
| Acceso | Credencial del dispositivo, alta con código de un solo uso y acceso en equipo compartido con QR | Número de empleado y contraseña que entrega Dirección. Sin equipo compartido. |
| Permisos | El encargado asigna Editor o Revisor en "Administrar elementos" | Dirección habilita quién revisa, firma y envía |
| Firma | "Firmar con mi credencial" | Firma en trazo por usuario, confirmada con la biometría del celular o con la contraseña. Firman el autor y el revisor por separado. |
| Entrega | Papelería: todo el lote del turno | Uno por uno: el revisor firma y lo envía directo a Dirección |
| Sellado | SHA-256, resguardo de 10 años y pantalla de Archivo | Solo SHA-256, al validar |
| Croquis | Generado con IA a partir del texto, o dibujado a mano | Mapa por GPS, dirección o coordenadas, con dibujo encima |
| Captura | Teclado, y un botón "Con voz" sin definir | Dictado: voz a texto y llenado de campos con confirmación |
| Resumen | No existía | Resumen para compartir por WhatsApp, fuera del documento oficial |

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

# Parte digital · Tercera versión

Los requerimientos y límites definitivos que acordó el equipo en
noviembre de 2026, para terminar la app. Donde algo de las carpetas
anteriores lo contradiga, manda esta.

Las versiones anteriores no se tocan: se quedan como registro de cómo
llegamos aquí.

## Estructura

    README.md                     este archivo: qué cambia y cómo fluye un parte
    requerimientos-y-limites.md   la lista definitiva: decisiones, RF, RNF,
                                  límites y preguntas abiertas

## Qué cambia

| Tema | Antes (v1 / v2) | Ahora (v3) |
|---|---|---|
| Acceso | Credencial del dispositivo, alta con código de un solo uso y acceso en equipo compartido con QR | Número de empleado y contraseña que entrega Administración. Sin equipo compartido. |
| Permisos | El encargado asigna Editor o Revisor en "Administrar elementos" | Administración habilita quién revisa, firma y envía |
| Firma | "Firmar con mi credencial" | Firma en trazo por usuario, confirmada con huella o PIN. Firman el autor y el revisor por separado. |
| Entrega | Papelería: todo el lote del turno | Uno por uno: el revisor firma y lo envía directo a Administración |
| Sellado | SHA-256, resguardo de 10 años y pantalla de Archivo | Solo SHA-256, al validar |
| Croquis | Generado con IA a partir del texto, o dibujado a mano | Mapa por GPS, dirección o coordenadas, con dibujo encima |
| Captura | Teclado, y un botón "Con voz" sin definir | Dictado: voz a texto y llenado de campos con confirmación |
| Resumen | No existía | Resumen para compartir por WhatsApp, fuera del documento oficial |

## Cómo fluye un parte

1. El elemento entra con su número de empleado y contraseña.
2. Llena la Hoja de incidente, escribiendo o dictando. La IA propone los
   campos y él los confirma.
3. Puede **Guardar borrador** las veces que quiera.
4. Al **Enviar**, pone su firma en trazo y la confirma con huella o PIN.
   Desde ahí el parte queda en solo lectura para él.
5. El revisor lo abre:
   - si falta algo, lo **devuelve con nota** y se regresa al paso 2 (hay
     que volver a firmar);
   - si está bien, pone su firma (trazo + huella o PIN), el parte se
     **sella** con SHA-256 y se **envía a Administración**.
6. Administración lo consulta y puede comprobar que el sello coincide.

El detalle de cada punto, con su ID, está en
[`requerimientos-y-limites.md`](requerimientos-y-limites.md). Antes de
programar, revisen la sección 6 de ese archivo: son las preguntas que las
decisiones todavía no cubren.

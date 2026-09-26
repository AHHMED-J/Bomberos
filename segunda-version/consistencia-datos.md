# Alineación de datos de ejemplo con la base de datos real

Fuente de verdad: `primera-version/app/db/schema.sql` + `seed.sql` (la
base de datos del prototipo funcional). No se modificó ningún archivo de
esa carpeta — sólo se leyeron para copiar sus datos reales a las
pantallas de `segunda-version/`.

## Cambios en base de datos

Ninguno. `schema.sql` y `seed.sql` no se tocaron.

## Cambios por pantalla

| Pantalla | Qué cambió |
|---|---|
| `docs/screens/alta-credencial.html` | Persona de ejemplo: de "Rivera Chávez, Josselyn Alexa · 379219 · Bombero" (ella ya tiene credencial real) a **"Bombero de nuevo ingreso · 381044 · Bombero · Estación Valle Dorado"** — el único usuario real sin credencial en el seed. |
| `docs/screens/acceso-compartido.html` | Lista de "personal con credencial aquí": de Carlos/Ana/Jorge/Mariana (inventados) a los 4 reales credencializados en Estación Central: **Ahhmed (376285), Verónica (380207), Josselyn (379219), Arturo (365239)**. |
| `docs/screens/hoja-incidente.html` | Turno: `Único/[Otro turno]` → `A · B · C · D · Único` (dominio real). Estación: placeholders → `Estación Central/Maneadero/Valle Dorado`. Tipo de servicio: 6 palabras sueltas → los 10 `tipo_servicio.nombre` reales. |
| `docs/screens/mis-documentos.html` | 4 folios inventados (`#482917`…, chocaban con Papelería) → **3 folios reales de Ahhmed**: `PE-2026-0147` (Revisado), `PE-2026-0142` (Corregir), `PE-2026-0141` (Borrador). Se quitó la 4ª fila ("Pendiente"): Ahhmed no tiene ningún parte en ese estado en el seed. |
| `docs/screens/administrar-elementos.html` | De 5 personas inventadas a **2 reales**: Ahhmed (Editor) y Verónica (Editor→Revisor, dropdown abierto) — los dos únicos bomberos reales de División Estructural. Se agregó una nota explicando que Josselyn (la revisora real de esa división) es quien usa esta pantalla, no se administra a sí misma. |
| `docs/screens/revisar-hoja.html` | De un parte inventado (Ana Torres Vega, `#735204`) al parte real **`PE-2026-0143`**: autora Verónica Acevedo Carrillo, Fuga de gas, urbana, Calle Novena 88 Col. Bustamante, descripción real del seed, personal de turno Verónica (380207) + Ahhmed (376285) con sus matrículas correctas. |
| `docs/screens/direccion-menu.html` | Las 7 divisiones pasan a los nombres reales (Estructural, Inspectores, Forestales, Salvavidas, Atención prehospitalaria, Rescate urbano, Investigación de incendios). Turno por defecto: **B → A** — Estructural no tiene nadie real en turno B en el seed (ese es el turno de Elias, en Rescate urbano). |

## Lo que se mantuvo igual (a propósito)

- `docs/screens/direccion-division.html` — ya era real (Estructural +
  A/B/C/D), no necesitaba cambio.
- `docs/screens/papeleria.html` y `direccion-papeleria.html` — **fuera de
  alcance por decisión explícita**: el usuario todavía está definiendo
  el alcance real de "Papelería" (qué tipos de documento cubre). Se
  quedan con su elenco inventado (Carlos/Ana/Jorge/Luis/Mariana) y
  folios `#...` hasta que eso se resuelva por separado. Esto incluye que
  `direccion-papeleria.html` sigue diciendo "Turno B" para División
  Estructural — inconsistente con el resto, pendiente junto con lo
  demás de Papelería.
- Los 433 `style=""` inline de cada pantalla — sin tocar, es un tema de
  metodología CSS aparte, no de datos.

## Por qué se redujeron algunas pantallas

`schema.sql` sólo tiene tabla para "Hoja de incidente" (`parte`). Lista
de asistencia, Notas y Revisión mecánica no existen como tabla todavía.
Además, ningún usuario con `rol='revisor'` aparece jamás como autor de
un parte en los datos reales — sólo revisan. Por eso Administrar
Elementos pasó de 5 filas a 2, y Mis Documentos de 4 a 3: son los únicos
datos que el schema real respalda para División Estructural.

## Verificación hecha

- Ninguna matrícula se repite con un valor distinto entre las pantallas
  tocadas (376285, 380207, 379219, 365239, 381044 — cada una consistente
  en todos sus usos).
- Ningún folio `PE-2026-####` se reutiliza para dos documentos.
- Josselyn y Elias (los dos `revisor` reales) no aparecen como autores
  de ningún documento en las pantallas tocadas.
- `python3 build.py` corre limpio; balance de tags OK en las 14
  pantallas + `docs/prototipo.html`.

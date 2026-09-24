# Parte digital · Segunda versión

Rediseño en curso, a partir de las pantallas nuevas ("App Bomberos Ensenada
— Pantallas.pdf"): login con contraseña, documentos organizados por
división (Hoja de incidente, Lista de asistencia, Notas, Revisión
mecánica), "Administrar elementos" (roles Editor/Revisor por persona),
"Papelería" como entrega por lote, y la vista de Dirección organizada por
división → turno → fecha.

`primera-version/` sigue siendo la versión publicada y funcional; nada de
ahí se toca mientras se construye esta.

## Estructura

    docs/
      prototipo.html    el clic-through completo: barra lateral + marco de
                         teléfono + las doce pantallas (generado)
      screens/           una pantalla por archivo; cada una abre sola, con
                          la pantalla ya visible (sin marco de teléfono)
      css/
        tokens.css        variables de color
        base.css          reset y tipografía
        nav.css           la barra lateral (sólo la usa prototipo.html)
        frame.css         marco de teléfono + qué pantalla se ve
      img/                imágenes reales (antes venían embebidas en base64)
    manifest.json         qué grupo y qué archivo es cada pantalla
    build.py               genera docs/prototipo.html

Mismo patrón que `primera-version/`: las pantallas sueltas son la fuente, y
`build.py` arma la hoja combinada a partir de `manifest.json`. Es la
migración 1:1 del primer prototipo de un solo archivo que subió el equipo
(`Prototipo_Bomberos_Ensenada.html`, de clic con teclas de hash) — el
contenido de cada pantalla no cambió, sólo el acomodo de los archivos. Los
433 `style="…"` inline que traía cada elemento **no se tocaron**: separar
eso en clases reutilizables es una decisión de diseño aparte, no de
estructura de archivos.

- **Ver o ajustar una pantalla:** abre `docs/screens/<archivo>.html` en el
  navegador.
- **Regenerar el prototipo combinado:** `python3 build.py` (desde
  `segunda-version/`). Escribe `docs/prototipo.html`.
- **Agregar una pantalla:** crea el archivo en `docs/screens/` copiando la
  estructura de otro (`<body class="preview">`, con la `<section
  class="pantalla visible" id="…">` adentro), regístrala en
  `manifest.json` (dentro del grupo que le toque) y vuelve a correr el
  build.

## Qué le falta al diseño nuevo frente a lo que ya existe en `primera-version/app/`

Comparación hecha el 23 de septiembre de 2026, contra el PDF de 12 pantallas.
Antes de dar por bueno el rediseño, hay que decidir qué de esto se recupera:

1. **Autenticación** — el PDF usa usuario + contraseña. `primera-version/app/`
   tiene alta de credencial con código de un solo uso, y acceso en equipo
   compartido vía QR + confirmación en el propio teléfono (simulación de
   WebAuthn). Ninguno de los dos aparece en el PDF.
2. **Firma** — el PDF sólo dice "Toca para firmar" (trazo). La versión
   anterior tiene sello digital con huella/PIN del dispositivo, ligado a un
   `credential_id`.
3. **Sellado y resguardo legal** — no aparece en el PDF. La versión anterior
   sella el documento al validarlo (hash SHA-256, resguardo de 10 años) y
   tiene una pantalla de Archivo dedicada.
4. **Bandeja de revisión dedicada** — el PDF la reemplaza por "Papelería"
   (entrega por lote). Se pierde la nota de corrección visible por pendiente
   ("Devuelto ayer: falta la hora de control del fuego") y el filtro por
   división del revisor.
5. **Consulta, filtros y exportación de Dirección** — el hueco más grande:
   el PDF no tiene ni un botón de buscar, filtrar o exportar. La versión
   anterior cubre esto con RF-10 (texto completo, fecha, tipo, unidad, C5,
   NUC).
6. **Detalle completo de un parte para Dirección** — no hay equivalente
   claro a `/direccion/partes/:id` en el PDF.

## Qué agrega el diseño nuevo que antes no existía

- "Administrar elementos": asignar Editor/Revisor por persona, por división.
- "Papelería": entrega de todo el lote del día de una división/turno.
- 3 tipos de documento nuevos como flujos propios: Lista de asistencia,
  Notas, Revisión mecánica (antes sólo se digitalizaba la Hoja de
  incidente).

## Próximos pasos

- [ ] Decidir cuáles de los 6 puntos que faltan se recuperan y cuáles se
      dejan fuera a propósito (documentarlo aquí).
- [x] Estructura de carpetas para esta versión — pantallas sueltas + css
      compartido + `build.py`, igual que `primera-version/`.
- [x] Wireframes/mockups estáticos antes de tocar código — el clic-through
      de doce pantallas ya está, ver `docs/prototipo.html`.
- [ ] ¿Se reutiliza el stack de `app/` (Node/Express/MySQL) para hacerlo
      funcional, o cambia?

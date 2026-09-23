# Parte digital · Segunda versión

Rediseño en curso, a partir de las pantallas nuevas ("App Bomberos Ensenada
— Pantallas.pdf"): login con contraseña, documentos organizados por
división (Hoja de incidente, Lista de asistencia, Notas, Revisión
mecánica), "Administrar elementos" (roles Editor/Revisor por persona),
"Papelería" como entrega por lote, y la vista de Dirección organizada por
división → turno → fecha.

Todavía no hay código aquí — esta carpeta arranca vacía a propósito.
`primera-version/` sigue siendo la versión publicada y funcional; nada de
ahí se toca mientras se construye esta.

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
- [ ] Estructura de carpetas para esta versión (¿se reutiliza el mismo
      stack de `app/`, o cambia?).
- [ ] Wireframes/mockups estáticos antes de tocar código, igual que se hizo
      en la primera versión.

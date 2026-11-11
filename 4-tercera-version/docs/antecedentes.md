# Antecedentes · De dónde viene la tercera versión

La tercera versión no salió de cero: junta lo que dejaron la primera y la
segunda versión, los Actos II y III de la materia y la bitácora de
decisiones del equipo. Este documento dice de dónde viene cada cosa y qué
pasó con ella, para que las referencias de los demás documentos ("hito 4",
"mapeo #2", "la v1") se entiendan sin buscar.

Las carpetas anteriores no se editan: se quedan como registro. Donde digan
otra cosa, manda [`requerimientos-y-limites.md`](requerimientos-y-limites.md).

**Cómo se nombran las cosas en los documentos de la v3:**

| Se dice | Es |
|---|---|
| **v1** | [`1-primera-version/`](../../1-primera-version/): mockups web, prototipo funcional (Node, Express, EJS, MySQL) e investigación de usuarios. Sus requerimientos están en el **Avance de Proyecto No. 1** (`1-primera-version/docs/avance-proyecto-1.docx`, Tablas 3 y 4). |
| **v2** | [`2-segunda-version/`](../../2-segunda-version/): el rediseño a partir del PDF de pantallas nuevas, más la bitácora [`decisiones.md`](../../2-segunda-version/decisiones.md). |
| **v3** | [`4-tercera-version/`](../): la app Flutter, su servidor con MySQL y la IA local. Antes de reorganizarse se llamaba `app-bomberos/`. |
| **mapeo #N** | El requisito N de [`mapeo-requerimientos.md`](../../1-primera-version/investigacion/Datos-documentos/mapeo-requerimientos.md), de la investigación de la v1. Ver la [sección 2](#2-los-10-requisitos-del-mapeo). |
| **hito N** | El hito N del Roadmap de 6 hitos del Acto II ([`Roadmap_6_hitos.pdf`](../../3-actoNo2/4-Roadmap-6-hitos/Roadmap_6_hitos.pdf)). Ver la [sección 3](#3-los-6-hitos-del-roadmap). |
| **D-NN** | La decisión NN de la sección 1 de [`requerimientos-y-limites.md`](requerimientos-y-limites.md). |
| **RF-NN, RNF-NN** | Requerimientos funcionales y no funcionales. Los números vienen del Avance 1 y la v3 los continúa. |

## 1. Línea de tiempo

| Cuándo | Qué | Dónde | Qué queda en la v3 |
|---|---|---|---|
| Investigación | Entrevista a experto, encuesta, usuario extremo, Roper Dynagram y el mapeo de 10 requisitos | [`1-primera-version/investigacion/`](../../1-primera-version/investigacion/) | Los 10 requisitos del mapeo ([sección 2](#2-los-10-requisitos-del-mapeo)). |
| Primera versión | Mockups web, prototipo funcional con roles, bandeja, sellado y resguardo; Avance de Proyecto No. 1 con RF-01 a RF-10 y RNF-01 a RNF-05 | [`1-primera-version/`](../../1-primera-version/) | Los IDs de RF y RNF, el folio `PE-AAAA-NNNN` y la idea del sellado SHA-256. |
| Segunda versión | Rediseño con login por contraseña, documentos por división, Papelería, "Administrar elementos" y la vista por Dirección | [`2-segunda-version/`](../../2-segunda-version/) | La contraseña y la vista de Dirección. Papelería y "Administrar elementos" salen. |
| Acto II | Prototipado de St. Gallen: CFP, Dark Horse, Funky Prototype, Roadmap de 6 hitos y reflexión | [`3-actoNo2/`](../../3-actoNo2/) | La meta de ≤ 60 s (RNF-02). El roadmap cambia ([sección 3](#3-los-6-hitos-del-roadmap)). |
| Acto III | Experimento científico: prueba A/B del parte multijugador contra el individual | [`3-actoNo3/`](../../3-actoNo3/) | El 8 de noviembre la prueba pasa a **teclado contra dictado**, porque el multijugador no puede ir a producción ([bitácora](../../2-segunda-version/decisiones.md#cambios-del-8-de-noviembre-de-2026)). |
| 22 oct – 10 nov 2026 | Bitácora de decisiones: stack, permisos, experimento, dictado con IA, Flutter, llave en el chip seguro, IA local, croquis | [`2-segunda-version/decisiones.md`](../../2-segunda-version/decisiones.md) | Ver la [sección 6](#6-la-bitácora-de-decisiones). |
| 8 nov 2026 | Prueba mínima de la llave en el chip seguro del iPhone con Face ID | [`probandoFlutter/`](../../probandoFlutter/) | La entrada con biometría (D-05). |
| 9 – 11 nov 2026 | Tercera versión: app Flutter, servidor con MySQL, IA local y requerimientos definitivos | [`4-tercera-version/`](../) | Es la versión actual. |

## 2. Los 10 requisitos del mapeo

Salen de [`mapeo-requerimientos.md`](../../1-primera-version/investigacion/Datos-documentos/mapeo-requerimientos.md)
(investigación de la v1). Aquí solo va el resumen de cada uno y qué pasó
con él en la v3.

| # | Requisito (resumido) | Prioridad | En la v3 |
|---|---|---|---|
| 1 | Capturar el parte desde el sitio y enviarlo directo a los mandos | Alta | Sigue: RF-02, RF-07 y el envío directo a Dirección al validar (D-12). |
| 2 | Copia imprimible en PDF de cada parte, generada sola | Media | Sigue: copia en PDF con el hash del sello al validar (D-15, RF-19). **Pendiente** de programar. |
| 3 | Un solo flujo para los 4 o 5 formatos del turno | Alta | Se reduce a la Hoja de incidente. Lista de asistencia, Notas y Revisión mecánica quedan fuera (pregunta 10 de requerimientos). |
| 4 | Campo opcional de referencia a reglamento por tipo de reporte | Media | No se retomó en la v3 y no hay decisión al respecto. |
| 5 | Permisos por rango, turno, estación y división | Alta | Sigue: Dirección habilita a los revisores (D-06, RF-12) y valida un revisor de la división (D-11). |
| 6 | Diseño que funcione igual en celular, tablet y computadora | Media | Cambia: la app es solo para celulares; la web es solo para Dirección (D-01). |
| 7 | Letras e iconos grandes | Alta | No tiene un RF propio en la v3. |
| 8 | Resguardo de 10 años con baja controlada | Alta | **Fuera.** Solo se guarda el sello SHA-256 (D-14 y sección 4 de requerimientos). |
| 9 | Capturar el parte en menos de 60 s | Alta | Sigue como RNF-02. Lo midió el CFP (hito 1) y el dictado ayuda a cumplirlo. |
| 10 | 100 % funcional solo con celular | Alta | Sigue: D-01 y RNF-04. |

## 3. Los 6 hitos del roadmap

Salen de [`Roadmap_6_hitos.pdf`](../../3-actoNo2/4-Roadmap-6-hitos/Roadmap_6_hitos.pdf)
(Acto II). Como es un PDF, aquí se copia lo esencial de cada hito para
poder citarlo.

| Hito | Qué planeaba el roadmap | Criterio para pasar | Qué cambia en la v3 |
|---|---|---|---|
| **1 · Critical Function Prototype (CFP)** | Formulario mínimo de la Hoja de incidente con Llegada, Regreso, foto y cronómetro de tiempo activo | Mediana de unos 60 s para los campos mínimos y 1 foto | Hecho en el Acto II ([`3-actoNo2/1-CFP/`](../../3-actoNo2/1-CFP/README.md)). Su forma de medir el tiempo activo es la base de RNF-02. |
| **2 · Dark Horse** | Sesión de ideas radicales; salieron 7, entre ellas el parte desde WhatsApp y el parte multijugador | Una idea elegida que se pueda combinar con el CFP: el multijugador | Hecho en el Acto II ([`Dark_Horse_ideas.pdf`](../../3-actoNo2/2-Dark-Horse/Dark_Horse_ideas.pdf)). La idea elegida se descarta después (hito 4). |
| **3 · Funky Prototype** | Tres teléfonos comparten un parte: el jefe lo crea, los demás se unen y cada quien llena su parte | El flujo se entiende sin explicarlo | Hecho en el Acto II ([`3-actoNo2/3-Funky-Prototype/`](../../3-actoNo2/3-Funky-Prototype/README.md)). No sigue en la v3. |
| **4 · Functional Prototype** | Sincronización real entre celulares con un servidor (Node, Express, MySQL), permisos por turno, estación y división | Tres celulares llenan un parte al mismo tiempo sin perder datos | **Sin parte multijugador** (pregunta 9 de requerimientos): no puede ir a producción por temas legales. Sí quedan el servidor real con MySQL, los permisos por división y la revisión. Es lo que hay en `4-tercera-version/`. |
| **5 · X-is-finished Prototype** | La Hoja de incidente terminada: captura multijugador, firma con credencial, envío a Dirección y copia de respaldo para la estación | Un turno real la usa en lugar del papel | Sin multijugador. La firma ya no es "con credencial" sino **trazo + biometría del celular o contraseña** (D-08). El envío es directo al validar (D-12). La copia en PDF sigue (D-15, RF-19). |
| **6 · Final Prototype** | Todos los documentos del turno (incidente, asistencia, notas, revisión mecánica), la vista de Dirección y el archivo con resguardo de 10 años | Validado con el personal y listo para producción | Solo la Hoja de incidente (pregunta 10). La web de Dirección sigue (RF-10, pendiente). El resguardo de 10 años y la pantalla de Archivo quedan fuera. |

## 4. Qué cambia frente a la v1 y la v2

Resumen por tema. El detalle, con su ID, está en las secciones 1 a 4 de
[`requerimientos-y-limites.md`](requerimientos-y-limites.md).

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

## 5. Documentos que la v3 deja atrás

No se editan: se quedan como registro de cómo llegamos aquí. Lo que contradigan, lo resuelve
[`requerimientos-y-limites.md`](requerimientos-y-limites.md).

| Documento | Qué tiene | Qué cambia con la v3 |
|---|---|---|
| `1-primera-version/docs/avance-proyecto-1.docx` | RF-01 a RF-10 y RNF-01 a RNF-05 (Tablas 3 y 4) | RF-01, 04, 05, 07 y 09 cambian; se agregan RF-11 a RF-19 y RNF-06 a RNF-10. |
| `1-primera-version/docs/arquitectura-informacion.pdf` | Alcance (sección 1.3) y rutas por RF (Tabla 3) | Salen `/acceso/estacion`, `/registro` y `/direccion/archivo`. |
| `1-primera-version/investigacion/Datos-documentos/mapeo-requerimientos.md` | 10 requisitos de la investigación con prioridad | El #8 (resguardo de 10 años) queda fuera del prototipo. El #2 (copia en PDF) sigue (RF-19). |
| `1-primera-version/manifest.json` y `README.md` | Qué RF cubre cada pantalla | Acceso compartido y alta de credencial ya no existen. |
| `2-segunda-version/README.md` | Los 6 puntos que faltaban frente a la v1 | Quedan decididos en la sección 1 de requerimientos. |
| `2-segunda-version/consistencia-datos.md` | Papelería fuera de alcance | Papelería se elimina. |
| `3-actoNo2/4-Roadmap-6-hitos/Roadmap_6_hitos.pdf` | Qué entra en cada hito | Cambian los hitos 4, 5 y 6: ver la [sección 3](#3-los-6-hitos-del-roadmap). |

## 6. La bitácora de decisiones

Antes de que existiera `requerimientos-y-limites.md`, las decisiones se
anotaban por fecha en
[`2-segunda-version/decisiones.md`](../../2-segunda-version/decisiones.md).
Ahí está el **porqué** de muchas cosas de la v3. Algunas de esas decisiones
cambiaron después (por ejemplo, la credencial WebAuthn, el código de alta,
Socket.IO y el PIN); en ese caso manda `requerimientos-y-limites.md`.

| Fecha | Qué se decidió | Sección de la bitácora |
|---|---|---|
| 22 oct 2026 | Stack, roles y permisos, qué se recupera de la v1 y la prueba A/B | [Arquitectura](../../2-segunda-version/decisiones.md#arquitectura) y siguientes |
| 8 nov 2026 | App móvil y web solo para Dirección, dictado con IA, el audio se borra al transcribir, la prueba A/B pasa a teclado contra dictado, Flutter y la llave en el chip seguro | [Cambios del 8 de noviembre](../../2-segunda-version/decisiones.md#cambios-del-8-de-noviembre-de-2026) |
| 9 nov 2026 | Esqueleto de la app (`app-bomberos/`, hoy `4-tercera-version/`) | [Esqueleto de la app](../../2-segunda-version/decisiones.md#esqueleto-de-la-app-9-de-noviembre) |
| 10 nov 2026 | "Elaboró" y Capitán, IA local en la Mac, micrófono real, resguardo de 10 años descartado, croquis con ubicación en tiempo real | Últimas secciones de la bitácora |
| 10 – 11 nov 2026 | Decisiones definitivas D-01 a D-20 y respuestas a las preguntas abiertas | [`requerimientos-y-limites.md`](requerimientos-y-limites.md), secciones 1 y 6 |

**Nombres anteriores de las carpetas.** La bitácora y algunos documentos
viejos usan nombres que ya cambiaron:

| Carpeta actual (en `4-tercera-version/`) | Qué hay | Antes |
|---|---|---|
| `docs/` | Requerimientos, avances y el diagrama de la app | sueltos |
| `app/` | La app Flutter | `app-bomberos/movil` |
| `servidor/` | El servidor y las tablas | `app-bomberos/servidor` |
| `ia-local/` | Solo la IA real y su evaluación | `app-bomberos/ia-local` |
| `arrancar/` | Los comandos que prenden todo | dentro de `ia-local` |

Otros nombres que cambiaron:

| Nombre viejo | Nombre actual |
|---|---|
| `3-ACTO 2/` | `3-actoNo2/` |
| `Acto III - Ficha de Experimento.pdf` (en la raíz) | `3-actoNo3/Acto III - Ficha de Experimento.pdf` |
| "Administración" | "Dirección" (D-07) |

El cambio del servidor de guardar en memoria a guardar en MySQL quedó
descrito en [`servidor/CAMBIOS.md`](../servidor/CAMBIOS.md).

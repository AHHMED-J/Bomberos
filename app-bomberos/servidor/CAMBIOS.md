# Cambios al servidor frente al original

Qué cambió en `app-bomberos/servidor` en la rama `tercera-version-biometria`
frente al que está en `main`. Son 20 archivos: 9 modificados y 11 nuevos.

## En resumen

| | Original (`main`) | Ahora |
|---|---|---|
| Dónde guarda | En memoria: se pierde al reiniciar | En MySQL |
| Cómo se entra la primera vez | Código de alta de un solo uso | Número de empleado y contraseña |
| Contraseña | No había | Guardada con bcrypt; el usuario la puede cambiar |
| Llave del celular | Se registraba con el código | Se registra después de entrar con contraseña; una por usuario |
| Firma en trazo | La mandaba el revisor en cada validación | Cada usuario sube la suya; el servidor la copia al parte |
| Cómo se confirma una firma | Solo con la llave del celular | Con la llave del celular (biometría) o con la contraseña |
| Sello | Contenido + firma + trazo del revisor | Todo el parte: datos, fotos, croquis y las dos firmas con sus trazos |
| Verificar sello | No había | `GET /api/partes/:folio/sello` |
| Express | 4 | 5 |

## Lo que no cambió

- Las rutas de la IA (`src/rutas/ia.js`, `src/ia/`) y `CONTRATOS-IA.md`.
- `src/validacion.js`: la revisión del parte y el contenido que se firma.
- El formato del reto (16 bytes al azar + `:` + `acceso` o el hash del
  contenido) y su vigencia de 5 minutos.
- El puerto (3100), `/api/salud`, y las respuestas de las rutas que la app ya
  usaba para folios, listas, bandeja y devolver.
- Las firmas simuladas (`SIMULADA:…`) se siguen aceptando salvo con
  `MODO_PRUEBA=0`.
- `test/ia-verificacion.test.js`: sus 17 pruebas siguen pasando.

## Rutas

**Se quitaron**

| Ruta | Por qué |
|---|---|
| `GET /api/acceso/codigo/:codigo` | Ya no hay código de alta. |
| `POST /api/acceso/alta` | La llave se registra con `/api/acceso/llave`. |

**Nuevas**

| Ruta | Para qué |
|---|---|
| `POST /api/acceso/entrar` | Entrar con `no_empleado` (la matrícula) y `contrasena`. |
| `POST /api/acceso/llave` | Registrar la llave pública del celular. Pide sesión. Si el usuario ya tiene una, contesta `ya_tiene_celular`. |
| `POST /api/acceso/contrasena` | Cambiar la contraseña (`actual`, `nueva`). Pide sesión. |
| `POST /api/acceso/trazo` | Subir o actualizar la firma en trazo. Pide sesión. |
| `GET /api/partes/:folio/sello` | Volver a sacar el sello y decir si coincide con el guardado. |

**Las mismas, con cambios**

| Ruta | Qué cambió |
|---|---|
| `POST /api/acceso/verificar` | Solo acepta retos de acceso. El `usuario` que devuelve trae además `trazo` y `tiene_llave`. |
| `POST /api/partes/folio` | El folio lleva el año en curso y sale de un contador en la base. |
| `POST /api/partes/:folio/enviar` | Acepta `firma` o `contrasena`. Pide que quien elabora tenga su firma en trazo y la copia al parte (`firmas.elaboro_trazo`). No deja reenviar un parte ya enviado o validado. Errores nuevos: `ya_enviado`, `falta_trazo`, `usuario_desconocido`, `contrasena_incorrecta`. |
| `POST /api/revision/:folio/devolver` | Solo devuelve partes que están en `enviado` (`no_espera_revision`). |
| `POST /api/revision/:folio/validar` | Ya no recibe `trazo`: usa el de la cuenta del revisor. Acepta `firma` o `contrasena`. Solo valida un capitán de la división del parte que no sea quien lo llenó. Guarda en el parte `revisor_id`, `revisor_nombre`, `revisor_trazo` y `validado_en`. Errores nuevos: `no_espera_revision`, `no_es_revisor`, `es_su_parte`, `otra_division`, `falta_trazo`, `contrasena_incorrecta`. |

## Archivos

**Modificados**

| Archivo | Qué cambió |
|---|---|
| `servidor.js` | Carga el `.env`, exporta `crearApp()` para las pruebas y, al arrancar, avisa si MySQL no está listo. |
| `src/datos.js` | Era la "base" en memoria. Ahora son las funciones que leen y escriben en MySQL. |
| `src/firma.js` | Los retos se guardan en la tabla `reto`. Se agrega la confirmación con contraseña. |
| `src/rutas/acceso.js` | Entrar, llave, contraseña y trazo en lugar de código y alta. |
| `src/rutas/partes.js` | Enviar con biometría o contraseña, copia del trazo y verificar sello. |
| `src/rutas/revision.js` | Reglas de revisión, trazo de la cuenta y sello de todo el parte. |
| `.env.example` | Se agregan `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y `MODO_PRUEBA`. |
| `package.json` y `package-lock.json` | Express 5, `mysql2`, `bcryptjs`, Node 20.12 o más, y los comandos `db:crear`, `datos-prueba`, `usuario` y `probar`. |

**Nuevos**

| Archivo | Qué es |
|---|---|
| `src/datos-ejemplo.js` | Los usuarios y partes de ejemplo que antes vivían en `src/datos.js`. |
| `src/db.js` | La conexión a MySQL. |
| `src/entorno.js` | Carga el `.env`. |
| `src/sello.js` | El cálculo del sello. |
| `db/schema.sql` | Las tablas: `usuario`, `sesion`, `reto`, `parte`, `firma_parte` y `consecutivo`. |
| `scripts/cargar-bd.js` | `npm run db:crear`: crea la base y las tablas sin borrar nada. |
| `scripts/datos-prueba.js` | `npm run datos-prueba`: carga los datos de ejemplo. |
| `scripts/usuario.js` | `npm run usuario`: alta y restablecer, lo que hace Dirección. |
| `scripts/probar-flujo.js` | `npm run probar`: 29 pruebas de punta a punta contra MySQL. |
| `README.md` | Cómo prepararlo, correrlo y la lista de rutas. |
| `CAMBIOS.md` | Este archivo. |

## Qué hacer al bajar esta rama

1. Tener MySQL instalado y prendido.
2. `npm install` (cambiaron las dependencias).
3. Agregar al `.env` que ya tienes las líneas `DB_…` de `.env.example`, con
   el usuario y la contraseña de tu MySQL.
4. `npm run db:crear` y `npm run datos-prueba`.
5. `npm start`, o `ia-local/correr-app.sh` como siempre.

Los usuarios de ejemplo entran con su matrícula y la contraseña
`prueba<matrícula>`, por ejemplo `376285` / `prueba376285`.

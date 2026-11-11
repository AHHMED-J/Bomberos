# Avances · Servidor de la tercera versión

BomberosApp · 10 de noviembre de 2026

## 1. Notas de la tercera versión

Se agregaron a las notas de requerimientos:

- La única forma de entrar a mano es con el número de empleado y la
  contraseña.
- Después, para abrir la app basta con la biometría del celular (huella o
  cara) o con el PIN del celular. La app no tiene un PIN propio.
- Para firmar un parte también se pide la biometría o el PIN del celular.
  El celular los verifica; la app nunca los ve ni los guarda.

## 2. Servidor con base de datos

Carpeta [`servidor/`](servidor/). Node.js, Express 5 y MySQL.

El servidor que ya estaba en el repositorio (`app-bomberos/servidor`) guarda
todo en memoria: al reiniciarlo se pierden las llaves, las sesiones y los
partes. Este servidor contesta **las mismas rutas con las mismas
respuestas**, pero guarda en MySQL. La app funciona con él sin cambiarle
nada.

### Cómo se confirma la identidad

1. La app crea un par de llaves en el chip seguro del celular y manda al
   servidor solo la llave pública.
2. Para entrar o firmar, el servidor manda un **reto**: un texto al azar
   que, si es para un parte, lleva el hash SHA-256 de su contenido.
3. El celular pide la huella, la cara o el PIN del teléfono, y solo entonces
   deja usar la llave para firmar el reto.
4. El servidor comprueba la firma con la llave pública guardada.

Cada reto vale 5 minutos y se puede usar una sola vez. Ahora los retos están
en la base, así que siguen valiendo una sola vez aunque el servidor se
reinicie.

### Lo que hace, ruta por ruta

| Ruta | Para qué |
|---|---|
| `GET /api/acceso/codigo/:codigo` | A quién pertenece un código de alta. |
| `POST /api/acceso/alta` | Registrar la llave pública del celular con el código. |
| `POST /api/acceso/reto` | Pedir el reto para entrar. |
| `POST /api/acceso/verificar` | Mandar la firma del reto y recibir la sesión. |
| `POST /api/acceso/entrar` | **Nueva.** Entrada manual con número de empleado y contraseña. |
| `POST /api/partes/folio` | Un folio nuevo. |
| `GET /api/partes?usuario=…` | Los partes de un usuario. |
| `POST /api/partes/:folio/reto` | El reto para firmar el parte. |
| `POST /api/partes/:folio/enviar` | Revisar el parte, comprobar la firma y mandarlo a revisión. |
| `GET /api/revision/bandeja` | Los partes de una división. |
| `POST /api/revision/:folio/devolver` | Devolverlo con una nota. |
| `POST /api/revision/:folio/validar` | Firma del revisor (llave del celular + trazo) y sello SHA-256. |
| `POST /api/ia/…` | Dictado, llenado de campos y resumen. |

### Lo que se reutiliza del servidor de la app

No se copió código: se carga directo de `app-bomberos/servidor`.

- La revisión del parte antes de enviarlo y el contenido que se firma, que
  tiene que coincidir byte a byte con la app.
- Las rutas de la IA, con su misma configuración.

### Lo que agrega

- **Entrada manual** con número de empleado y contraseña. La contraseña se
  guarda con bcrypt. Si falla el número o la contraseña, el mensaje es el
  mismo.
- **Varios celulares por usuario.** Dar de alta otro celular no desactiva
  el anterior.
- **Reglas de revisión de las notas:**
  - un parte enviado o validado no se puede volver a enviar, a menos que se
    devuelva;
  - solo valida un revisor;
  - nadie valida un parte que llenó él mismo.
- **Evidencia de cada firma.** Se guarda quién firmó, con qué reto, la
  firma del celular y, en la del revisor, su trazo.
- **Folios** con el año en curso, que no se repiten aunque dos celulares
  pidan uno al mismo tiempo.

### Base de datos

| Tabla | Qué guarda |
|---|---|
| `usuario` | Id, nombre, matrícula (número de empleado), rango, rol, división, estación y contraseña (bcrypt). |
| `codigo_alta` | Los códigos de un solo uso y cuándo se usaron. |
| `llave` | Las llaves públicas de los celulares de cada usuario. |
| `sesion` | Las sesiones abiertas (solo el hash del token). |
| `reto` | Cada reto, cuándo se creó y cuándo se usó. |
| `parte` | El parte completo, tal como lo manda la app, con su estado, autor y división. |
| `firma_parte` | Las firmas del autor y del revisor, con su evidencia. |
| `consecutivo` | El siguiente número de folio. |

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run db:crear` | Crea la base y sus tablas sin borrar nada. |
| `npm run datos-prueba` | Carga los mismos usuarios, código de alta y partes de ejemplo que trae el servidor de la app. |
| `npm run usuario -- alta …` | Da de alta a un usuario e imprime su contraseña y su código de alta. Lo hace Dirección. |
| `npm run usuario -- codigo …` | Otro código de alta, para otro celular. |
| `npm run usuario -- restablecer …` | Contraseña nueva para quien olvidó la suya. |
| `npm run probar` | Corre la prueba de punta a punta. |

## 3. Pruebas

Las 26 pruebas de punta a punta pasan contra MySQL 8.0. Hacen las mismas
llamadas que hace la app. Los celulares se simulan con llaves P-256 hechas
en Node, que entregan la llave y la firma en el mismo formato que la app.
Cubren:

- **Alta del celular:** código que no existe; a quién pertenece; registrar
  la llave; el código no sirve dos veces.
- **Entrar con el celular:** firma correcta; firma de otra llave; reto
  reusado, desconocido y vencido; firma simulada del modo prueba.
- **Varios celulares:** el segundo no desactiva al primero.
- **Entrada manual:** contraseña equivocada y correcta.
- **Enviar:** folios que no se repiten; parte con pendientes; contenido
  cambiado después de firmar; firma de otra persona; envío correcto; doble
  envío.
- **Listas:** "mis partes" y la bandeja de la división.
- **Revisión:** devolver con nota; corregir y volver a firmar; validar sin
  trazo, sin ser revisor, siendo el autor o con la firma de otro; validar y
  sellar.
- **Evidencia:** las firmas quedan guardadas.
- **IA:** las rutas contestan.

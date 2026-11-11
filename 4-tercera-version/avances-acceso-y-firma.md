# Avances · Acceso y firma con la biometría o el PIN del celular

Tercera versión de BomberosApp · 10 de noviembre de 2026

## 1. Notas de la tercera versión

Se agregaron a las notas de requerimientos:

- La única forma de entrar a mano es con el número de empleado y la
  contraseña. Así se entra la primera vez en cada celular.
- Después, para abrir la app basta con la biometría del celular (huella o
  cara) o con el PIN del celular. La app no tiene un PIN propio.
- Para firmar un parte también se pide la biometría o el PIN del celular.
  El celular los verifica; la app nunca los ve ni los guarda.

## 2. Servidor de acceso y firma

Carpeta [`servidor/`](servidor/). Node.js, Express 5 y MySQL.

### Cómo se confirma la identidad

1. La app crea un par de llaves en el chip seguro del celular (Secure
   Enclave en iPhone, Android Keystore en Android) y manda al servidor solo
   la llave pública.
2. Para entrar o firmar, el servidor manda un **reto**: un mensaje único que
   dice qué se va a hacer, quién, desde qué celular y, si es un parte, cuál y
   con qué contenido.
3. El celular pide la huella, la cara o el PIN del teléfono, y solo entonces
   deja usar la llave para firmar el reto.
4. El servidor comprueba la firma con la llave pública guardada.

Cada reto vale 2 minutos y se puede usar una sola vez.

### Entrada manual

- Número de empleado y contraseña.
- La contraseña se guarda con bcrypt.
- Si el número o la contraseña están mal, el mensaje es el mismo:
  "Número de empleado o contraseña incorrectos".

### Registro del celular

- Después de entrar con contraseña, la app registra la llave pública de ese
  celular.
- Se acepta la llave EC P-256 en base64 o en PEM, que es el formato que
  entrega `biometric_signature`, el paquete que usa la app.
- El servidor le entrega al celular una clave propia. En la base se guarda
  solo su hash SHA-256.
- Un usuario puede tener más de un celular registrado.

### Entrar con la biometría o el PIN del celular

1. El celular pide un reto con su clave.
2. El celular firma el reto.
3. El servidor comprueba la firma y abre una sesión de 12 horas.

### Firma del parte

El parte lo firman dos personas por separado, con el mismo mecanismo:

| Quién | Acción | Qué pasa |
|---|---|---|
| Quien lo llenó | **Enviar** | El parte pasa a revisión. |
| El revisor | **Validar** | El parte queda validado y enviado a Dirección. |

- El reto lleva el folio del parte y el hash SHA-256 de su contenido. El
  revisor firma el contenido junto con la firma del autor.
- Al firmar, el servidor vuelve a sacar el hash. Si el parte cambió entre el
  reto y la firma, la firma no entra.
- Cada firma guarda:
  - una copia de la firma en trazo de ese momento,
  - el celular con que se hizo,
  - el reto,
  - la firma criptográfica.

  Con eso se puede volver a comprobar después, y si el usuario cambia su
  trazo, los partes anteriores no cambian.
- Si un parte devuelto se vuelve a enviar, la firma anterior del autor queda
  anulada, pero no se borra.

Reglas de las notas que revisa el servidor:

- Solo quien llenó el parte lo puede enviar.
- Solo valida quien Dirección habilitó como revisor.
- Nadie revisa un parte que llenó él mismo.
- El revisor tiene que ser de la división del parte.
- Para firmar hay que tener la firma en trazo y un celular registrado.

### Base de datos

| Tabla | Qué guarda |
|---|---|
| `usuario` | Número de empleado, nombre, contraseña (bcrypt), si puede revisar, división y firma en trazo. |
| `division` | Las divisiones. |
| `dispositivo` | Los celulares de cada usuario: llave pública y hash de su clave. |
| `sesion` | Las sesiones abiertas (solo el hash del token). |
| `reto` | Cada reto: acción, parte, hash del contenido, mensaje, vencimiento y cuándo se usó. |
| `firma_parte` | Las firmas del autor y del revisor, con su evidencia. |
| `parte` | Versión mínima, solo para probar la firma. |

### Rutas

| Ruta | Para qué |
|---|---|
| `POST /api/acceso/entrar` | Entrada manual con número de empleado y contraseña. |
| `POST /api/acceso/dispositivo` | Registrar la llave pública del celular. |
| `POST /api/acceso/reto` | Pedir el reto para entrar. |
| `POST /api/acceso/desbloquear` | Mandar la firma del reto y recibir la sesión. |
| `POST /api/acceso/salir` | Cerrar la sesión. |
| `POST /api/partes/:id/reto` | Pedir el reto para Enviar o Validar un parte. |
| `POST /api/partes/:id/firmar` | Mandar la firma y cambiar el estado del parte. |

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run db:crear` | Crea la base y sus tablas sin borrar nada. |
| `npm run datos-prueba` | Crea un elemento, un revisor y un parte en borrador. |
| `npm run usuario -- alta …` | Da de alta a un usuario e imprime su contraseña. Lo hace Dirección. |
| `npm run usuario -- restablecer …` | Le da una contraseña nueva a quien olvidó la suya. |
| `npm run probar` | Corre la prueba de punta a punta. |

## 3. Pruebas

Las 25 pruebas de punta a punta pasan contra MySQL 8.0. Los celulares se
simulan con llaves P-256 hechas en Node, iguales a las del chip seguro.
Cubren:

- **Entrada manual:** contraseña equivocada y correcta.
- **Registro del celular:** se rechaza una llave que no es P-256 y se acepta
  una en PEM.
- **Entrar con el celular:** firma correcta; firma de otra llave; reto
  reusado; reto vencido; reto sin firma; celular no registrado.
- **Firma del autor y del revisor:** parte enviado y validado; el parte
  cambió entre el reto y la firma; el autor intenta validar; alguien revisa
  su propio parte; el autor intenta enviar dos veces.
- **Evidencia:** las dos firmas se comprueban otra vez desde la base.
- **Varios celulares:** registrar un segundo celular no desactiva el
  primero.
- **Sesión:** cerrar sesión.

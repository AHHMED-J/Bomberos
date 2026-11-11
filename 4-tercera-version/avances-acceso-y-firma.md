# Avances · Acceso, firma, revisión y sellado

Tercera versión de BomberosApp · 10 de noviembre de 2026

## 1. Acceso del usuario

- Ya no hay código de alta. Dirección da de alta al usuario y le entrega su
  usuario (su número de empleado) y su contraseña.
- **Pantalla de acceso nueva** en la app: número de empleado, contraseña y
  botón Entrar.
- El usuario puede **cambiar su contraseña** desde la pantalla nueva
  **Mi cuenta**, o quedarse con la que le dieron.
- Si la olvida, Dirección le da una nueva.
- **Un celular por usuario.** Al entrar con contraseña, la app crea una
  llave en el chip seguro del celular y registra la pública en el servidor.
  Desde entonces, en ese celular también se entra con la biometría.
- La contraseña se guarda con bcrypt. La huella y la cara nunca salen del
  celular.

## 2. Firma

- Cada usuario tiene **su firma en trazo**, que sube y actualiza desde
  Mi cuenta. Se guarda en el servidor, ligada a su usuario.
- Esa firma es la que se pone en el parte: la del autor al Enviar y la del
  revisor al Validar.
- Antes de ponerla, se le pide **la biometría del celular o su contraseña**.
- Cada parte guarda una copia de las firmas con las que se firmó. Si el
  usuario actualiza su firma, sus partes anteriores no cambian.
- El propietario y el testigo siguen firmando con el dedo, sin biometría ni
  contraseña.

Cómo se confirma: el servidor entrega un reto que lleva el hash SHA-256 del
contenido del parte. El usuario lo confirma con la llave de su celular
(biometría) o con su contraseña. El reto vale 5 minutos y una sola vez, y si
el contenido cambió después, la firma no entra.

## 3. Revisión y envío

- El parte lo firman dos personas por separado: quien lo llena y el revisor.
- Enviado, quien lo llenó ya no lo puede volver a enviar, a menos que se lo
  devuelvan.
- El revisor lo **devuelve con una nota**, o pone su firma y el parte queda
  **validado y enviado a Dirección**.
- Si se devuelve, quien lo llenó lo corrige y vuelve a firmar.
- Solo valida un revisor de la división del parte, y nunca quien lo llenó.
- En la pantalla de validar, el revisor ve la firma de quien elaboró.

## 4. Sellado

- Al validar, el servidor saca el SHA-256 de todo el parte, siempre en el
  mismo orden: los datos, el número de fotos, lo que trae del croquis, y
  las firmas del autor y del revisor con sus trazos.
- Un parte devuelto no se sella.
- **Verificar sello**: una ruta que vuelve a sacar el hash del parte y dice
  si coincide con el guardado.

## 5. Dónde quedó cada cosa

| Qué | Dónde |
|---|---|
| Servidor (Node.js, Express 5, MySQL) | [`servidor/`](servidor/) |
| Pantalla de acceso | `app-bomberos/movil/lib/acceso/pantallas_acceso.dart` |
| Mi cuenta: mi firma y cambiar contraseña | `app-bomberos/movil/lib/acceso/pantalla_cuenta.dart` |
| Confirmar con biometría o contraseña | `app-bomberos/movil/lib/acceso/confirmar_identidad.dart` |
| Firmar y enviar | `app-bomberos/movil/lib/hoja/pantallas_envio.dart` |
| Firmar y validar | `app-bomberos/movil/lib/revision/` |

El croquis y la IA de la app no se tocaron. El servidor carga las rutas de
la IA y la revisión del parte directo de `app-bomberos/servidor`.

Base de datos:

| Tabla | Qué guarda |
|---|---|
| `usuario` | Matrícula (número de empleado), nombre, rango, rol, división, estación, contraseña (bcrypt), la llave pública de su celular y su firma en trazo. |
| `sesion` | Las sesiones abiertas (solo el hash del token). |
| `reto` | Cada reto, cuándo se creó y cuándo se usó. |
| `parte` | El parte completo, tal como lo manda la app, con sus firmas y su sello. |
| `firma_parte` | Cada firma: quién, con qué reto, cómo la confirmó y la copia de su trazo. |
| `consecutivo` | El siguiente número de folio. |

## 6. Pruebas

**Servidor:** las 29 pruebas de punta a punta pasan contra MySQL 8.0. Hacen
las mismas llamadas que la app; el celular se simula con una llave P-256.
Cubren:

- **Acceso:** usuario o contraseña equivocados; entrada correcta; cambio de
  contraseña; las rutas de la cuenta piden sesión.
- **Biometría:** registrar la llave del celular y solo una; entrar firmando
  el reto; firma de otra llave; retos usados, desconocidos y vencidos.
- **Firma del autor:** sin firma en trazo no envía; subir la firma; parte
  con pendientes; contenido cambiado; firma o contraseña de otro; envío con
  biometría; doble envío.
- **Revisión:** devolver con nota; no validar un devuelto; corregir y volver
  a firmar con contraseña y firma actualizada; solo valida un revisor de la
  división que no sea el autor; contraseña equivocada; validar con
  contraseña.
- **Sellado:** el sello coincide; sigue coincidiendo si el usuario cambia
  su firma después; deja de coincidir si alguien cambia un dato, una firma,
  el croquis o las fotos.
- **Dirección:** restablecer la contraseña.

**App:** las pantallas quedaron escritas, pero falta compilarlas y correr
`flutter analyze` y `flutter test`.

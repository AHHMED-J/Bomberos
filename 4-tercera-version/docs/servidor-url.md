# Conectar la app con el servidor: `SERVIDOR_URL`

Qué dirección ponerle a la app según dónde corra, y qué cuidar para que el
celular llegue al servidor.

## Qué es

`SERVIDOR_URL` es la dirección del servidor: la compu donde corre
`servidor/` y el puerto (3100). Es lo único que la app necesita saber para
hablar con él.

    celular  ──SERVIDOR_URL──►  servidor  ──.env──►  MySQL

- **El celular** sabe dónde está el servidor por `SERVIDOR_URL`.
- **El servidor** sabe dónde está MySQL por su `.env`.
- **El celular nunca habla con MySQL**, así que la base no se configura en
  la app.

Si no se pone, vale `http://localhost:3100`.

## Cómo se pone

Al correr o compilar la app:

```
flutter run --dart-define=SERVIDOR_URL=http://192.168.1.20:3100 --dart-define=DATOS=servidor
```

- **En release** queda grabada dentro de la app. Si la dirección cambia, hay
  que volver a compilar.
- **En debug** también se puede cambiar sin compilar: pantalla de acceso →
  "Depuración: entrar como…" → campo "URL del servidor". Al cambiarla se
  pierde la sesión; hay que volver a entrar.
- **En la Mac**, `arrancar/correr-app.sh` detecta la IP y la pone solo.

## Qué dirección poner

| Dónde corre la app | `SERVIDOR_URL` | Por qué |
|---|---|---|
| Programa de Windows, en la misma compu que el servidor | No hace falta | `localhost` es esa misma compu |
| Simulador de iPhone, en la Mac del servidor | No hace falta | El simulador comparte la red de la Mac |
| Emulador de Android | `http://10.0.2.2:3100` | Dentro del emulador, `localhost` es el emulador; `10.0.2.2` es la compu |
| Android por cable, con `adb reverse tcp:3100 tcp:3100` | No hace falta | `adb reverse` hace que `localhost` del celular llegue a la compu |
| iPhone o Android de verdad, en la misma Wi-Fi | `http://<IP de la compu>:3100` | El celular llega a la compu por la red |
| Celular fuera de la red de la compu | La dirección pública de un servidor en internet | No está hecho todavía (ver al final) |

**`localhost` siempre es "este mismo aparato".** En un celular, `localhost`
es el celular, no la compu. Por eso un celular de verdad necesita la IP.

### Sacar la IP de la compu

- **Windows:** `ipconfig` → "Dirección IPv4" del adaptador de Wi-Fi (algo
  como `192.168.1.20`).
- **Mac:** `ipconfig getifaddr en0`.

Para comprobar que el celular llega, abre en su navegador
`http://<IP>:3100/api/salud`. Si contesta `{"ok":true,…}`, la app también
va a llegar.

## Consideraciones

### La red

- **La compu y el celular deben estar en la misma Wi-Fi.**
- **Algunas redes no dejan que los aparatos se vean entre sí**: las de la
  universidad, hoteles o redes de invitados. Ahí la app no llega aunque la
  IP esté bien. La salida más simple es compartir internet desde un celular
  (hotspot) y conectar ahí la compu y el teléfono.
- **La IP cambia** al cambiar de red, y a veces al reconectarse a la misma.
  Antes de presentar, revísala otra vez. En release, si cambió, hay que
  compilar de nuevo.

### El firewall de Windows

- **La primera vez** que un celular intenta conectarse, Windows puede pedir
  permiso para Node.js. Acéptalo para **redes privadas**.
- **Si ya lo negaste,** el celular no llega. Se arregla en "Firewall de
  Windows Defender" → "Permitir una aplicación" → Node.js en redes privadas.
- **El servidor escucha en todas las interfaces** (`0.0.0.0`), así que no
  hay que configurar nada más en él.

### iPhone

- **La primera vez,** iOS pide permiso para "buscar dispositivos en la red
  local". Si se niega, la app no llega a la compu. Se reactiva en
  Configuración → Privacidad → Red local.
- **Ya está permitido usar `http`** en la red local: `ios/Runner/Info.plist`
  lo autoriza para el prototipo.

### Android

- El proyecto todavía no tiene la plataforma Android (`flutter create
  --platforms=android .`). Al agregarla, revisar que la app tenga permiso de
  internet en el `AndroidManifest.xml`.

### Seguridad

- **Con `http` las contraseñas viajan sin cifrar** por la Wi-Fi. En una red
  propia o un hotspot no importa para el prototipo. En una red compartida,
  alguien podría verlas.
- **Para uso real** el servidor necesita `https`.

### La IA

- La IA usa la misma `SERVIDOR_URL`.
- **En `IA_MODO=local`** el servidor pide autorización para las rutas de la
  IA. Con `DATOS=servidor`, la sesión de quien entró basta. Sin
  `DATOS=servidor` no hay sesión real, así que la app necesita la clave:
  `--dart-define-from-file=../servidor/.env`.

## `SERVIDOR_URL` y `DATOS=servidor` no son lo mismo

| Opción | Qué decide |
|---|---|
| `SERVIDOR_URL` | **Dónde** está el servidor |
| `DATOS=servidor` | **Si** la app usa el servidor para usuarios, firmas y partes |
| `IA=falsa` | **Si** la app deja de usar el servidor para la IA |

Es como un número de teléfono y la decisión de llamar: `SERVIDOR_URL` es el
número, y `DATOS` e `IA` deciden si se marca.

| `SERVIDOR_URL` | `DATOS=servidor` | `IA=falsa` | Qué pasa |
|---|---|---|---|
| Bien puesta | Sí | No | Todo va al servidor: lo normal para probar y presentar |
| Bien puesta | No | No | Los datos se simulan dentro de la app; solo la IA va al servidor |
| Cualquiera | No | Sí | Nada va al servidor; `SERVIDOR_URL` no se usa |
| Mal puesta | Sí | — | La app no puede entrar: no encuentra el servidor |

Por eso con un celular de verdad casi siempre van juntas:

```
--dart-define=DATOS=servidor --dart-define=SERVIDOR_URL=http://<IP>:3100
```

## Uso real, fuera de la red

Para que los bomberos usen la app desde cualquier lugar, el servidor y MySQL
tendrían que vivir en un servidor en internet, con un dominio y `https`:

- La app apuntaría a esa dirección (`SERVIDOR_URL=https://…`).
- El `.env` de ese servidor apuntaría a su MySQL.
- MySQL nunca se expone a internet: solo el servidor habla con él.

No está hecho; hoy todo corre en la compu de quien prueba.

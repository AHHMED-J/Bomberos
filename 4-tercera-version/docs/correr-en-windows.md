# Correr todo en Windows

Cómo prender el servidor y la app en una compu con Windows, en modo debug o
release, y qué significan las opciones de simulación.

En Windows la app corre como programa de escritorio. No se puede instalar en
un iPhone desde aquí: eso solo se hace desde la Mac
(`arrancar/correr-app.sh`).

## Las piezas

| Pieza | Qué es | Cómo se prende |
|---|---|---|
| MySQL | La base de datos | Servicio **MySQL80** de Windows |
| Servidor | Guarda y decide: acceso, firma, revisión, sello | `arrancar\iniciar.ps1` |
| App | Lo que ve el bombero | `flutter run` o el `.exe` |

    app  ──►  servidor  ──►  MySQL

Siempre en ese orden: primero MySQL, luego el servidor, luego la app.

## Qué instalar (una vez)

- **Node.js** y **MySQL 8**.
- **Flutter** (el SDK; la extensión de VS Code lo puede descargar).
- **Visual Studio** con el componente "Desarrollo para el escritorio con
  C++". No es VS Code: es el que compila programas de Windows.

Para compilar la app, Windows tiene que dejar crear enlaces simbólicos. Hay
dos formas:

- activar el **Modo de desarrollador** (`start ms-settings:developers`), o
- usar una terminal abierta como administrador.

`flutter doctor` dice si falta algo.

## Primera vez

1. Prende MySQL: en "Servicios" de Windows, inicia **MySQL80**.

2. En PowerShell (no en Git Bash):

   ```powershell
   cd C:\Bomberos\4-tercera-version\arrancar
   .\iniciar.ps1 -PrepararBd
   ```

   Crea `servidor\.env`. Si tu MySQL tiene contraseña, se detiene con un error
   de conexión, porque el archivo todavía no la tiene.

3. Abre `4-tercera-version\servidor\.env` y pon tu contraseña de MySQL en
   `DB_PASSWORD=`. Lo demás sirve como viene.

4. Vuelve a correr `.\iniciar.ps1 -PrepararBd`. Ahora instala las
   dependencias, crea la base `bomberos_v3`, carga los datos de ejemplo y
   deja el servidor prendido en esa ventana.

5. Comprueba que contesta: abre `http://localhost:3100/api/salud` en el
   navegador.

6. En otra terminal, baja los paquetes de la app:

   ```powershell
   cd C:\Bomberos\4-tercera-version\app
   flutter pub get
   ```

## Cada vez

**Servidor** (una terminal; Ctrl+C lo apaga):

```powershell
cd C:\Bomberos\4-tercera-version\arrancar
.\iniciar.ps1
```

**App**, en otra terminal, de una de estas dos formas.

### Modo debug

Para desarrollar y probar.

```powershell
cd C:\Bomberos\4-tercera-version\app
flutter run -d windows --dart-define=DATOS=servidor
```

### Modo release

Para presentar: es como la vería un bombero.

```powershell
cd C:\Bomberos\4-tercera-version\app
flutter build windows --release --dart-define=DATOS=servidor
.\build\windows\x64\runner\Release\bomberos_parte.exe
```

También sirve `flutter run -d windows --release --dart-define=DATOS=servidor`.
Los `--dart-define` quedan grabados en el programa al compilar: para
cambiarlos hay que volver a compilar.

### Diferencias entre los dos modos

| | Debug | Release |
|---|---|---|
| Velocidad | Más lenta | Fluida |
| Etiqueta "DEBUG" en la esquina | Sale | No sale |
| Botón "Depuración: entrar como…" | Aparece en la pantalla de acceso | No existe |
| Pantalla de banderas | Sí | No |
| Firma simulada | Se usa si no hay biometría | No se usa: pide la contraseña |

## Usuarios de ejemplo

Los carga `-PrepararBd`. El usuario es el número de empleado.

| Usuario | Contraseña | Quién |
|---|---|---|
| `380207` | `prueba380207` | Acevedo Carrillo, Verónica (bombero) |
| `376285` | `prueba376285` | Jalife Burgueño, Ahhmed (bombero) |
| `300112` | `prueba300112` | Cap. J. Navarro (capitán, revisor) |

Para dar de alta más, desde `4-tercera-version\servidor`:

```powershell
npm run usuario -- alta 380999 "Apellido, Nombre"
npm run usuario -- alta 300200 "Cap. Apellido" --capitan
```

Imprime la contraseña que se le entrega.

## Las opciones de simulación

Hay opciones en la app y opciones en el servidor. No son lo mismo.

### En la app: `--dart-define`

Se ponen al correr o compilar la app.

| Opción | Sin ponerla | Qué hace al ponerla |
|---|---|---|
| `DATOS=servidor` | Datos simulados dentro de la app | Acceso, firma, partes y bandeja van al servidor y a MySQL |
| `IA=falsa` | La IA se pide al servidor | El dictado y el resumen usan textos de ejemplo de la app |
| `SERVIDOR_URL=http://…:3100` | `http://localhost:3100` | Dónde está el servidor, si no es esta misma compu |
| `MICROFONO_SIMULADO=true` | Graba con el micrófono real | Finge un audio, sin micrófono |

Ojo: los valores de fábrica son opuestos. Los **datos** son simulados salvo
que pongas `DATOS=servidor`; la **IA** va al servidor salvo que pongas
`IA=falsa`.

### En el servidor: `servidor\.env`

Se leen al prender el servidor. Para que un cambio tome efecto hay que
apagarlo y volver a prenderlo.

| Línea | Valor | Qué hace |
|---|---|---|
| `IA_MODO` | `fijo` (de fábrica) | El servidor contesta textos de ejemplo. No necesita modelos. |
| | `local` | IA real con Whisper y Ollama. Solo en una compu con los modelos. |
| `MODO_PRUEBA` | `1` (de fábrica) | El servidor acepta firmas simuladas. |
| | `0` | Las rechaza. Es lo correcto para uso real. |

### Si no se pone `DATOS=servidor`

La app no usa el servidor ni MySQL para los datos: trae un servidor de
mentira por dentro.

- Se entra con una matrícula de ejemplo y **cualquier contraseña**.
- Los partes son de ejemplo y viven en la memoria de la app.
- La firma en trazo, los envíos y las validaciones se pierden al cerrar.
- No se comprueba nada de verdad: ni la contraseña, ni las reglas de
  revisión, ni el sello.

Sirve para ver las pantallas sin prender nada. Para probar acceso, firma,
revisión y sello de verdad hace falta `DATOS=servidor`.

Aun sin `DATOS=servidor`, el dictado sí llama al servidor, porque la IA va
al servidor de fábrica. Para una app sin nada de red: `--dart-define=IA=falsa`
y sin `DATOS=servidor`.

### IA falsa e IA fija

Las dos dan textos de ejemplo; cambia de dónde salen.

| | `IA=falsa` (en la app) | `IA_MODO=fijo` (en el servidor) |
|---|---|---|
| Quién contesta | La app, sin red | El servidor |
| Qué necesita prendido | Nada | El servidor |
| Qué prueba | Las pantallas | Que la app y el servidor se entiendan |

Ninguna de las dos mide la calidad de la IA: para eso hacen falta los
modelos reales (`ia-local/README.md`).

### Firma simulada

Para confirmar con biometría, el celular firma un reto del servidor con una
llave de su chip seguro. Una compu o un simulador no tienen ese chip, así
que para poder probar existe la **firma simulada**: un texto que empieza con
`SIMULADA:` y que el servidor acepta sin comprobar ninguna llave. No da
seguridad; es solo para pruebas.

| Situación | Qué pasa al firmar |
|---|---|
| Debug, sin biometría | La app manda la firma simulada |
| Debug, bandera "Firma simulada" prendida | Siempre manda la simulada |
| Release | Nunca manda la simulada: pide la contraseña |
| Servidor con `MODO_PRUEBA=0` | Rechaza cualquier firma simulada |

En Windows, en release, la app pide la contraseña del usuario para firmar,
y el servidor la comprueba de verdad. Es posible que en su lugar aparezca
Windows Hello (el PIN o la huella de la laptop): también es válido, es la
biometría del dispositivo.

## Combinaciones útiles

| Para qué | Servidor | App |
|---|---|---|
| Ver pantallas, sin prender nada | Apagado | `flutter run -d windows --dart-define=IA=falsa` |
| Probar acceso, firma, revisión y sello | `.\iniciar.ps1` | `flutter run -d windows --dart-define=DATOS=servidor` |
| Presentar | `.\iniciar.ps1`, con `MODO_PRUEBA=0` | Compilada en release con `DATOS=servidor` |

## Si algo falla

| Síntoma | Causa | Qué hacer |
|---|---|---|
| `iniciar.ps1: command not found` | Estás en Git Bash | Usa PowerShell, o `powershell -File ./iniciar.ps1` |
| El servidor dice "MySQL no está listo" | MySQL apagado o contraseña mal | Inicia MySQL80 y revisa `DB_PASSWORD` en `servidor\.env` |
| El navegador se queda cargando `localhost:3100` | La ventana del servidor quedó en pausa por un clic | Presiona Enter o Esc en esa ventana. Para evitarlo, usa la terminal de VS Code |
| "Ya hay un servidor en el puerto 3100" | Quedó otro prendido | Ciérralo con Ctrl+C en su ventana |
| Todos los `.dart` marcan error en VS Code | Faltan los paquetes | `flutter pub get` en la carpeta `app` |
| "Building with plugins requires symlink support" | Falta el permiso de enlaces | Activa el Modo de desarrollador o usa una terminal de administrador |
| Error `STL1011` al compilar | Visual Studio reciente con el paquete de biometría | Ya está resuelto en `app\windows\CMakeLists.txt`; corre `flutter clean` y vuelve a compilar |
| La app dice que no puede conectar | El servidor está apagado | Prende el servidor antes que la app |

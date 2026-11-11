#!/bin/zsh
# Un solo comando para probar la app con la IA REAL en el iPhone:
#   enciende Whisper + qwen2.5, el servidor en modo local, detecta la IP de la Mac
#   e instala la app con la clave (sin mostrarla).
#
# Uso:  ./correr-app.sh                 → versión «release»: se abre desde el inicio del iPhone sin la Mac conectada
#       ./correr-app.sh --depurar       → versión de depuración (recarga en caliente, pero sólo abre desde la Mac)
#       ./correr-app.sh --dispositivo ID → elige el iPhone si hay más de uno conectado (o un simulador)
#       ./correr-app.sh --preparar-bd   → antes de encender: instala dependencias, crea la base de MySQL
#                                         y carga los datos de ejemplo (no borra nada; se puede repetir)
#
# Los partes viven en el servidor de la Mac (DATOS=servidor): dos teléfonos con la app ven lo mismo
# (uno entra como bombero y envía; el otro como Capitán y lo ve en su bandeja).
# Al terminar: ./detener.sh
set -e
AQUI=${0:A:h}
SERVIDOR=$AQUI/../servidor
MOVIL=$AQUI/../movil
BASE=~/.bomberos-ia
mkdir -p $BASE/registros

MODO=--release
ELEGIDO=""
PREPARAR_BD=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --depurar) MODO=--debug ;;
    --dispositivo) ELEGIDO="$2"; shift ;;
    --preparar-bd) PREPARAR_BD=1 ;;
    *) echo "Opción desconocida: $1"; exit 1 ;;
  esac
  shift
done

# 1 · Clave y modo local
[[ -f $SERVIDOR/.env ]] || $AQUI/configurar.sh
grep -q '^IA_MODO=local' $SERVIDOR/.env || { echo "servidor/.env no está en IA_MODO=local"; exit 1; }

# 1.5 · Base de datos (sólo con --preparar-bd). MySQL debe estar encendido y servidor/.env con sus DB_…
if [[ -n "$PREPARAR_BD" ]]; then
  (cd $SERVIDOR && npm install --silent && npm run db:crear && npm run datos-prueba)
fi

# 2 · Las dos IAs
if ! lsof -nP -iTCP:8178 -sTCP:LISTEN >/dev/null 2>&1; then $AQUI/iniciar.sh; else echo "Whisper ya está encendido"; fi

# 3 · Servidor en modo local (puerto 3100)
SALUD=$(curl -s -m 3 http://127.0.0.1:3100/api/salud || true)
if [[ -z "$SALUD" ]]; then
  (cd $SERVIDOR && [[ -d node_modules ]] || npm install --silent)
  (cd $SERVIDOR && nohup node servidor.js >> $BASE/registros/servidor.log 2>&1 & echo $! > $BASE/servidor.pid)
  for i in {1..30}; do curl -s -m 1 http://127.0.0.1:3100/api/salud >/dev/null && break; sleep 0.5; done
  SALUD=$(curl -s -m 3 http://127.0.0.1:3100/api/salud || true)
fi
if [[ "$SALUD" != *'"ia_modo":"local"'* ]]; then
  echo "En el puerto 3100 hay un servidor que NO está en modo local: $SALUD"
  echo "Ciérralo (lsof -i :3100) y vuelve a correr este comando."
  exit 1
fi
echo "Servidor listo en modo local"

# 4 · IP de la Mac en la red Wi-Fi
IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || true)
[[ -n "$IP" ]] || { echo "No encontré la IP de la Mac. ¿Está conectada a Wi-Fi?"; exit 1; }
echo "La app hablará con http://$IP:3100 (el iPhone debe estar en la misma Wi-Fi)"

# 5 · iPhone conectado
if [[ -n "$ELEGIDO" ]]; then
  DISPOSITIVO=$ELEGIDO
else
  IPHONES=$(cd $MOVIL && flutter devices --machine 2>/dev/null | python3 -c '
import json,sys
for x in json.load(sys.stdin):
    if x.get("targetPlatform","").startswith("ios") and not x.get("emulator"):
        print(x["id"] + "\t" + x["name"])')
  [[ -n "$IPHONES" ]] || { echo "No veo un iPhone conectado por cable y desbloqueado."; exit 1; }
  if [[ $(echo "$IPHONES" | wc -l) -gt 1 ]]; then
    echo "Hay más de un iPhone conectado. Elige uno con --dispositivo:"
    echo "$IPHONES" | sed 's/^/  /'
    exit 1
  fi
  DISPOSITIVO=$(echo "$IPHONES" | cut -f1)
fi

echo "Desbloquea el iPhone y déjalo así hasta que abra la app (si está bloqueado, se instala pero no abre)."

# 6 · Instalar y abrir. La clave se lee del .env y no se imprime.
CLAVE=$(grep '^CLAVE_LOCAL=' $SERVIDOR/.env | cut -d= -f2)
[[ ${#CLAVE} -ge 32 ]] || { echo "La clave de servidor/.env está vacía o incompleta. Corre ./configurar.sh"; exit 1; }
cd $MOVIL
exec flutter run $MODO -d "$DISPOSITIVO" \
  --dart-define=IA=servidor \
  --dart-define=DATOS=servidor \
  --dart-define=SERVIDOR_URL=http://$IP:3100 \
  --dart-define=CLAVE_LOCAL=$CLAVE

#!/bin/zsh
# Un solo comando para probar la app con la IA REAL en el iPhone:
#   enciende Whisper + qwen2.5, el servidor en modo local, detecta la IP de la Mac
#   e instala la app con la clave (sin mostrarla).
#
# Uso:  ./correr-app.sh             → versión «release»: se abre desde el inicio del iPhone sin la Mac conectada
#       ./correr-app.sh --depurar   → versión de depuración (recarga en caliente, pero sólo abre desde la Mac)
# Al terminar: ./detener.sh
set -e
AQUI=${0:A:h}
SERVIDOR=$AQUI/../servidor
MOVIL=$AQUI/../movil
BASE=~/.bomberos-ia
mkdir -p $BASE/registros

MODO=--release
[[ "$1" == "--depurar" ]] && MODO=--debug

# 1 · Clave y modo local
[[ -f $SERVIDOR/.env ]] || $AQUI/configurar.sh
grep -q '^IA_MODO=local' $SERVIDOR/.env || { echo "servidor/.env no está en IA_MODO=local"; exit 1; }

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
DISPOSITIVO=$(cd $MOVIL && flutter devices --machine 2>/dev/null | python3 -c '
import json,sys
d=[x for x in json.load(sys.stdin) if x.get("targetPlatform","").startswith("ios") and not x.get("emulator")]
print(d[0]["id"] if d else "")')
[[ -n "$DISPOSITIVO" ]] || { echo "No veo un iPhone conectado por cable y desbloqueado."; exit 1; }

echo "Desbloquea el iPhone y déjalo así hasta que abra la app (si está bloqueado, se instala pero no abre)."

# 6 · Instalar y abrir. La clave se lee del .env y no se imprime.
CLAVE=$(grep '^CLAVE_LOCAL=' $SERVIDOR/.env | cut -d= -f2)
[[ ${#CLAVE} -ge 32 ]] || { echo "La clave de servidor/.env está vacía o incompleta. Corre ./configurar.sh"; exit 1; }
cd $MOVIL
exec flutter run $MODO -d "$DISPOSITIVO" \
  --dart-define=IA=servidor \
  --dart-define=SERVIDOR_URL=http://$IP:3100 \
  --dart-define=CLAVE_LOCAL=$CLAVE

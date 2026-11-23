#!/bin/zsh
# Arranca la IA local: whisper-server (sólo 127.0.0.1) y precarga el modelo de Ollama.
set -e
BASE=~/.bomberos-ia
MODELO_W=${WHISPER_MODELO:-$BASE/modelos/ggml-large-v3.bin}
PUERTO_W=8178
MODELO_O=$(grep -E '^OLLAMA_MODELO=' "$(dirname "$0")/../servidor/.env" 2>/dev/null | cut -d= -f2)
MODELO_O=${MODELO_O:-qwen2.5:14b}

command -v whisper-server >/dev/null || { echo "Falta whisper.cpp: brew install whisper.cpp"; exit 1; }
command -v ffmpeg >/dev/null || { echo "Falta ffmpeg: brew install ffmpeg"; exit 1; }
[[ -f $MODELO_W ]] || { echo "Falta el modelo de Whisper en $MODELO_W"; exit 1; }

if curl -s -m 2 http://127.0.0.1:$PUERTO_W/ >/dev/null 2>&1; then
  echo "whisper-server ya estaba corriendo en 127.0.0.1:$PUERTO_W"
else
  echo "Arrancando whisper-server (carga el modelo una vez, tarda unos segundos)…"
  nohup whisper-server -m "$MODELO_W" -l es --host 127.0.0.1 --port $PUERTO_W -t 8 -sns \
    > $BASE/registros/whisper-server.log 2>&1 &
  echo $! > $BASE/whisper-server.pid
  for i in {1..60}; do curl -s -m 1 http://127.0.0.1:$PUERTO_W/ >/dev/null 2>&1 && break; sleep 1; done
  curl -s -m 1 http://127.0.0.1:$PUERTO_W/ >/dev/null 2>&1 && echo "  whisper-server listo" || { echo "  no arrancó; ver $BASE/registros/whisper-server.log"; exit 1; }
fi

curl -s -m 2 http://127.0.0.1:11434/api/tags >/dev/null || { echo "Ollama no está corriendo: abre la app Ollama"; exit 1; }
ollama list | grep -q "^${MODELO_O}" || { echo "Falta el modelo: ollama pull $MODELO_O"; exit 1; }
echo "Precargando $MODELO_O en Ollama…"
curl -s -m 180 http://127.0.0.1:11434/api/generate -d "{\"model\":\"$MODELO_O\",\"keep_alive\":\"30m\"}" >/dev/null && echo "  Ollama listo"
echo "IA local lista. Ahora: cd servidor && npm start"

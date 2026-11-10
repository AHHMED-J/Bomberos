#!/bin/zsh
# Apaga la IA local y libera la memoria.
BASE=~/.bomberos-ia
if [[ -f $BASE/whisper-server.pid ]]; then
  kill "$(cat $BASE/whisper-server.pid)" 2>/dev/null && echo "whisper-server detenido"
  rm -f $BASE/whisper-server.pid
fi
pkill -f "whisper-server .*--port 8178" 2>/dev/null
for m in $(ollama ps 2>/dev/null | awk 'NR>1{print $1}'); do ollama stop "$m" && echo "Ollama: $m descargado de memoria"; done
lsof -i :8178 >/dev/null 2>&1 && echo "ALERTA: algo sigue en el puerto 8178" || echo "Puerto 8178 libre"

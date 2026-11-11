#!/bin/zsh
# Crea servidor/.env con una clave local al azar (una sola vez). No muestra la clave en pantalla.
set -e
cd "$(dirname "$0")/../servidor"
if [[ -f .env ]]; then
  echo "servidor/.env ya existe; no se toca."
else
  cp .env.example .env
  clave=$(openssl rand -hex 24)
  sed -i '' "s/^CLAVE_LOCAL=.*/CLAVE_LOCAL=$clave/" .env
  sed -i '' "s/^IA_MODO=.*/IA_MODO=local/" .env
  chmod 600 .env
  echo "Listo: servidor/.env creado (permisos 600) con IA_MODO=local y una clave nueva."
fi
git check-ignore -q .env && echo "Verificado: .env está ignorado por git." || { echo "ALERTA: .env NO está ignorado"; exit 1; }

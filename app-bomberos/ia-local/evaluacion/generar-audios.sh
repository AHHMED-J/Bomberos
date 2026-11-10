#!/bin/zsh
# Genera audios SINTÉTICOS (voz de la Mac) de los casos ficticios, en ia-local/audios/ (ignorado por git).
set -e
cd "$(dirname "$0")"
OUT=../audios; mkdir -p $OUT
VOZ=${VOZ:-"Eddy (Spanish (Mexico))"}
node -e "for (const c of require('./casos.json').casos) console.log(c.id + '\t' + c.dictado)" | while IFS=$'\t' read -r id texto; do
  say -v "$VOZ" -o "$OUT/$id.aiff" "$texto"
  ffmpeg -hide_banner -loglevel error -y -i "$OUT/$id.aiff" -ac 1 -ar 16000 -c:a aac "$OUT/$id.m4a"
  rm -f "$OUT/$id.aiff"
done
# Un audio casi en silencio para probar el rechazo (pantalla D6)
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "anullsrc=r=16000:cl=mono" -t 4 -c:a aac "$OUT/silencio.m4a"
ls $OUT | wc -l | xargs echo "audios generados:"

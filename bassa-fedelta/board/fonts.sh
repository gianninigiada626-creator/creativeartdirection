#!/bin/sh
# The two type faces of the film, from Google Fonts (open licences): Anton for posters and the title,
# Permanent Marker for what is written by hand (tags, the tape's label, the diary). Into build/fonts.
cd "$(dirname "$0")/../build" && mkdir -p fonts && cd fonts || exit 1
for fam in Anton Permanent+Marker; do
  url=$(curl -sS -A "Mozilla/4.0" "https://fonts.googleapis.com/css2?family=$fam" | grep -o "https://fonts.gstatic.com[^)]*" | head -1)
  curl -sSf -o "$(echo $fam | tr -d '+').ttf" "$url"
done

# POSATORA: file di stampa T-shirt

Grafiche vettorializzate dal mockup e dalla foto dell'ovale. Stampa: 1 colore, **bianco** su T-shirt **nera**.

| | Fronte | Retro |
|---|---|---|
| Contenuto | Logo POSATORA | 60131 + foto ovale + slogan |
| Dimensione stampa | 35,0 × 19,6 cm | 35,0 × 26,1 cm |
| Posizione | centrata, 9 cm sotto il colletto | centrata, 9 cm sotto il colletto |

## Cartelle

- `serigrafia/`: i file da mandare allo stampatore se si stampa in serigrafia.
  - `*_bianco.svg` / `*_bianco.pdf`: vettoriale master. Le forme sono **bianche su sfondo trasparente**, quindi su sfondo bianco sembrano vuote. In Illustrator il gruppo si chiama `INCHIOSTRO_BIANCO`.
  - `*_positivo-pellicola.pdf`: le stesse forme in nero, pronte per la pellicola del telaio.
- `dtg/`: PNG a 300 dpi in misura reale, bianco su trasparente. Il nero della maglia non va stampato.
  - `POSATORA_retro_DTG_300dpi.png`: identico alla serigrafia (foto a grana).
  - `POSATORA_retro_DTG_300dpi_foto-sfumata.png`: foto a toni continui, più simile al mockup. È la scelta consigliata se si stampa in DTG.
- `presentazione/`: tavola tecnica A3 (PDF/PNG/SVG) e mockup fronte e retro in PNG.
- `anteprime/`: anteprime rapide delle grafiche su fondo nero.

## Note tecniche

- Testi convertiti in tracciati, quindi non servono font installati. Font usati, entrambi gratuiti su Google Fonts: **New Rocker** per 60131 e **Pinyon Script** per lo slogan. Le linee sottili dello slogan sono state ingrossate di 0,15 mm per lato, così lo spessore minimo è di 0,7 mm, sicuro per la serigrafia.
- Foto ovale in serigrafia: i mezzitoni sono resi con una grana stocastica di circa 0,5 mm, stampabile con bianco coprente.
- Logo POSATORA: ricalcato dalla grafica originale (poster, ~800 px di larghezza). Ho isolato le lettere dalla foto, tolto i puntini di rumore e lisciato i bordi senza perdere punte e tacche. Le due punte in cima alla "A" finale, tagliate dal contorno della foto, sono state ricostruite.
- Nel mockup la grafica occupa circa l'85% della larghezza della maglia (≈ 45 cm su una L), più dell'area di stampa standard (35–40 cm). Per questo è impostata a 35 cm. Essendo vettoriale si può scalare senza perdita.

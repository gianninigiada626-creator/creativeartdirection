# ANCONA — fauna urbana

Cortometraggio in stile documentario naturalistico d'epoca (16:9, 1920×1080, 24 fps, 1:13),
montato e animato **interamente da codice** a partire dai clip e dai pupazzi forniti.

Un gatto pupazzo in skate (*Felis rotulans*) attraversa Ancona su una mappa incisa: grotte del
Passetto → gli scogli → Piazza Roma → il bar sul Corso → il molo al tramonto. A ogni tappa il film
passa al clip animato e un cartellino da museo presenta la "specie" del posto.

- **Pellicola 16mm**: colori sbiaditi caldi, alone sulle luci, grana, fotogramma che balla, flicker,
  polvere, peli e graffi, angoli arrotondati del quadro, coda di pellicola 3-2 con il "pop".
- **Il gatto**: ritagliato dalla foto su fondo nero, testa separata che ondeggia come un pupazzo a mano,
  skateboard disegnato con ruote che girano, ombra; passa vicino all'obiettivo come tendina tra le scene.
- **La mappa**: incisione su carta vecchia disegnata da codice (`map.py`), percorso a puntini rossi.
- **Audio**: piccolo combo da library music anni '70 (contrabbasso, spazzole, vibrafono), proiettore,
  rotelle, macchina da scrivere sui cartellini, audio originale dei clip. Consegnato anche come stem
  separati per mixare la **voce narrante** dopo — vedi `VOCE.md` per tempi e testo proposto.

## Uso

```bash
pip install opencv-python-headless numpy pillow
# assets/clips/: 01-passetto-polpo.mp4 02-fontana-vecchio.mp4 03-porto-orso.mp4 04-tuffi-lupi.mp4 05-bar-gatto.mp4
# assets/characters/: gatto.webp polpo.webp orso.webp vecchio.webp (pupazzi su fondo nero)
python3 prep.py       # ritaglio dei pupazzi → build/*-cut.png
python3 map.py        # la mappa e il percorso → build/map.png, build/route.json
python3 render.py     # → out/ancona.mp4, out/ancona.wav, out/stems/{musica,effetti,clip}.wav
python3 render.py 9 24.8 62   # solo fotogrammi singoli → out/still-*.jpg
```

Serve `ffmpeg` nel PATH. Clip e foto non sono nel repository (vedi `.gitignore`).

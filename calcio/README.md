# OGNI STRADA — spot tributo al calcio (sketch)

Spot verticale 9:16 (1080×1920, 24 fps, ~21 s) costruito **solo da cinque fotografie statiche**.
Tutto è calcolato dal codice, fotogramma per fotogramma: movimenti di camera dentro le foto,
parallasse tra soggetto e sfondo, il pallone ritagliato che passa da una foto all'altra,
tagli sul tempo (110 bpm), titoli, grading, grana e colonna sonora sintetizzata.

## Uso

```bash
pip install opencv-python-headless numpy pillow
# le foto in assets/: barbiere.webp strada.webp cortile.webp corsa.webp stadio.webp (1500×2000)
python3 prep.py               # maschere (GrabCut), sfondi ripuliti, pallone come sprite → build/
python3 render.py             # → out/ogni-strada.mp4
python3 render.py --preview   # mezza risoluzione, veloce
python3 render.py --preview 3.0 6.2 12.5   # solo fotogrammi singoli a quei secondi → out/still-*.jpg
```

Serve `ffmpeg` nel PATH. Le foto non sono nel repository (vedi `.gitignore`).

## Montaggio

| battute | inquadratura | cosa succede |
|---|---|---|
| 0–4 | barbiere | il rito: avvicinamento lento, la macchinetta vibra — *OGNI RITO.* |
| 4–10 | strada | il pallone gira in mano, un palleggio, poi lanciato verso la camera — *OGNI STRADA.* |
| 10–15 | cortile | il pallone arriva al piede in soggettiva, calcio, vola via; i panni stesi ondeggiano — *OGNI CORTILE.* |
| 15–19 | corsa | tre tagli: gli scarpini, il pallone arriva tra le mani, frustata di camera |
| 19–27 | stadio | il 10 sulle spalle, luci che respirano, polvere nell'aria, il coro sale — *OGNI DOMENICA.* |
| 27–31 | montaggio | otto tagli sul mezzo tempo, flash |
| 31–32 | nero | silenzio, un pallone che rimbalza |
| 32–39 | finale | *IL CALCIO / È DI CHI LO VIVE.* |

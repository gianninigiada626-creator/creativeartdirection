# GUILTY · Fase 5 — render

Il videoclip completo (3:29, 1080p, 24 fps) si genera interamente da codice, partendo dagli asset vettoriali approvati (VD-03/04) e dallo storyboard (VD-05).

| File | Ruolo |
|---|---|
| `anim.py` | Animazione dei 38 shot. Ogni funzione riceve (t, d, fi) e restituisce la scena SVG in uno spazio di 960×540 |
| `engine.py` | Mappa i frame sulle battute del brano (`audio/analysis.json`) e rasterizza la scena in Chromium headless a 1920×1080, con boil d'inchiostro per capitolo, vignetta legata al Guilt Index e carta in multiply. Poi codifica in H.264 con ffmpeg su segmenti paralleli e fa il mux dell'audio originale |
| `paper.png` | Texture carta (livello multiply) |
| `fonts/` | Big Shoulders Display 900, IBM Plex Mono 500 (OFL) |

```bash
python3 engine.py table                      # tabella shot → frame
python3 engine.py sheet 1 2 3                # provini (contact sheet) in out/sheets/
python3 engine.py render --workers 3 --crf 20
```

Il percorso dell'audio si imposta con `GUILTY_AUDIO`. L'output finisce in `out/`, che non è versionato.

Cadenze: protagonista a passo due (12 fps), Doppio a 24, folla a 8, Memoria a 6, Testimone tenuto. Il boil cambia seed ogni 2 frame.

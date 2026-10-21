# MERCY V. — MUERTO

Intro animata dell'album: disco → lettore CD → corto in stile GTA anni 2000 sul brano → retro del disco.
Tutto è generato nel codice (Three.js + GSAP + Web Audio): nessuna immagine esterna.

## Avvio

```bash
cd muerto
npm install
npm run dev          # http://localhost:5173
```

Il brano va in `public/assets/muerto.mp3` (non è nel repository perché inedito).
Senza brano il film parte lo stesso, con i soli effetti sonori.

Comandi del player: **Spazio** play/pausa · **← →** ±5 s · **M** audio · **F** schermo intero · capitoli DISCO / LETTORE / GIOCO / RETRO.
`?t=60` apre il film al secondo 60.

## Video MP4 (1920×1080, 24 fps)

```bash
npm i -D playwright && npx playwright install chromium   # una volta
npm run build && npm run preview                          # in un terminale
npm run export                                            # in un altro → out/muerto.mp4
```

Ogni fotogramma è renderizzato portando il film a un tempo esatto, quindi il video è identico alla versione web.
Opzioni: `--from 30 --to 60` per un estratto, `--fps 30`, `--software-gl` su macchine senza GPU.

## Sostituire i provvisori con le tue immagini

| File | Cosa sostituisce |
|---|---|
| `public/assets/portrait.jpg` (o `.png`), quadrato | il dipinto sull'etichetta del disco |
| `public/assets/heads/<nome>.png` + `<nome>-back.png`, sfondo trasparente, ~512×640 | le teste: `mercy`, `barber`, `client`, `barista`, `old`, `oldwoman`, `kid`, `driver`, `stranger` |

Testi, tracklist, crediti e tempi del brano: `src/data/album.js`.

## Struttura

```
src/film/       motore: orologio unico, grade (colore dipinto caldo con rossi, pennellata Kuwahara, graffi e polvere, bande cinema, TV), audio, foley sintetizzato
src/acts/       I disco · II lettore · IV retro del disco
src/game/       III il gioco: mondo (strada West Coast, barbiere, bar, camposanto), regia delle inquadrature, simulazione
src/objects/    disco, lettore CD, personaggi in "carta stropicciata" con teste a collage, kit città, lowrider
src/textures/   texture procedurali: ritratto, etichetta, teste, carta, facciate
src/overlay/    HUD di gioco e cornice barocca del retro
scripts/        export MP4
```

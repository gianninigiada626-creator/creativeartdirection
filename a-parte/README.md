# A PARTE

Cortometraggio d'animazione (circa 8 min, 2.39:1). Sceneggiatura, voce narrante e dialoghi in
`SCENEGGIATURA.md`; la lista delle 28 tavole, con tempi, inquadrature, battute e suono, in
`board/shots.py`.

## Come sono fatte le tavole

Ogni inquadratura è una scena 3D vera (prospettiva, luce, ombre, corpi umani con scheletro
Mixamo messi in posa) resa in quattro passate — luce, normali, profondità, maschere — e poi
**disegnata** da `board/stylize.py`: contorni a matita che tremano come una mano, tratteggio e
carboncino strofinato dove cala la luce, carta calda, la luce di ogni età. Il protagonista è dipinto
sopra, rosso pieno, senza linee né ombre, come nella foto di riferimento; la luce lo attraversa.

```bash
engine3d/fetch_models.sh                       # modelli umani (esempi three.js, Babylon) → engine3d/models/
python3 -m http.server 8090 --bind 127.0.0.1   # dalla radice del repository
node engine3d/passes.mjs build/passes 01 02 03 05 06 …   # passate di ogni tavola (+ meta: camera, far)
cd board && python3 make.py                    # tutte le tavole → out/board/s-XX.jpg, contact.jpg
python3 page.py                                # pagina dello storyboard → out/web/
```

Per l'animatic servono anche i font (`build/fonts/`: Cormorant Garamond, da Google Fonts).

```bash
build/render_anim.sh                           # le inquadrature che si muovono, fotogramma per fotogramma
cd board && python3 animatic.py draw           # ogni disegno, 8 al secondo, tre mani che si alternano
python3 animatic.py cut                        # montaggio, sottotitoli, suono provvisorio → out/animatic/
python3 animatic.py cut --span 0 30            # anteprima di un tratto
```

- `engine3d/stage.js` — palco, persone, pose "a mira" (ogni osso punta in una direzione), passate
- `engine3d/panels3d.js` — le inquadrature; quelle animate hanno un `update(k, t)`
- `engine3d/anim.mjs` — costruisce una scena una volta e la rende fotogramma per fotogramma
- `board/stylize.py` — dalle passate al disegno
- `board/cards.py` — titolo, foto di classe stampata, pioggia, nero finale
- `board/animatic.py`, `board/sound.py` — animatic e traccia sonora provvisoria (sintetizzata)
- `board/engine.py`, `board/panels.py` — primo motore 2D (superato, tenuto come riferimento)

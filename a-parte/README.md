# A PARTE

Cortometraggio d'animazione (circa 11 min, 2.39:1). Sceneggiatura, voce narrante e dialoghi in
`SCENEGGIATURA.md`.

## Come sono fatte le tavole

Ogni inquadratura è una scena 3D vera (prospettiva, luce, ombre, corpi umani con scheletro
Mixamo messi in posa) resa in quattro passate — luce, normali, profondità, maschere — e poi
**disegnata** da `board/stylize.py`: contorni a matita che tremano come una mano, tratteggio e
carboncino dove cala la luce, carta calda. Il protagonista è dipinto sopra, rosso pieno, senza linee
né ombre, come nella foto di riferimento; la luce lo attraversa (non proietta ombre).

```bash
engine3d/fetch_models.sh                       # modelli umani (esempi three.js, Babylon) → engine3d/models/
python3 -m http.server 8090 --bind 127.0.0.1   # dalla radice del repository
node engine3d/passes.mjs build/passes parcheggio aula alba
cd board && python3 stylize.py ../build/passes aula ../out/board/s-aula.jpg --far 40 --tint 1,0.92,0.78
```

- `engine3d/stage.js` — palco, persone, pose "a mira" (ogni osso punta in una direzione), passate
- `engine3d/panels3d.js` — le inquadrature
- `board/stylize.py` — dalle passate al disegno
- `board/engine.py`, `board/panels.py` — primo motore 2D (superato, tenuto come riferimento)

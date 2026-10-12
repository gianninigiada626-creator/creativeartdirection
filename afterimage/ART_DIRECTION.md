# AFTERIMAGE — Direzione artistica

**Artista:** MERCY V. · **Album:** AFTERIMAGE · **Label (fittizia):** SAFELIGHT RECORDS · **Cat.:** DRK-001
**Uscita:** 12.03.2027 (venerdì)

> *the light is gone. the image stays.*
> la luce se n'è andata. l'immagine resta.

---

## 1. Concetto: la camera oscura

Un'*afterimage* è l'immagine che resta impressa sulla retina dopo un flash. L'album è il racconto di ciò che resta
quando la luce se n'è andata: ricordi sovraesposti, volti diventati fantasmi, oggetti che non tengono la loro forma.

Il sito è **un rullino che si sviluppa mentre scorri**:

`buio → flash → impressione → oggetto ritrovato → disco → dissolvenza`

Ogni effetto deve avere una giustificazione dentro questa metafora:

| Effetto | Significato |
|---|---|
| Grana | pellicola, sali d'argento |
| Scie / ghosting | persistenza retinica |
| Rosso | luce di sicurezza della camera oscura |
| Cromo / metallo liquido | argento fotografico, memoria instabile |
| Glitch | la memoria che si degrada (usato di rado) |
| Rivelazioni a fessura | otturatore |

## 2. Palette

| Token | Hex | Uso |
|---|---|---|
| `--void` | `#050505` | sfondo base |
| `--void-2` | `#0B0B0C` | superfici, separazioni |
| `--silver` | `#C9CCD1` | cromo, linee, metadati |
| `--silver-dim` | `#6E737B` | testi secondari, griglie |
| `--paper` | `#E8E6E1` | testi primari (carta fotografica, mai `#FFF`) |
| `--safelight` | `#D3121A` | **≤ 5% della superficie.** Solo segnali vivi: REC, hover, traccia attiva, il flash, i cerchi a matita grassa |

Vietato: gradienti viola, glassmorphism, card arrotondate (`border-radius: 0`), ombre morbide decorative.

## 3. Tipografia

| Ruolo | Font | Regole |
|---|---|---|
| Display | **Archivo** variabile (wdth 62–125, wght 100–900) | maiuscolo, interlinea 0.8, esce dai bordi. L'asse *width* si anima: l'immagine che si stira e si comprime |
| Ghost | **Instrument Serif** corsivo | frammenti poetici in italiano, spesso sfocati o con scia |
| Utility | **JetBrains Mono** | 10–11px, maiuscolo, tracking +0.08em. Metadati da mirino: `FR 024/120`, `f/2.8 · 1/60s · ISO 3200`, timecode |

Font ospitati in locale con `@fontsource`: nessuna dipendenza esterna.

## 4. Lingua: EN/IT

- **Inglese:** titoli, tracce, navigazione, UI.
- **Italiano:** frammenti poetici (Instrument Serif), credits, note di camera oscura.

Frammenti:
- *chiudo gli occhi e il flash è ancora acceso.*
- *ricordo solo quello che il flash ha visto.*
- *argento sui denti, buio nelle tasche.*
- *sviluppato al buio, come tutto quello che conta.*

## 5. Principi di motion

1. **Esposizione, non animazione.** Gli elementi compaiono come una stampa nel bagno di sviluppo (blur → contrasto → nitidezza), non scivolano in posizione.
2. **Persistenza.** Ciò che si muove lascia una scia sottile.
3. **Due velocità.** Tagli secchi di 2 frame alternati a derive lente di 4–6s. Easing: `expo.out` per le rivelazioni, `steps()` per i tagli.
4. **Il glitch è punteggiatura.** Al massimo un momento per sezione.
5. **Accessibilità.** Con `prefers-reduced-motion`: niente flash, niente scie, solo dissolvenze. Mai più di un flash consecutivo (rischio fotosensibile).

## 6. Oggetto 3D: metallo liquido

- Forma organica cromata che respira: icosfera ad alta densità con displacement da simplex noise nel vertex shader.
- Materiale fisico: metalness 1, roughness ~0.15, clearcoat. Superficie quasi nera che vive solo di riflessi.
- Environment map procedurale: stanza nera, una lunga softbox bianca sottile e una striscia rossa safelight. Nessuna HDR esterna.
- Una luce di contorno che scorre come in un set fotografico.
- Puntatore: l'oggetto ruota verso il cursore e la superficie si agita leggermente.
- Click: flash, la superficie si solidifica, la camera lo attraversa e si rivela la copertina.

## 7. Struttura

**01 Intro (~10s, saltabile con SKIP / ESC)**
- 0.0–1.5s: nero, grana, timecode, riga mono *the light is gone. the image stays.*
- 1.5–2.0s: un flash, poi la sagoma impressa in rosso che svanisce.
- 2.0–6.0s: l'oggetto emerge dal buio, luce di contorno, lenta avanzata della camera.
- 6.0–8.5s: AFTERIMAGE. Ogni lettera lascia la propria ombra spostata, la larghezza passa da 62 a 125.
- 8.5–10s: la camera si ritira nel buio e compaiono HUD e navigazione.

**02 The Signal.** Tipografia cinetica gigante, immagini procedurali stratificate, maschere a fessura, distorsione SVG leggera e frammenti in italiano.

**03 The Object.** La scena 3D interattiva.

**04 The Record.**
- Copertina procedurale: lunga esposizione del metallo liquido con doppia esposizione rossa sfalsata; `MERCY V. — AFTERIMAGE — DRK-001` in mono nell'angolo.
- Tracklist con hover safelight: la riga si "espone" e compaiono durata e nota.
- Galleria come **provino a contatto**: fotogrammi numerati, scelte cerchiate a matita grassa rossa.
- Visualizer: oscilloscopio a linea singola.

**05 Credits / Outro.** Titoli di coda come registro di camera oscura (in italiano), info di uscita, ultimo flash. La parola resta impressa, svanisce nel nero e torna la riga iniziale.

## 8. Tracklist

| # | Titolo | Durata |
|---|---|---|
| 01 | FLASH (INTRO) | 1:12 |
| 02 | RETINA BURN | 3:04 |
| 03 | CHROME TEETH | 2:48 |
| 04 | GHOST IN THE NEGATIVE | 3:31 |
| 05 | SILVER HALIDE | 2:57 |
| 06 | 1/60s | 2:19 |
| 07 | RED LIGHT ROOM | 3:46 |
| 08 | OVEREXPOSED | 2:41 |
| 09 | WHAT THE CAMERA KEPT | 3:22 |
| 10 | AFTERIMAGE | 4:08 |

## 9. Sistema UI

- Griglia a 12 colonne, composizioni asimmetriche, gutter 16px su mobile.
- HUD da mirino negli angoli: contatore fotogrammi legato allo scroll, timecode, stato REC.
- Cursore: parentesi di messa a fuoco `[ ]` con scia leggera (solo puntatori fini).
- Tutti i controlli raggiungibili da tastiera, focus visibile in safelight.

## 10. Riferimenti di tono

Il flash crudo di Weegee · la grana di Daido Moriyama · il rigore di segnale di Ryoji Ikeda. Solo come spirito: nessun asset copiato. Tutte le immagini sono procedurali e generate nel sito.

## Stack

Vite + React · GSAP (ScrollTrigger) · Three.js · @fontsource. Il progetto vive in `/afterimage`; il portfolio in `index.html` alla radice resta invariato.

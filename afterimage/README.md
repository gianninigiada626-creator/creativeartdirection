# AFTERIMAGE — MERCY V.

Experimental album campaign site. Art direction: [`ART_DIRECTION.md`](./ART_DIRECTION.md).

## Run

Requires Node 18+.

```bash
cd afterimage
npm install
npm run dev        # http://localhost:5173
```

Production build:

```bash
npm run build      # outputs dist/
npm run preview    # serves dist/ at http://localhost:4173
```

The build uses a relative base, so `dist/` can be hosted from any sub-path.

## Structure

```
src/
  data/album.js            all copy: tracks, fragments, release info
  lib/Stage.js             Three.js scene: liquid metal, procedural studio env, afterimage pass
  lib/stageStates.js       tweenable stage params + per-chapter resting states
  lib/director.js          ScrollTrigger choreography of the shared 3D object
  lib/cover.js             procedural album artwork (canvas)
  components/              StageProvider, HUD, cursor, grain, ghost title, artwork reveal
  sections/                Opening (01 intro + hero), ObjectSection (03), stubs for 02/04/05
  styles/                  tokens.css (palette, type, motion) + global.css
```

## Behaviour notes

- Intro: ~10s, skippable with the SKIP button or `ESC`. Scroll is locked until it ends.
- `prefers-reduced-motion`: no flash, no trails, short crossfade intro.
- No WebGL2 / context lost: a still frame replaces the 3D object; everything else works.
- Three.js loads as a separate chunk so the opening darkness paints immediately.

// node stills.mjs <outdir> <w> <h> <frac> <shot>...  → <outdir>/<shot>.png: one colour frame of each shot at k = frac
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const [out, w, h, frac, ...ids] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const id of ids) {
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('pageerror', (e) => console.log(id, 'pageerror', e.message));
  p.on('console', (m) => m.type() === 'error' && console.log(id, 'console', m.text()));
  await p.goto(`http://127.0.0.1:8090/la-santa/engine3d/stage.html?w=${w}&h=${h}`);
  await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  const t0 = Date.now();
  try {
    const info = await p.evaluate((id) => window.buildAnim(id, {}), id);
    const fr = frac.split(',').map(Number);
    for (const f of fr) {
      const t = f * info.dur;
      const r = await p.evaluate(([k, t]) => window.renderFrame(k, t, ['color']), [f, t]);
      writeFileSync(`${out}/${id}${fr.length > 1 ? '-' + f : ''}.png`, Buffer.from(r.color.split(',')[1], 'base64'));
    }
    console.log(id, ((Date.now() - t0) / 1000).toFixed(1), 's', 'dur', info.dur?.toFixed(2));
  } catch (e) {
    console.log(id, 'ERROR', e.message.split('\n')[0]);
  }
  await p.close();
}
await b.close();

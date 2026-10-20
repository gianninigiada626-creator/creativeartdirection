// node anim.mjs <outdir> <panel> <seconds> <fps> [json-opts]  → <outdir>/<panel>/f####-{color,normal,depth,id}.png
// Builds the panel's scene once and renders it at k = 0..1 (t in seconds), via the panel's update(k, t).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const [out, id, seconds, fps, json] = process.argv.slice(2);
const n = Math.max(1, Math.round(+seconds * +fps));
const dir = `${out}/${id}`;
mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1038 } });
p.on('pageerror', (e) => console.log('pageerror', e.message));
p.on('console', (m) => m.type() === 'error' && console.log('console', m.text()));
await p.goto('http://127.0.0.1:8090/tutto-bene/engine3d/stage.html');
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const info = await p.evaluate(([id, o]) => window.buildAnim(id, o), [id, json ? JSON.parse(json) : {}]);
writeFileSync(`${dir}/meta.json`, JSON.stringify({ ...info, n, fps: +fps, seconds: +seconds }));
const t0 = Date.now();
for (let i = 0; i < n; i++) {
  const k = n === 1 ? 0 : i / (n - 1);
  const passes = await p.evaluate(([k, t]) => window.renderFrame(k, t), [k, i / +fps]);
  const tag = `f${String(i).padStart(4, '0')}`;
  for (const [key, v] of Object.entries(passes)) {
    if (key === "faces" || key === "meta") writeFileSync(`${dir}/${tag}-${key}.json`, v);
    else writeFileSync(`${dir}/${tag}-${key}.png`, Buffer.from(v.split(',')[1], 'base64'));
  }
}
console.log(id, n, 'frames', ((Date.now() - t0) / n / 1000).toFixed(2), 's/frame');
await b.close();

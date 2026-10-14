// node anim.mjs <outdir> <shot> [w] [h] [fps] [from] [to]  → <outdir>/<shot>/f####-{color,depth}.png
// Builds the shot once and renders its frames: t = i / fps from the shot's start, k = t / dur.
// from/to (frame numbers) let several processes share one shot.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
const [out, id, w = '1280', h = '720', fps = '12', from = '0', to = '999999'] = process.argv.slice(2);
const dir = `${out}/${id}`;
mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('pageerror', (e) => console.log('pageerror', e.message));
p.on('console', (m) => m.type() === 'error' && console.log('console', m.text()));
await p.goto(`http://127.0.0.1:8090/la-santa/engine3d/stage.html?w=${w}&h=${h}`);
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const info = await p.evaluate((id) => window.buildAnim(id, {}), id);
const dur = info.dur;
const n = Math.max(1, Math.round(dur * +fps));
writeFileSync(`${dir}/meta.json`, JSON.stringify({ ...info, n, fps: +fps, w: +w, h: +h }));
const t0 = Date.now();
let done = 0;
for (let i = +from; i < Math.min(n, +to); i++) {
  const tag = `f${String(i).padStart(4, '0')}`;
  if (existsSync(`${dir}/${tag}-depth.png`)) continue;
  const t = i / +fps;
  const passes = await p.evaluate(([k, t]) => window.renderFrame(k, t, ['color', 'depth']), [t / dur, t]);
  writeFileSync(`${dir}/${tag}-color.png`, Buffer.from(passes.color.split(',')[1], 'base64'));
  if (passes.focus) writeFileSync(`${dir}/${tag}-focus.txt`, passes.focus);
  writeFileSync(`${dir}/${tag}-depth.png`, Buffer.from(passes.depth.split(',')[1], 'base64'));
  done++;
}
console.log(id, done, 'frames', done ? ((Date.now() - t0) / done / 1000).toFixed(2) : 0, 's/frame');
await b.close();

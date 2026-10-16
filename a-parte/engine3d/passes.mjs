// node passes.mjs <outdir> <panel>[:json-opts] ...  → <outdir>/<panel>-{color,normal,depth,id}.png
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const [out, ...ids] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1920, height: 804 } });
p.on('pageerror', (e) => console.log('pageerror', e.message));
p.on('console', (m) => m.type() === 'error' && console.log('console', m.text()));
await p.goto('http://127.0.0.1:8090/a-parte/engine3d/stage.html');
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
for (const spec of ids) {
  const [id, json] = spec.split(/:(.*)/s);
  const opts = json ? JSON.parse(json) : {};
  const tag = opts.tag ?? id;
  const t = Date.now();
  const passes = await p.evaluate(([id, opts]) => window.renderPanel(id, opts), [id, opts]);
  for (const [k, v] of Object.entries(passes)) {
    if (k === 'meta' || k === 'faces') writeFileSync(`${out}/${tag}-${k}.json`, v);
    else writeFileSync(`${out}/${tag}-${k}.png`, Buffer.from(v.split(',')[1], 'base64'));
  }
  console.log(tag, (Date.now() - t) / 1000, 's');
}
await b.close();

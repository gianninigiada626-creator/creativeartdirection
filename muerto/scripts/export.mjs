// Frame-accurate MP4 export.
//   1. npm run build && npm run preview          (serves dist/ on http://localhost:4173)
//   2. npm run export -- [--url http://localhost:4173] [--fps 24] [--from 0] [--to <end>] [--out out/muerto.mp4]
// Needs Playwright (npm i -D playwright && npx playwright install chromium) and ffmpeg on PATH.
// Every frame is rendered by seeking the film to an exact time, so the video is identical to the web version.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};
const url = arg('url', 'http://localhost:4173');
const out = arg('out', 'out/muerto.mp4');
const softwareGL = process.argv.includes('--software-gl');

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright').catch(() => {
  console.error('Playwright not found. Install it with: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
});
const browser = await pw.chromium.launch({
  args: softwareGL ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(`${url}/?export`);
await page.waitForFunction(() => window.__filmReady, null, { timeout: 600000 });
const info = await page.evaluate(() => ({ duration: window.__film.duration, fps: window.__film.fps }));
const fps = Number(arg('fps', info.fps));
const from = Number(arg('from', 0));
const to = Number(arg('to', info.duration));
mkdirSync(dirname(out), { recursive: true });

// soundtrack: song + synthesised foley, rendered offline in the page
console.log('rendering soundtrack…');
const size = await page.evaluate(() => window.__film.prepareAudio());
const chunks = [];
for (let i = 0; i < size; i += 4 << 20) chunks.push(Buffer.from(await page.evaluate(([i, n]) => window.__film.audioChunk(i, n), [i, 4 << 20]), 'base64'));
const wavPath = out.replace(/\.mp4$/, '.wav');
writeFileSync(wavPath, Buffer.concat(chunks));

const ff = spawn('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  '-ss', String(from), '-i', wavPath,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart',
  out,
], { stdio: ['pipe', 'inherit', 'inherit'] });

const total = Math.round((to - from) * fps);
const t0 = Date.now();
for (let f = 0; f < total; f++) {
  const t = from + f / fps;
  await page.evaluate((t) => window.__film.renderAt(t), t);
  const jpg = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % fps === 0) {
    const done = (f + 1) / total;
    const eta = ((Date.now() - t0) / done - (Date.now() - t0)) / 1000;
    console.log(`frame ${f + 1}/${total}  ${(done * 100).toFixed(1)}%  eta ${Math.round(eta / 60)} min`);
  }
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log(`done → ${out}`);

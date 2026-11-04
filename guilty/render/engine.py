"""GUILTY · render engine.

Pipeline: anim.py (per-frame SVG scene, 960x540 stage space) -> headless Chromium (vector raster at 1920x1080,
global ink boil filter, paper multiply layer) -> JPEG frames piped to ffmpeg (H.264) in parallel segments ->
concat + original audio mux.

Usage:
  python3 engine.py sheet [shots]          contact sheets (p = .1/.5/.9 per shot) -> out/sheets/
  python3 engine.py frames N [N ...]       single global frames -> out/frames/
  python3 engine.py render [--workers 3] [--from F --to F] [--crf 18]
"""
import json, math, os, re, subprocess, sys, time, argparse
from multiprocessing import Process

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, "tools"))
import anim
from sb_shots import SHOTS as SB, CHAPTERS

FPS = 24
ANA = json.load(open(os.path.join(ROOT, "audio", "analysis.json")))
BT = ANA["bar_times"]; END = 204.92; FILE_END = 209.04
AUDIO = os.environ.get("GUILTY_AUDIO", "/root/.claude/uploads/15f00ca8-e346-5f6b-ae5c-f5c99d17de06/66939b16-ytmp3free.cc_noyz-narcos-guilty-11-guilty-youtubemp3free.org.mp3")
OUT = os.environ.get("GUILTY_OUT", os.path.join(HERE, "out"))
CHROME = "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome"
TOTAL = round(FILE_END * FPS)

def bar_t(b):
    if b <= 1: return 0.0
    if b - 1 < len(BT): return BT[b - 1]
    return END

# ── shot table in frames ──
TABLE = []
for s in SB:
    t0 = s["t0"] if s.get("t0") is not None else bar_t(s.get("b0", 1))
    t1 = s["t1"] if s.get("t1") is not None else bar_t(s.get("b1", 69))
    TABLE.append(dict(n=s["n"], ch=s["ch"], f0=round(t0 * FPS), f1=round(t1 * FPS)))
for a, b in zip(TABLE, TABLE[1:]): a["f1"] = b["f0"]
TABLE[-1]["f1"] = TOTAL
GUILT = {c[0]: c[4] for c in CHAPTERS}
# ink boil amplitude by chapter (stage units; 1 unit = 2 px at 1080p)
BOIL = dict(P=.7, I=.9, II=1.1, III=1.4, IV=1.7, V=2.0, C=2.8, E=.8)

def locate(f):
    for s in TABLE:
        if s["f0"] <= f < s["f1"]: return s
    return TABLE[-1]

def frame_state(f):
    s = locate(f); fi = f - s["f0"]; d = (s["f1"] - s["f0"]) / FPS; t = fi / FPS
    markup = anim.SHOTS[s["n"]](t, d, fi)
    boil = BOIL[s["ch"]]
    if s["n"] in (29, 30): boil = 2.8 + 1.2 * min(1, t / d)       # collapse peaks
    if s["n"] >= 36: boil = .6
    g = GUILT[s["ch"]] / 100
    vign = .10 + .45 * g
    return dict(m=markup, seed=1 + (f // 2) % 97, boil=round(boil, 2), vign=round(vign, 3), n=s["n"])

# ── stage page ──
def stage_html():
    sb = open(os.path.join(ROOT, "storyboard-fase-3.html")).read()
    defs = "".join(re.findall(r'<svg class="defs[^"]*".*?</svg>\n?', sb, flags=re.S))
    defs = re.sub(r"<animate\b[^>]*/>", "", defs)
    return f"""<!doctype html><html><head><meta charset="utf-8">
<style>
@font-face{{font-family:'Big Shoulders Display';font-weight:900;src:url(fonts/bigshoulders-900-latin.woff2) format('woff2')}}
@font-face{{font-family:'IBM Plex Mono';font-weight:500;src:url(fonts/plexmono-500-latin.woff2) format('woff2')}}
html,body{{margin:0;padding:0;background:#171717;overflow:hidden;width:1920px;height:1080px}}
#root{{display:block}}
</style></head><body>
{defs}
<svg id="root" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 960 540" width="1920" height="1080">
<defs>
 <filter id="boilG" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse">
  <feTurbulence id="boilT" type="fractalNoise" baseFrequency="0.028" numOctaves="2" seed="1" result="n"/>
  <feDisplacementMap id="boilD" in="SourceGraphic" in2="n" scale="1" xChannelSelector="R" yChannelSelector="G"/>
 </filter>
 <radialGradient id="vignG" cx="50%" cy="50%" r="75%"><stop offset="55%" stop-color="#171717" stop-opacity="0"/><stop offset="100%" stop-color="#171717" stop-opacity="1"/></radialGradient>
</defs>
<rect width="960" height="540" fill="#171717"/>
<g transform="translate(480 270) scale(1.012) translate(-480 -270)"><g filter="url(#boilG)"><g id="scene"></g></g></g>
<rect id="vign" width="960" height="540" fill="url(#vignG)" opacity=".2"/>
<image href="paper.png" x="0" y="0" width="960" height="540" preserveAspectRatio="none" style="mix-blend-mode:multiply" opacity=".9"/>
</svg>
<script>
const scene=document.getElementById('scene'),T=document.getElementById('boilT'),D=document.getElementById('boilD'),V=document.getElementById('vign');
const dblT=document.querySelector('#fxDouble feTurbulence'),bT=document.querySelector('#fxBoil feTurbulence');
window.setFrame=(s)=>{{scene.innerHTML=s.m;T.setAttribute('seed',s.seed);D.setAttribute('scale',s.boil);V.setAttribute('opacity',s.vign);
 if(dblT)dblT.setAttribute('seed',1+(s.seed*3)%8); if(bT)bT.setAttribute('seed',3+(s.seed*5)%8);}};
</script></body></html>"""

def write_stage():
    p = os.path.join(HERE, "stage.html")
    open(p, "w").write(stage_html()); return p

def open_page(pw):
    b = pw.chromium.launch(executable_path=CHROME, args=["--disable-gpu-vsync", "--disable-frame-rate-limit"])
    pg = b.new_page(viewport=dict(width=1920, height=1080), device_scale_factor=1)
    pg.goto("file://" + os.path.join(HERE, "stage.html")); pg.wait_for_load_state("load")
    pg.evaluate("document.fonts.ready.then(()=>1)")
    return b, pg

def snap(pg, f, kind="jpeg", path=None):
    pg.evaluate("s=>setFrame(s)", frame_state(f))
    kw = dict(type=kind, animations="disabled", caret="hide")
    if kind == "jpeg": kw["quality"] = 93
    if path: kw["path"] = path
    return pg.screenshot(**kw)

# ── modes ──
def sheet(shots):
    from playwright.sync_api import sync_playwright
    from PIL import Image, ImageDraw
    os.makedirs(os.path.join(OUT, "sheets"), exist_ok=True)
    with sync_playwright() as pw:
        b, pg = open_page(pw)
        for n in shots:
            s = TABLE[n - 1]; tiles = []
            for p in (.08, .5, .92):
                f = s["f0"] + int((s["f1"] - s["f0"] - 1) * p)
                tmp = os.path.join(OUT, "sheets", "_t.png"); snap(pg, f, "png", tmp)
                im = Image.open(tmp).convert("RGB").resize((640, 360)); tiles.append((f, im))
            W = Image.new("RGB", (640 * 3 + 40, 360 + 50), "#D6D0C4"); dr = ImageDraw.Draw(W)
            for i, (f, im) in enumerate(tiles):
                W.paste(im, (10 + i * 650, 40)); dr.text((10 + i * 650, 12), f"S{n:02d}  f{f}  t={f/FPS:.2f}s", fill="#171717")
            W.save(os.path.join(OUT, "sheets", f"S{n:02d}.png"))
        b.close()

def frames(fs):
    from playwright.sync_api import sync_playwright
    os.makedirs(os.path.join(OUT, "frames"), exist_ok=True)
    with sync_playwright() as pw:
        b, pg = open_page(pw)
        for f in fs: snap(pg, f, "png", os.path.join(OUT, "frames", f"f{f:05d}.png"))
        b.close()

def seg_worker(k, f0, f1, crf, path):
    from playwright.sync_api import sync_playwright
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "-",
           "-vf", "noise=alls=7:allf=t+u,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", str(crf),
           "-tune", "grain", "-r", str(FPS), path]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    t = time.time()
    with sync_playwright() as pw:
        b, pg = open_page(pw)
        for f in range(f0, f1):
            ff.stdin.write(snap(pg, f))
            if (f - f0) % 120 == 0:
                el = time.time() - t; done = f - f0 + 1
                print(f"[w{k}] {done}/{f1-f0} frames  {done/el:.2f} fps", flush=True)
        b.close()
    ff.stdin.close(); ff.wait()
    print(f"[w{k}] done {f0}-{f1} in {time.time()-t:.0f}s", flush=True)

def render(workers, a, z, crf, name):
    os.makedirs(os.path.join(OUT, "seg"), exist_ok=True)
    n = z - a; step = math.ceil(n / workers); procs = []; segs = []
    for k in range(workers):
        f0 = a + k * step; f1 = min(z, f0 + step)
        if f0 >= f1: break
        p = os.path.join(OUT, "seg", f"seg{k:02d}.mp4"); segs.append(p)
        pr = Process(target=seg_worker, args=(k, f0, f1, crf, p)); pr.start(); procs.append(pr)
    for pr in procs: pr.join()
    lst = os.path.join(OUT, "seg", "list.txt")
    open(lst, "w").write("".join(f"file '{p}'\n" for p in segs))
    silent = os.path.join(OUT, f"{name}_silent.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", silent], check=True)
    final = os.path.join(OUT, f"{name}.mp4")
    ss = a / FPS
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-ss", f"{ss:.3f}", "-t", f"{n/FPS:.3f}", "-i", AUDIO,
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart",
                    "-shortest", final], check=True)
    print("wrote", final)

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("mode"); ap.add_argument("args", nargs="*")
    ap.add_argument("--workers", type=int, default=3); ap.add_argument("--from", dest="a", type=int, default=0)
    ap.add_argument("--to", dest="z", type=int, default=TOTAL); ap.add_argument("--crf", type=int, default=18)
    ap.add_argument("--name", default="GUILTY_videoclip_1080p24")
    A = ap.parse_args()
    write_stage()
    if A.mode == "sheet": sheet([int(x) for x in A.args] or [s["n"] for s in TABLE])
    elif A.mode == "frames": frames([int(x) for x in A.args])
    elif A.mode == "render": render(A.workers, A.a, A.z, A.crf, A.name)
    elif A.mode == "table":
        for s in TABLE: print(s, f'{(s["f1"]-s["f0"])/FPS:.2f}s')
        print("total frames", TOTAL)

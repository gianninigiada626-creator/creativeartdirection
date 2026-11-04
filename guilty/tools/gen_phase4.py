"""Phase 4 generator: technical shot list, asset list, AI prompt library (HTML + Markdown + JSON), effort, schedule."""
import json, sys, html
sys.path.insert(0, sys.argv[1])
from sb_shots import SHOTS, CHAPTERS
from p4_data import TECH, ASSETS, EN
import sb_panels

ana = json.load(open(sys.argv[2])); bt = ana["bar_times"]; END = 204.92
def bar_t(b): return 0.0 if b <= 1 else (bt[b - 1] if b - 1 < len(bt) else END)
def tc(t):
    fr = round(t * 24); m, rem = divmod(fr, 1440); s, f = divmod(rem, 24); return f"{m:02d}:{s:02d}:{f:02d}"
def esc(s): return html.escape(s, quote=False)
for s in SHOTS:
    s["t0"] = s.get("t0", bar_t(s.get("b0", 1))); s["t1"] = s.get("t1", bar_t(s.get("b1", 69))); s["dur"] = s["t1"] - s["t0"]
TECH[13]["anim"] = "Crescita della macchia disegnata a mano"

SIZE = {"EWS": "Extreme wide shot", "WS": "Wide shot", "MS": "Medium shot", "MCU": "Medium close-up", "CU": "Close-up", "ECU": "Extreme close-up", "OTS": "Over-the-shoulder shot", "INS": "Insert shot", "—": "Title card"}
def stage(n): return 1 if n <= 12 else 2 if n <= 26 else 3 if n <= 29 else 4 if n <= 33 else 2
STAIN = {1: "the fingertips of his right hand stained with matte burgundy (#8C1748) spray paint with speckled edges",
         2: "the whole fingers of his right hand stained with matte burgundy (#8C1748) spray paint",
         3: "his entire right hand stained with matte burgundy (#8C1748) spray paint up to the palm",
         4: "matte burgundy (#8C1748) paint covering his right hand and climbing over the sleeve cuff"}
PRT = ("the protagonist MONOLITH, an original fictional man about 36: heavy block-shaped silhouette about 6 heads tall, massive rounded hunched shoulders with the head sunk between them, "
       "no visible neck, pointed black hood always up, boxy black technical jacket, oversized black hoodie with two uneven drawstrings (his right one shorter), wide baggy black trousers stacking above the ankles, "
       "chunky black sneakers with thick off-white midsoles, oversized paper-toned hands with thick tube-like fingers, face recessed in the hood shadow with two pale eye points and a scar on his left eyebrow")
WIT = "the Witness, an original elderly man about 70: tall and thin, flat black cap, thick round glasses reflecting pure white so the eyes are never visible, long concrete-grey cardigan to the knees, black trousers, hands clasped behind his back, completely still"
DBL = ("his psychological double: the same block-shaped silhouette, hood and clothes with inverted values (the black garments become dirty off-white paper described by black lines, face and hands become solid ink black), "
       "wet unstable outlines, joints bending past natural, blank eyes rimmed in burgundy, a burgundy grin wider than the face, clean hands")
MEM = "the Memory, a young graffiti writer about 20 in late-2000s streetwear (colour-blocked windbreaker, cap, backpack straps, straight jeans, skate shoes, a spray can), drawn only with a single burgundy ink line on paper, the face dissolved into burgundy halftone dots"
CROWD = "residents from the approved city-people library (CP01–CP12) drawn in the same ink style, mixing black with concrete grey, cement blue and brown; some are half-animal street characters (pigeon, gull, cat, wild boar, crow), no rats"
def chars(code, n):
    st = STAIN[stage(n)]
    return {
        "CROWD0": CROWD + ", with simple faces",
        "CROWDFACELESS": CROWD + ", their faces blank paper with no features",
        "CROWDSIL": CROWD + ", rendered as flat dark-grey silhouettes standing still, all turned toward him",
        "PRT1": PRT + "; " + st, "PRT34": PRT + ", in three-quarter view; " + st, "PRTSIDE": PRT + ", in right-facing profile; " + st,
        "PRTREAR": PRT + ", seen from behind: the hood draping onto the upper back, the heels of the sneakers; " + st,
        "PRTTURN": PRT + ", seen from behind with his head turned about 80 degrees over his right shoulder, the hood in profile showing only the edge of his face; " + st,
        "PRTRUN": PRT + ", running with the torso leaning forward and arms bent; " + st,
        "PRTSIT": PRT + ", sitting with his hands on his knees; " + st, "PRTSIT_DAWN": PRT + ", sitting on the parapet in right-facing profile; " + st,
        "PRTHAND": PRT + ", raising his right hand; " + st, "PRTFALL": PRT + ", falling backwards with arms thrown up; " + st,
        "PRTKNEEL": PRT + ", kneeling on one knee, head below the shoulders, arms hanging; " + st,
        "PRTSHOE": "one chunky black sneaker of the protagonist with a thick off-white midsole and the stacked hem of his wide black trousers",
        "PRTTOP": "the protagonist seen from above: a small black hooded figure with a long shadow",
        "PRTREARSMALL": "the protagonist as a tiny black hooded figure seen from above",
        "PRTEYES": "only the protagonist's eyes: two pale points inside the black hood shadow, a scar on his left eyebrow",
        "PRTPALMS2": "the protagonist's two oversized open hands with thick tube-like fingers, palms up; " + st,
        "PRTHANDCAN": "the protagonist's oversized right hand with thick tube-like fingers gripping a grey spray can with a burgundy cap, index finger on the nozzle; " + st,
        "PRTHOODDOWN": "the protagonist pulling his black hood down with both oversized hands, revealing a shaved head, heavy brow, scar on his left eyebrow, broken nose, thick lower lip and halftone stubble, his face lit for the first time; " + st,
        "PRTFACE_OPEN": "close-up of the protagonist with the hood down: shaved head, heavy brow, scar splitting his left eyebrow, broken nose with a bump, small deep-set eyes looking straight into the lens, thick lower lip, halftone stubble",
        "PRTSIT_DAWN_SMALL": "the protagonist, tiny, sitting on the rooftop parapet with the hood down",
        "WIT": WIT, "WITEDGE": "out-of-focus railing bars and the white-glinting rim of an old man's glasses in the foreground",
        "WITFAR": "far away, " + WIT, "WITREFL": "as a reflection in the dark window, " + WIT,
        "WITHEAD": "close-up of the Witness's head: flat black cap, thick round glasses reflecting pure white, long narrow face with deep folds and white stubble",
        "DBL": DBL, "DBLREFL": DBL + ", appearing as a reflection in the dark window", "DBLHAND": DBL + ", raising its hand with the wrist bending too far",
        "DBLDISSOLVE": DBL + ", flaking apart into ink particles", "MEM": MEM,
        "HANDS3": "the protagonist's oversized right hand stained burgundy up to the palm reaching in from the left, and the double's clean solid-black hand with an off-white outline reaching in from the right",
    }[code]
ENV = {
 "A_sunset": "Lotto 7, a fictional Roman public-housing estate: long concrete slab blocks with access galleries, roll-down shutters, satellite dishes, laundry lines, a fenced five-a-side pitch in the courtyard, shops with metal shutters at the ground floor of block D",
 "A_asphalt": "cracked asphalt of the estate street with halftone texture",
 "A_courtyard": "the courtyard of Lotto 7: access galleries with laundry, the fenced five-a-side pitch, benches, a cast-iron drinking fountain",
 "A_courtyard_top": "the courtyard of Lotto 7 seen from a third-floor balcony: concrete ground, the pitch markings, a few residents",
 "A_balcony": "a third-floor balcony of block B with a black railing and dry potted plants",
 "A_evening_shutters": "the estate street at night: block D with metal shutters, the second shutter from the west carrying a burgundy tag",
 "A_shopwindow": "a dark shop window on the estate street at night, reflecting the street",
 "A_evening_street": "the estate street at night stretching toward the black mouth of the metro entrance",
 "A_dawn_high": "Lotto 7 seen from above at dawn, the rooftop of block A with the service hut and its burgundy tag",
 "C_night": "the flat roof of block A at night: parapet, service hut with the stair door, water tanks, TV antennas, satellite dishes, a pair of sneakers hanging from a cable between antennas, the city skyline in six depth planes, a large halftone moon",
 "C_tagwall": "the west wall of the rooftop service hut at night with the friend's large burgundy tag",
 "C_tagwall_close": "close on the rooftop wall with the burgundy tag at night",
 "C_dawn": "the flat roof of block A at dawn: parapet, antennas, the hanging sneakers, paper-white sky",
 "B_escalator": "an endless metro escalator with off-white tiled walls",
 "B_platform": "an underground metro side platform with off-white tiles, cold fluorescent tubes (one failing), a graffiti-covered train with illegible tags",
 "B_train": "inside a near-empty metro car: plastic seats, poles, dark windows reflecting the interior",
 "B_train_window": "a dark metro car window reflecting the interior",
 "B_train_loop": "inside the metro car where the windows open onto other windows",
 "D_stairs": "the Mental Zone: a stairwell of the estate repeating inward forever",
 "D_corridor": "the Mental Zone: the metro mezzanine corridor with turnstiles folding back on itself",
 "D_paper": "the Mental Zone: an empty space where the paper itself glows",
 "D_stairs_loop": "the Mental Zone: the courtyard staircase recombined into an endless loop of flights climbing and descending into each other",
 "D_shutters": "the Mental Zone: an endless corridor of metal shutters, every one with the same burgundy tag",
 "E": "the Collapse: the blocks of Lotto 7 broken along a 3-metre grid and suspended in black ink space, burgundy flooding the cracks",
 "E_fragment": "the Collapse: a floating fragment of the courtyard in black ink space with burgundy cracks",
 "E_tear": "the Collapse: the paper of the image torn diagonally, pure black ink behind",
 "black": "a plain black background (the inside of the hood shadow)", "paper": "plain dirty off-white paper", "title": "plain dirty off-white paper",
}
STYLE = ("Urban Ink Cinematic style: underground European comic-book illustration, confident black brush-ink outlines in three weights, black masses described by off-white reverse lines, "
         "halftone dot shading on a single 30-degree screen, light photocopy grain, printed on distressed dirty off-white paper (#D6D0C4); architecture as stylized 3D with three-band toon shading and a thin ink line render")
def palette(ch):
    base = "Palette ink black #171717, dirty paper #D6D0C4, concrete grey #777A79, cement blue #687783, industrial brown #66594E"
    return base + {"C": "; burgundy #8C1748 flooding the fractures.", "IV": "; burgundy #8C1748 only on the tag and the stain.", "V": "; burgundy #8C1748 only on the tag, the stain and the double's eyes and mouth."}.get(ch, "; burgundy #8C1748 only on the tag and the stain.")
MATERIALS = "Materials: matte cotton and nylon as solid ink with reverse lines, concrete with fine halftone and water stains, paper-toned skin with fine hatching."
NEG_BASE = ["photorealistic", "3D render look", "plastic CGI", "anime", "manga", "chibi", "glossy highlights", "soft gradients", "airbrush", "extra fingers", "fused fingers", "deformed hands",
            "distorted faces", "inconsistent line weight", "uncontrolled flicker", "random background objects", "random extra characters", "unwanted text", "letters", "logos", "watermark", "signature",
            "saturated red", "neon colours", "lens flare"]
def negatives(n, e):
    neg = list(NEG_BASE); cs = e["chars"]
    if any(c.startswith("PRT") for c in cs):
        neg += ["clothing changes", "six fingers", "three fingers", "stain on the left hand"]
        neg += (["hood up"] if n >= 35 else ["hood down", "visible hair", "visible neck"])
    if any(c.startswith("DBL") for c in cs): neg += ["pupils in the double's eyes", "stain on the double"]
    if any(c.startswith("WIT") for c in cs): neg += ["visible eyes behind the glasses", "the Witness moving"]
    if "MEM" in cs: neg += ["black ink on the Memory", "a visible face on the Memory"]
    if any(c.startswith("CROWD") for c in cs): neg += ["rats", "caricature of real ethnic groups"]
    for x in e["neg"]:
        if x not in neg: neg.append(x)
    return ", ".join(neg)
def light_side(n): return "from the right (dawn, east)" if n >= 34 and n <= 37 else "from the left"
def image_prompt(s, e):
    n = s["n"]
    if n == 38:
        return "Title card on distressed dirty off-white paper (#D6D0C4): the word GUILTY in heavy condensed black ink letters, NOYZ NARCOS in small spaced mono capitals below, a small burgundy (#8C1748) illegible graffiti tag under it. Light photocopy grain, no other text, no logos."
    lens = s["lens"].replace("Dolly zoom", "dolly zoom").replace("macro", "macro") if s["lens"] != "—" else ""
    people = ". ".join(chars(c, n)[0].upper() + chars(c, n)[1:] for c in e["chars"])
    parts = [f'{SIZE.get(s["size"], "Shot")}: {e["comp"]}.']
    if people: parts.append(people + ".")
    parts.append(f'Setting: {ENV[e["env"]]}.')
    cam = f'Camera: {e["angle"]}' + (f', {lens} lens' if lens else "") + ", 16:9 frame with the action kept inside a 2.39:1 safe area."
    parts += [cam, f'Lighting: {e["light"]}.', palette(s["ch"]), STYLE + ".", MATERIALS]
    if e["action"] != "—": parts.append(f'Moment: {e["action"]}.')
    if e["cont"] != "—": parts.append(f'Continuity: {e["cont"]}.')
    parts.append("No text, no logos, no signature.")
    return " ".join(parts)
def motion_prompt(s, e):
    n = s["n"]
    if n == 38: return "Hold the title card still for 4 seconds with a very slight paper grain flicker; no camera move."
    return (f'Animate this exact frame for {s["dur"]:.1f} seconds at 24 fps. Camera: {e["cam"]}. Subject: {e["subj"]}. Environment: {e["envm"]}. Timing: {e["cad"]}. '
            "Keep the drawing, line weights, halftone screen, paper texture and palette exactly as in the first frame; no new characters, objects or text; no morphing of faces, hands or clothes; no camera moves other than the one described.")
def continuity(s, e):
    n = s["n"]; items = []
    cs = e["chars"]
    if any(c.startswith("PRT") for c in cs):
        items.append(f"Macchia allo stadio {stage(n)} solo sulla mano destra")
        items.append("Cappuccio giù, volto in luce" if n >= 35 else "Cappuccio su, volto in ombra con due punti chiari")
        items.append("Cicatrice sul sopracciglio sinistro; coulisse destra più corta")
    items.append(f"Luce principale {('da destra (alba)' if 34 <= n <= 37 else 'da sinistra')}")
    if any(c.startswith("CROWD") for c in cs):
        items.append({"CROWD0": "Folla viva, volti semplici", "CROWDFACELESS": "Folla senza volto", "CROWDSIL": "Folla come sagome ferme"}[next(c for c in cs if c.startswith("CROWD"))])
    if any(c.startswith("WIT") for c in cs): items.append("Testimone fermo" if n != 31 else "Testimone: unica girata della testa (6 disegni)")
    if any(c.startswith("DBL") for c in cs): items.append("Doppio a 24 fps, valori invertiti, ombra verso la luce")
    if "MEM" in cs: items.append("Memoria a 6 fps, solo lastra bordeaux")
    items.append("Contorno 9–10 px a 4K, linea degli ambienti entro 3,5 px")
    return items
def refs(s, e):
    base = []
    cs = e["chars"]
    if any(c.startswith("PRT") for c in cs): base.append("Character anchor del protagonista (VD-03: turnaround, volto, mani) come reference di personaggio, intensità alta")
    if any(c.startswith(("DBL", "WIT", "MEM", "CROWD")) for c in cs): base.append("Schede dei secondari interessati (VD-04 §1–4) come reference di personaggio")
    base += [r + " come reference" for r in e["refs"]]
    base.append("Il riquadro dello storyboard serve per la composizione (struttura alta, stile basso). Lo style frame approvato del capitolo, a intensità media. Mai la Reference B.")
    return base
AI_LABEL = {"veo": "Veo 3.1", "kling": "Kling 3.0", "runway": "Runway Gen-4.5"}

rows, lib, md, js = [], [], ["# Guilty · Libreria dei prompt (Fase 4)\n", "Generata dai dati di VD-05 e VD-06. Prompt in inglese per i generatori; note in italiano.\n"], []
tot = [0, 0, 0, 0]
for s in SHOTS:
    n = s["n"]; t = TECH[n]; e = EN[n]
    for i in range(4): tot[i] += t["d"][i]
    use = "Produzione (plate) e animatic" if t["ai"] in ("veo", "runway") else ("Previs della transizione e animatic" if t["ai"] == "kling" else "Animatic e style frame")
    ai_cell = (f'<b>{AI_LABEL[t["ai"]]}</b><br>{esc(t["aid"])}' if t["ai"] else '<span class="muted">Nessuno in produzione · animatic</span>')
    days = sum(t["d"])
    rows.append(f'<tr><td class="th"><a href="#p{n:02d}">{sb_panels.render(n)}</a></td><td class="m"><b>{n:02d}</b><br>{tc(s["t0"])}<br>{s["dur"]:.2f} s</td><td>{esc(t["m"])}<br><span class="muted">{esc(s["size"])} · {esc(s["lens"])}</span></td>'
                f'<td class="m">{" ".join(t["a"])}</td><td>{esc(t["anim"])}</td><td>{esc(s["vfx"])}</td><td class="m">{esc(t["sw"])}</td><td>{ai_cell}</td>'
                f'<td class="m cx cx-{t["cx"]}">{t["cx"]}</td><td class="m">{days:.1f}</td></tr>')
    ip, mp, ng = image_prompt(s, e), motion_prompt(s, e), negatives(n, e)
    co, rf = continuity(s, e), refs(s, e)
    lib.append(f'''<details class="pl" id="p{n:02d}"><summary><span class="pn">{n:02d}</span><span class="pt">{esc(s["purpose"])}</span><span class="pu">{use}</span></summary>
<div class="plbody">
<div class="prompt"><header><span>Immagine · keyframe <em>16:9</em></span><button class="copy" type="button" data-copy="i{n:02d}">Copia</button></header><pre id="i{n:02d}">{esc(ip)}</pre></div>
<div class="prompt"><header><span>Image-to-video · solo movimento <em>{s["dur"]:.1f} s</em></span><button class="copy" type="button" data-copy="v{n:02d}">Copia</button></header><pre id="v{n:02d}">{esc(mp)}</pre></div>
<div class="prompt neg"><header><span>Negative prompt</span><button class="copy" type="button" data-copy="n{n:02d}">Copia</button></header><pre id="n{n:02d}">{esc(ng)}</pre></div>
<div class="grid2 plmeta"><div><h4>Vincoli di continuità</h4><ul class="list-tight">{"".join(f"<li>{esc(x)}</li>" for x in co)}</ul></div><div><h4>Reference da allegare</h4><ul class="list-tight">{"".join(f"<li>{esc(x)}</li>" for x in rf)}</ul></div></div>
</div></details>''')
    md.append(f"\n## Shot {n:02d} · {tc(s['t0'])} → {tc(s['t1'])} ({s['dur']:.2f} s)\n\n**Uso:** {use}" + (f" · {AI_LABEL[t['ai']]}: {t['aid']}" if t["ai"] else "") +
              f"\n\n**Image prompt**\n\n```\n{ip}\n```\n\n**Image-to-video prompt**\n\n```\n{mp}\n```\n\n**Negative prompt**\n\n```\n{ng}\n```\n\n**Continuità:** " + "; ".join(co) + "\n\n**Reference:** " + "; ".join(rf) + "\n")
    js.append(dict(shot=n, tc_in=tc(s["t0"]), tc_out=tc(s["t1"]), duration_s=round(s["dur"], 2), usage=use, ai_tool=AI_LABEL.get(t["ai"], ""), ai_role=t["aid"],
                   image_prompt=ip, image_to_video_prompt=mp, negative_prompt=ng, continuity=co, references=rf))

asset_rows = []
adays = {"2D": 0, "3D": 0, "FX": 0, "Comp": 0}
for code, name, swr, dep, days in ASSETS:
    used = [s["n"] for s in SHOTS if code in TECH[s["n"]]["a"]]
    used_s = ", ".join(f"{u:02d}" for u in used) if used else "template di tutti gli shot"
    dept = "FX" if code.startswith("FX") or code in ("ENVD", "ENVE") else ("Comp" if code == "NK" else ("2D" if code in ("PRT", "PRTF", "DBL", "WIT", "MEM", "CP", "OBJ", "TAG") else "3D"))
    adays[dept] += days
    asset_rows.append(f'<tr><td class="m"><b>{code}</b></td><td>{esc(name)}</td><td class="m">{esc(swr)}</td><td class="m">{esc(dep)}</td><td class="m">{used_s}</td><td class="m">{dept}</td><td class="m">{days:g}</td></tr>')

json.dump(dict(rows="".join(rows), lib="\n".join(lib), assets="".join(asset_rows), tot=tot, adays=adays), open(sys.argv[3], "w"))
open(sys.argv[4], "w").write("\n".join(md))
json.dump(js, open(sys.argv[5], "w"), ensure_ascii=False, indent=1)
print("shot days 3D/2D/FX/Comp", [round(x, 1) for x in tot], "asset days", adays)

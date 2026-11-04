"""City People v2, Witness v2 and Memory v2 in the protagonist's Urban Ink style.
Same language as PRT: heavy ink contour, black masses with paper reverse lines, paper skin,
oversized tube-finger hands (PRT's handA) and chunky sneakers (PRT/B/C shoes), halftone on the
side away from the key light (upper left). Ground y=640, 3.284 units/cm.
Five passers-by are half-animal, from Rome's urban fauna (no rat: that is Reference B's character).
Usage: python3 gen_cast.py <out.svg.part>"""
import sys, math

INK, PAP, HI, CON, CEM, BRN, DEEP, GRY = "#171717", "#D6D0C4", "#E8E4DB", "#777A79", "#687783", "#66594E", "#3E4852", "#8A8D8B"
U = 3.284

def F(v): return f"{v:.1f}"

def fold_col(fill):
    return PAP if fill in (INK, DEEP) else INK

# ─────────────────────────── HEADS (local 0..120 × 0..150, neck at 60,150) ───────────────────────────
def face_shadow(d):
    return f'<path d="{d}" fill="url(#dotInk)" opacity=".85"/>'

HEADS = {}

# H01 writer: beanie + bandana, sly eyes
HEADS["hd01"] = f'''
<path d="M14,78 C6,74 4,90 8,98 C10,104 16,106 20,102 Z M106,78 C114,74 116,90 112,98 C110,104 104,106 100,102 Z" fill="{PAP}" stroke="{INK}" stroke-width="2.6"/>
<path d="M60,30 C86,30 99,52 98,80 C97,110 86,134 60,140 C34,134 23,110 22,80 C21,52 34,30 60,30 Z" fill="{PAP}" stroke="{INK}" stroke-width="3"/>
{face_shadow("M80,34 C94,46 98,62 98,80 C97,96 94,108 88,118 C90,96 90,64 80,34 Z")}
<path d="M20,64 C18,30 40,10 60,10 C80,10 102,30 100,64 Z" fill="{INK}"/>
<rect x="17" y="50" width="86" height="18" rx="7" fill="{INK}"/>
<path d="M28,53 V65 M38,53 V65 M48,53 V65 M58,53 V65 M68,53 V65 M78,53 V65 M88,53 V65" stroke="{PAP}" stroke-width="1.2" opacity=".8"/>
<path d="M34,26 C42,18 52,14 62,14" fill="none" stroke="{PAP}" stroke-width="1.4" opacity=".8"/>
<path d="M33,73 C39,70 47,70 53,74 M67,72 C73,68 81,68 87,71" fill="none" stroke="{INK}" stroke-width="3.4" stroke-linecap="round"/>
<path d="M36,80 C40,76 50,76 54,80 C50,84 40,84 36,80 Z M66,80 C70,76 80,76 84,80 C80,84 70,84 66,80 Z" fill="{HI}" stroke="{INK}" stroke-width="1.8"/>
<circle cx="49" cy="80.4" r="2.3" fill="{INK}"/><circle cx="79" cy="80.4" r="2.3" fill="{INK}"/>
<path d="M35,78.5 C40,75.5 50,75.5 55,78.5 M65,78.5 C70,75.5 80,75.5 85,78.5" fill="none" stroke="{INK}" stroke-width="2.6" stroke-linecap="round"/>
<path d="M20,90 C40,86 80,86 100,90 L98,118 C88,138 72,150 60,152 C48,150 32,138 22,118 Z" fill="{INK}"/>
<path d="M52,100 C58,93 66,93 72,100" fill="none" stroke="{PAP}" stroke-width="1.6" stroke-linecap="round"/>
<g fill="{PAP}"><circle cx="34" cy="102" r="2.2"/><circle cx="46" cy="116" r="1.8"/><circle cx="76" cy="114" r="2.2"/><circle cx="88" cy="100" r="1.8"/><circle cx="60" cy="128" r="2"/><circle cx="68" cy="138" r="1.5"/></g>
<path d="M30,112 C33,108 38,110 37,114 M84,124 C86,120 91,121 90,125 M54,118 C56,114 61,115 60,119" fill="none" stroke="{PAP}" stroke-width="1.4" stroke-linecap="round"/>
'''

# H02 gattara: headscarf with polka dots, squint, big nose, pursed mouth
def hd02(face=True):
    feats = f'''
<path d="M36,86 C40,83 48,83 52,86 M68,86 C72,83 80,83 84,86" fill="none" stroke="{INK}" stroke-width="2.8" stroke-linecap="round"/>
<path d="M34,90 L30,88 M34,93 L30,94 M86,90 L90,88 M86,93 L90,94" stroke="{INK}" stroke-width="1.2" stroke-linecap="round"/>
<path d="M38,94 C42,97 48,97 52,94 M68,94 C72,97 78,97 82,94" fill="none" stroke="{INK}" stroke-width="1" opacity=".7"/>
<path d="M54,88 C50,100 48,108 52,114 C56,120 66,120 70,114 C73,108 70,100 66,88" fill="{PAP}" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M54,114 C56,112 58,112 59,114 M63,114 C64,112 66,112 68,114" fill="none" stroke="{INK}" stroke-width="1.3"/>
<path d="M50,128 C54,125 66,125 70,128 C66,131 54,131 50,128 Z" fill="{INK}"/>
<path d="M48,124 L46,121 M53,123 L52,120 M67,123 L68,120 M72,124 L74,121" stroke="{INK}" stroke-width="1" stroke-linecap="round"/>
<circle cx="80" cy="118" r="1.8" fill="{INK}"/><path d="M80,118 L83,114 M80,118 L84,117" stroke="{INK}" stroke-width=".8"/>''' if face else ""
    return f'''
<path d="M60,40 C88,40 100,62 99,90 C98,116 88,136 60,141 C32,136 22,116 21,90 C20,62 32,40 60,40 Z" fill="{PAP}" stroke="{INK}" stroke-width="3"/>
{face_shadow("M82,44 C96,58 99,76 99,90 C98,110 92,124 84,132 C90,110 92,72 82,44 Z")}
{feats}
<path d="M14,100 C6,50 28,14 60,14 C92,14 114,50 106,100 L96,100 C96,68 84,48 60,48 C36,48 24,68 24,100 Z" fill="{INK}"/>
<g fill="{PAP}"><circle cx="30" cy="40" r="2.6"/><circle cx="46" cy="26" r="2.6"/><circle cx="64" cy="22" r="2.6"/><circle cx="82" cy="28" r="2.6"/><circle cx="96" cy="44" r="2.6"/><circle cx="20" cy="66" r="2.6"/><circle cx="102" cy="68" r="2.6"/><circle cx="18" cy="90" r="2.4"/><circle cx="102" cy="90" r="2.4"/><circle cx="38" cy="38" r="1.4"/><circle cx="74" cy="36" r="1.4"/><circle cx="56" cy="34" r="1.4"/></g>
<path d="M50,138 L60,152 L70,138 Z" fill="{INK}"/><path d="M60,140 L54,150 M60,140 L66,150" stroke="{PAP}" stroke-width="1.2"/>
'''
HEADS["hd02"] = hd02(True)
HEADS["hd02nf"] = hd02(False)

# H03 pigeon (hybrid): small grey dome, iridescent neck band, headphones
HEADS["hd03"] = f'''
<path d="M30,104 C34,92 86,92 90,104 L102,150 L18,150 Z" fill="{DEEP}" stroke="{INK}" stroke-width="3"/>
<path d="M30,104 C34,92 86,92 90,104 L102,150 L18,150 Z" fill="url(#dotPaper)" opacity=".7"/>
<circle cx="60" cy="66" r="34" fill="{GRY}" stroke="{INK}" stroke-width="3"/>
{face_shadow("M78,38 C92,48 96,64 94,78 C92,90 86,98 78,102 C86,84 86,58 78,38 Z")}
<path d="M40,46 C46,38 56,34 64,34" fill="none" stroke="{HI}" stroke-width="2" stroke-linecap="round" opacity=".8"/>
<circle cx="42" cy="64" r="7.5" fill="{HI}" stroke="{INK}" stroke-width="2.4"/><circle cx="78" cy="64" r="7.5" fill="{HI}" stroke="{INK}" stroke-width="2.4"/>
<circle cx="43.5" cy="64.5" r="3" fill="{INK}"/><circle cx="76.5" cy="64.5" r="3" fill="{INK}"/>
<path d="M53,70 C55,63 65,63 67,70 Z" fill="{HI}" stroke="{INK}" stroke-width="1.8"/>
<path d="M53,71 L67,71 L60,90 Z" fill="{INK}"/>
<path d="M58,74 L60,84" stroke="{PAP}" stroke-width="1" opacity=".7"/>
<path d="M24,60 C24,20 96,20 96,60" fill="none" stroke="{INK}" stroke-width="6"/>
<rect x="14" y="52" width="16" height="28" rx="6" fill="{INK}"/><rect x="90" y="52" width="16" height="28" rx="6" fill="{INK}"/>
<path d="M18,58 V74 M102,58 V74" stroke="{PAP}" stroke-width="1.2"/>
'''

# H04 kid: big round head, cap backwards with strap, freckles, gap-tooth grin
HEADS["hd04"] = f'''
<path d="M16,84 C6,80 4,98 10,106 C14,112 20,112 22,106 Z M104,84 C114,80 116,98 110,106 C106,112 100,112 98,106 Z" fill="{PAP}" stroke="{INK}" stroke-width="2.6"/>
<path d="M60,34 C90,34 104,58 104,88 C104,118 88,140 60,142 C32,140 16,118 16,88 C16,58 30,34 60,34 Z" fill="{PAP}" stroke="{INK}" stroke-width="3"/>
{face_shadow("M84,40 C98,54 104,70 104,88 C104,108 96,124 86,134 C94,110 96,70 84,40 Z")}
<path d="M16,76 C14,40 36,20 60,20 C84,20 106,40 104,76 C90,64 76,60 60,60 C44,60 30,64 16,76 Z" fill="{INK}"/>
<path d="M48,64 C50,54 70,54 72,64 Z" fill="{PAP}" stroke="{INK}" stroke-width="1.8"/><path d="M52,62 H68" stroke="{INK}" stroke-width="1.2"/>
<path d="M30,40 C38,30 50,26 60,26" fill="none" stroke="{PAP}" stroke-width="1.4" opacity=".8"/>
<ellipse cx="44" cy="88" rx="8.5" ry="9" fill="{HI}" stroke="{INK}" stroke-width="2.2"/><ellipse cx="76" cy="88" rx="8.5" ry="9" fill="{HI}" stroke="{INK}" stroke-width="2.2"/>
<circle cx="46" cy="90" r="3.6" fill="{INK}"/><circle cx="78" cy="90" r="3.6" fill="{INK}"/><circle cx="47" cy="88.5" r="1.1" fill="{HI}"/><circle cx="79" cy="88.5" r="1.1" fill="{HI}"/>
<path d="M34,76 C38,72 46,72 52,75 M68,75 C74,72 82,72 86,76" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>
<path d="M56,98 C56,106 64,106 64,98" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>
<g fill="{INK}"><circle cx="32" cy="104" r="1.3"/><circle cx="36" cy="108" r="1.3"/><circle cx="29" cy="109" r="1.1"/><circle cx="88" cy="104" r="1.3"/><circle cx="84" cy="108" r="1.3"/><circle cx="91" cy="109" r="1.1"/></g>
<path d="M42,114 C50,128 70,128 78,114 Z" fill="{INK}"/><path d="M45,115 H58 M62,115 H75" stroke="{HI}" stroke-width="3.4"/>
'''

# H05 barista: bald with shine, side hair, big nose, bushy moustache
HEADS["hd05"] = f'''
<path d="M14,80 C4,76 2,94 8,102 C12,108 18,108 20,102 Z M106,80 C116,76 118,94 112,102 C108,108 102,108 100,102 Z" fill="{PAP}" stroke="{INK}" stroke-width="2.6"/>
<path d="M60,14 C94,14 106,44 106,80 C106,114 94,138 60,144 C26,138 14,114 14,80 C14,44 26,14 60,14 Z" fill="{PAP}" stroke="{INK}" stroke-width="3"/>
{face_shadow("M84,20 C100,34 106,58 106,80 C106,104 98,124 88,134 C96,106 98,56 84,20 Z")}
<path d="M30,30 C38,22 48,18 58,18 M36,40 C42,34 48,32 54,32" fill="none" stroke="{HI}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M14,70 C14,58 18,52 22,50 L24,76 Z M106,70 C106,58 102,52 98,50 L96,76 Z" fill="{INK}"/>
<path d="M30,66 C38,61 48,61 54,64 M66,64 C72,61 82,61 90,66" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>
<path d="M36,76 C40,73 48,73 52,76 C48,79 40,79 36,76 Z M68,76 C72,73 80,73 84,76 C80,79 72,79 68,76 Z" fill="{HI}" stroke="{INK}" stroke-width="1.6"/>
<circle cx="45" cy="76.5" r="1.9" fill="{INK}"/><circle cx="76" cy="76.5" r="1.9" fill="{INK}"/>
<path d="M54,74 C48,90 44,100 48,106 C52,112 68,112 72,106 C76,100 72,90 66,74" fill="{PAP}" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M30,112 C36,104 48,104 60,110 C72,104 84,104 90,112 C86,122 74,122 60,116 C46,122 34,122 30,112 Z" fill="{INK}"/>
<path d="M38,112 L42,116 M46,110 L49,115 M54,110 L56,114 M66,110 L64,114 M74,110 L71,115 M82,112 L78,116" stroke="{PAP}" stroke-width="1.2" stroke-linecap="round"/>
<path d="M50,128 C56,126 64,126 70,128" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>
<path d="M40,138 C50,146 70,146 80,138" fill="none" stroke="{INK}" stroke-width="1.6" stroke-linecap="round"/>
'''

# H06 gull (hybrid): white head, angry brows, big hooked beak, cycle helmet
HEADS["hd06"] = f'''
<path d="M60,26 C86,26 102,46 102,72 C102,98 90,118 76,126 L44,126 C30,118 18,98 18,72 C18,46 34,26 60,26 Z" fill="{HI}" stroke="{INK}" stroke-width="3"/>
<path d="M44,126 L76,126 L80,150 L40,150 Z" fill="{HI}" stroke="{INK}" stroke-width="3"/>
{face_shadow("M84,32 C98,46 102,62 102,74 C102,94 94,110 84,120 C92,96 94,62 84,32 Z")}
<path d="M30,62 L52,72 L50,66 Z M90,62 L68,72 L70,66 Z" fill="{INK}" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>
<circle cx="44" cy="76" r="6" fill="{PAP}" stroke="{INK}" stroke-width="2.2"/><circle cx="76" cy="76" r="6" fill="{PAP}" stroke="{INK}" stroke-width="2.2"/>
<circle cx="45.5" cy="77" r="2.2" fill="{INK}"/><circle cx="74.5" cy="77" r="2.2" fill="{INK}"/>
<path d="M50,86 C54,82 66,82 70,86 L72,110 C72,118 66,124 62,126 L60,132 L58,126 C54,124 48,118 48,110 Z" fill="{PAP}" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M58,126 C56,132 60,138 64,134" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M49,104 L71,104" stroke="{INK}" stroke-width="1.6"/><circle cx="65" cy="112" r="3" fill="{INK}"/>
<path d="M54,92 C56,90 58,90 59,92 M61,92 C62,90 64,90 66,92" fill="none" stroke="{INK}" stroke-width="1.2"/>
<path d="M16,54 C14,22 40,6 60,6 C82,6 106,22 104,54 C90,44 76,40 60,40 C44,40 30,44 16,54 Z" fill="{INK}"/>
<path d="M34,20 L40,34 M50,12 L52,30 M68,12 L66,30 M84,18 L78,34" stroke="{PAP}" stroke-width="3" stroke-linecap="round"/>
<path d="M22,56 C22,72 26,80 32,84 M98,56 C98,72 94,80 88,84" fill="none" stroke="{INK}" stroke-width="2.6"/>
'''

# H07 old man on the bench: bald with sparse hair, sunken cheeks, toothless grin
HEADS["hd07"] = f'''
<path d="M16,80 C2,74 0,98 8,106 C12,110 18,110 20,104 Z M104,80 C118,74 120,98 112,106 C108,110 102,110 100,104 Z" fill="{PAP}" stroke="{INK}" stroke-width="2.6"/>
<path d="M60,18 C90,18 100,44 100,76 C100,110 88,138 60,144 C32,138 20,110 20,76 C20,44 30,18 60,18 Z" fill="{PAP}" stroke="{INK}" stroke-width="3"/>
{face_shadow("M80,22 C96,38 100,58 100,78 C100,104 92,124 82,136 C90,108 92,58 80,22 Z")}
<path d="M38,24 C46,30 52,22 58,28 C64,20 70,28 78,24" fill="none" stroke="{INK}" stroke-width="1.4" stroke-linecap="round"/>
<path d="M26,42 C26,34 30,30 34,28 M94,42 C94,34 90,30 86,28" fill="none" stroke="{INK}" stroke-width="1.2"/>
<path d="M32,40 C40,38 50,40 56,44" fill="none" stroke="{INK}" stroke-width="1" opacity=".6"/>
<path d="M32,66 C38,62 48,62 54,66 M66,66 C72,62 82,62 88,66" fill="none" stroke="{PAP}" stroke-width="3.6" stroke-linecap="round"/>
<path d="M32,66 C38,62 48,62 54,66 M66,66 C72,62 82,62 88,66" fill="none" stroke="{INK}" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="1.5 2"/>
<path d="M36,76 C40,72 48,72 52,76 C48,78 40,78 36,76 Z M68,76 C72,72 80,72 84,76 C80,78 72,78 68,76 Z" fill="{HI}" stroke="{INK}" stroke-width="1.6"/>
<circle cx="44" cy="76" r="1.8" fill="{INK}"/><circle cx="76" cy="76" r="1.8" fill="{INK}"/>
<path d="M34,82 C40,86 48,86 52,82 M68,82 C72,86 80,86 86,82" fill="none" stroke="{INK}" stroke-width="1.2"/>
<path d="M56,74 C54,90 52,98 54,104 C58,108 64,108 68,104 C70,98 66,90 64,74" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M30,96 C32,110 36,118 42,124 M90,96 C88,110 84,118 78,124" fill="none" stroke="{INK}" stroke-width="1.4"/>
<path d="M44,118 C52,128 68,128 76,118 C68,122 52,122 44,118 Z" fill="{INK}"/>
<rect x="56" y="119" width="5" height="4" fill="{HI}"/>
<g fill="{INK}" opacity=".55"><circle cx="40" cy="132" r=".9"/><circle cx="46" cy="136" r=".9"/><circle cx="54" cy="138" r=".9"/><circle cx="66" cy="138" r=".9"/><circle cx="74" cy="136" r=".9"/><circle cx="80" cy="132" r=".9"/></g>
'''

# H08a girl: slick high bun, hoops, winged liner, gum bubble
HEADS["hd08a"] = f'''
<path d="M60,30 C86,30 98,52 98,80 C98,110 86,132 60,138 C34,132 22,110 22,80 C22,52 34,30 60,30 Z" fill="{PAP}" stroke="{INK}" stroke-width="3"/>
{face_shadow("M80,34 C94,48 98,64 98,80 C98,98 92,112 84,122 C90,98 92,64 80,34 Z")}
<path d="M22,70 C20,40 38,26 60,26 C82,26 100,40 98,70 C92,52 78,44 60,44 C42,44 28,52 22,70 Z" fill="{INK}"/>
<ellipse cx="60" cy="16" rx="18" ry="14" fill="{INK}"/><path d="M48,12 C54,6 66,6 72,12" fill="none" stroke="{PAP}" stroke-width="1.4"/>
<path d="M30,52 C36,44 46,40 56,40 M64,40 C74,40 84,44 90,52" fill="none" stroke="{PAP}" stroke-width="1.2" opacity=".8"/>
<path d="M26,66 C24,70 26,74 24,78 M94,66 C96,70 94,74 96,78" fill="none" stroke="{INK}" stroke-width="1.4"/>
<path d="M34,68 C40,64 46,63 54,66 M66,66 C74,63 80,64 86,68" fill="none" stroke="{INK}" stroke-width="1.6" stroke-linecap="round"/>
<path d="M36,80 C40,75 50,75 54,80 C50,84 40,84 36,80 Z M66,80 C70,75 80,75 84,80 C80,84 70,84 66,80 Z" fill="{HI}" stroke="{INK}" stroke-width="1.6"/>
<circle cx="46" cy="80" r="2.4" fill="{INK}"/><circle cx="76" cy="80" r="2.4" fill="{INK}"/>
<path d="M34,79 C40,74 50,74 55,78 L59,74 M65,78 C70,74 80,74 86,79 L90,75" fill="none" stroke="{INK}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M58,84 C56,94 56,100 58,104 C60,106 64,106 64,102" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>
<path d="M48,116 C54,112 66,112 72,116 C66,122 54,122 48,116 Z" fill="{INK}"/><path d="M53,115 C57,114 62,114 66,115" stroke="{HI}" stroke-width="1.2"/>
<circle cx="80" cy="118" r="11" fill="{HI}" stroke="{INK}" stroke-width="2"/><path d="M75,113 C77,111 80,111 82,112" fill="none" stroke="{INK}" stroke-width="1.2"/>
<circle cx="20" cy="102" r="9" fill="none" stroke="{INK}" stroke-width="4"/><circle cx="20" cy="102" r="9" fill="none" stroke="{PAP}" stroke-width="1.6"/>
<circle cx="100" cy="102" r="9" fill="none" stroke="{INK}" stroke-width="4"/><circle cx="100" cy="102" r="9" fill="none" stroke="{PAP}" stroke-width="1.6"/>
'''

# H08b cat girl (hybrid): black cat head, pierced ears, slit pupils, reverse-line whiskers
HEADS["hd08b"] = f'''
<path d="M24,60 L14,14 L48,40 Z M96,60 L106,14 L72,40 Z" fill="{INK}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M26,50 L20,24 L40,40 Z M94,50 L100,24 L80,40 Z" fill="{PAP}"/>
<circle cx="102" cy="30" r="3" fill="none" stroke="{PAP}" stroke-width="1.6"/><circle cx="104" cy="38" r="3" fill="none" stroke="{PAP}" stroke-width="1.6"/>
<path d="M60,34 C90,34 104,58 102,86 C100,114 84,134 60,138 C36,134 20,114 18,86 C16,58 30,34 60,34 Z" fill="{INK}"/>
<path d="M22,78 C20,60 30,46 42,40" fill="none" stroke="{PAP}" stroke-width="1.4" opacity=".7"/>
<path d="M28,62 C28,56 30,52 34,50" fill="url(#dotPaper)"/>
<path d="M34,82 C40,72 50,72 56,80 C50,88 40,88 34,82 Z M64,80 C70,72 80,72 86,82 C80,88 70,88 64,80 Z" fill="{PAP}"/>
<path d="M46,73 C44,78 44,84 46,88 M74,73 C76,78 76,84 74,88" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>
<path d="M32,80 C38,70 50,70 58,79 M62,79 C70,70 82,70 88,80" fill="none" stroke="{PAP}" stroke-width="1.6" stroke-linecap="round"/>
<path d="M54,98 L66,98 L60,106 Z" fill="{PAP}"/>
<path d="M60,106 C58,112 54,114 50,112 M60,106 C62,112 66,114 70,112" fill="none" stroke="{PAP}" stroke-width="1.6" stroke-linecap="round"/>
<path d="M44,104 L14,98 M44,108 L12,110 M76,104 L106,98 M76,108 L108,110" stroke="{PAP}" stroke-width="1.3" stroke-linecap="round"/>
<path d="M52,120 C56,124 64,124 68,120" fill="none" stroke="{PAP}" stroke-width="1.4" stroke-linecap="round"/>
'''

# H09 boar (hybrid): bristly dark wedge, tusks, flat disc snout, tiny eyes
HEADS["hd09"] = f'''
<path d="M22,52 L8,20 L40,38 Z M98,52 L112,20 L80,38 Z" fill="{INK}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M60,22 C92,22 108,46 108,74 C108,98 98,114 86,122 L80,140 L40,140 L34,122 C22,114 12,98 12,74 C12,46 28,22 60,22 Z" fill="{INK}"/>
<path d="M60,22 C92,22 108,46 108,74 C108,98 98,114 86,122 L80,140 L40,140 L34,122 C22,114 12,98 12,74 C12,46 28,22 60,22 Z" fill="url(#crossShade)" opacity=".0"/>
<path d="M30,30 L34,40 M42,24 L44,36 M56,20 L56,34 M70,22 L68,34 M84,26 L80,38 M24,46 L30,52 M96,46 L90,52 M20,64 L28,66 M100,64 L92,66" stroke="{PAP}" stroke-width="1.6" stroke-linecap="round"/>
<path d="M28,62 C34,56 44,56 50,60 M70,60 C76,56 86,56 92,62" fill="none" stroke="{PAP}" stroke-width="2.4" stroke-linecap="round"/>
<circle cx="40" cy="68" r="4.6" fill="{HI}"/><circle cx="80" cy="68" r="4.6" fill="{HI}"/><circle cx="41" cy="69" r="2.2" fill="{INK}"/><circle cx="79" cy="69" r="2.2" fill="{INK}"/>
<path d="M44,76 C40,92 40,104 44,112 L76,112 C80,104 80,92 76,76 Z" fill="{INK}" stroke="{PAP}" stroke-width="1.4"/>
<ellipse cx="60" cy="116" rx="22" ry="13" fill="{PAP}" stroke="{INK}" stroke-width="2.6"/>
<ellipse cx="52" cy="116" rx="4" ry="5.5" fill="{INK}"/><ellipse cx="68" cy="116" rx="4" ry="5.5" fill="{INK}"/>
<path d="M36,132 C30,124 28,114 32,104 C34,112 38,120 44,126 Z M84,132 C90,124 92,114 88,104 C86,112 82,120 76,126 Z" fill="{HI}" stroke="{INK}" stroke-width="2.2" stroke-linejoin="round"/>
<path d="M44,136 C52,142 68,142 76,136" fill="none" stroke="{PAP}" stroke-width="1.6"/>
<path d="M66,138 L80,130" stroke="{HI}" stroke-width="2" stroke-linecap="round"/>
'''

# H10 smoker: skin fade, thin moustache, stud, cigarette in mouth
HEADS["hd10"] = f'''
<path d="M16,80 C6,76 4,94 10,102 C14,108 20,106 22,100 Z M104,80 C114,76 116,94 110,102 C106,108 100,106 98,100 Z" fill="{PAP}" stroke="{INK}" stroke-width="2.6"/>
<circle cx="106" cy="96" r="2.2" fill="{HI}" stroke="{INK}" stroke-width="1.2"/>
<path d="M60,24 C88,24 100,50 99,80 C98,112 86,136 60,142 C34,136 22,112 21,80 C20,50 32,24 60,24 Z" fill="{PAP}" stroke="{INK}" stroke-width="3"/>
{face_shadow("M80,28 C94,42 99,60 99,80 C98,102 92,118 84,128 C92,104 92,62 80,28 Z")}
<path d="M22,62 C20,34 38,16 60,16 C82,16 100,34 98,62 C92,48 84,44 74,44 L60,40 L46,44 C36,44 28,48 22,62 Z" fill="{INK}"/>
<path d="M22,62 L22,76 M98,62 L98,76" stroke="{INK}" stroke-width="0"/>
<rect x="20" y="58" width="8" height="18" fill="url(#dotInkFine)"/><rect x="92" y="58" width="8" height="18" fill="url(#dotInkFine)"/>
<path d="M40,24 C48,20 56,20 62,22 M66,22 C74,22 82,26 86,30" fill="none" stroke="{PAP}" stroke-width="1.4" opacity=".8"/>
<path d="M34,70 C40,66 48,66 54,70 M66,70 C72,66 80,66 86,70" fill="none" stroke="{INK}" stroke-width="3.2" stroke-linecap="round"/>
<path d="M36,80 C40,77 48,77 52,80 C48,82 40,82 36,80 Z M68,80 C72,77 80,77 84,80 C80,82 72,82 68,80 Z" fill="{HI}" stroke="{INK}" stroke-width="1.6"/>
<circle cx="45" cy="80" r="1.8" fill="{INK}"/><circle cx="77" cy="80" r="1.8" fill="{INK}"/>
<path d="M34,78 C40,75 48,75 54,78 M66,78 C72,75 80,75 86,78" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M58,82 C56,94 54,102 58,106 C62,108 66,106 66,102" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>
<path d="M46,114 C52,111 68,111 74,114" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M48,120 C54,122 66,122 72,120" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>
<path d="M68,120 L96,128" stroke="{INK}" stroke-width="5.6" stroke-linecap="round"/><path d="M68,120 L94,127.4" stroke="{HI}" stroke-width="3.6" stroke-linecap="round"/>
<circle cx="96" cy="128" r="2.6" fill="{INK}"/>
'''

# H11 laundry woman: curlers, round cheeks, clothes-peg in the mouth
HEADS["hd11"] = f'''
<path d="M60,34 C88,34 100,56 100,84 C100,114 88,136 60,142 C32,136 20,114 20,84 C20,56 32,34 60,34 Z" fill="{PAP}" stroke="{INK}" stroke-width="3"/>
{face_shadow("M82,38 C96,52 100,68 100,84 C100,104 94,120 86,130 C92,104 94,66 82,38 Z")}
<path d="M18,74 C14,40 36,20 60,20 C84,20 106,40 102,74 C96,58 80,50 60,50 C40,50 24,58 18,74 Z" fill="{INK}"/>
<g fill="{HI}" stroke="{INK}" stroke-width="2"><rect x="22" y="30" width="20" height="13" rx="6"/><rect x="44" y="18" width="20" height="13" rx="6"/><rect x="66" y="20" width="20" height="13" rx="6"/><rect x="82" y="36" width="20" height="13" rx="6"/><rect x="14" y="50" width="20" height="13" rx="6"/><rect x="88" y="54" width="18" height="13" rx="6"/></g>
<path d="M28,33 V40 M34,33 V40 M50,21 V28 M56,21 V28 M72,23 V30 M78,23 V30 M88,39 V46 M94,39 V46" stroke="{INK}" stroke-width="1"/>
<path d="M32,72 C38,68 48,68 54,72 M66,72 C72,68 82,68 88,72" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>
<path d="M36,82 C40,78 48,78 52,82 C48,85 40,85 36,82 Z M68,82 C72,78 80,78 84,82 C80,85 72,85 68,82 Z" fill="{HI}" stroke="{INK}" stroke-width="1.6"/>
<circle cx="44" cy="82" r="2" fill="{INK}"/><circle cx="76" cy="82" r="2" fill="{INK}"/>
<path d="M58,86 C54,98 52,104 56,108 C60,110 66,108 66,104" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>
<path d="M30,100 C34,106 40,108 44,106 M90,100 C86,106 80,108 76,106" fill="none" stroke="{INK}" stroke-width="1.2"/>
<path d="M46,120 C52,116 68,116 74,120 C68,126 52,126 46,120 Z" fill="{INK}"/>
<path d="M60,118 L58,134 L64,134 L62,118 Z" fill="{HI}" stroke="{INK}" stroke-width="1.6"/><path d="M56,122 L66,122" stroke="{INK}" stroke-width="1.4"/>
'''

# H12 crow inspector (hybrid): black head, beady eye, heavy beak, peaked cap
HEADS["hd12"] = f'''
<path d="M60,34 C88,34 102,56 102,84 C102,110 90,130 70,138 L50,138 C30,130 18,110 18,84 C18,56 32,34 60,34 Z" fill="{INK}"/>
<path d="M30,56 C34,48 42,42 50,40 M26,74 C28,62 32,56 38,52 M84,46 C90,50 96,60 98,70" fill="none" stroke="{PAP}" stroke-width="1.4" opacity=".75"/>
<path d="M28,96 L36,100 M26,108 L36,110 M92,96 L84,100 M94,108 L84,110" stroke="{PAP}" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>
<circle cx="42" cy="80" r="7" fill="{HI}"/><circle cx="78" cy="80" r="7" fill="{HI}"/>
<circle cx="43.5" cy="81" r="3.6" fill="{INK}"/><circle cx="76.5" cy="81" r="3.6" fill="{INK}"/><circle cx="44.6" cy="79.6" r="1" fill="{HI}"/><circle cx="77.6" cy="79.6" r="1" fill="{HI}"/>
<path d="M30,70 L52,76 M90,70 L68,76" stroke="{PAP}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M48,90 C52,86 68,86 72,90 L62,128 C61,132 59,132 58,128 Z" fill="{INK}" stroke="{PAP}" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M60,92 L60,122" stroke="{PAP}" stroke-width="1.2"/><path d="M52,96 L56,96" stroke="{PAP}" stroke-width="1.4"/>
<path d="M20,52 L24,22 L96,22 L100,52 Z" fill="{INK}" stroke="{PAP}" stroke-width="1.4"/>
<path d="M14,52 L106,52 L92,64 L28,64 Z" fill="{INK}" stroke="{PAP}" stroke-width="1.4"/>
<path d="M22,46 H98" stroke="{PAP}" stroke-width="2.4"/>
<path d="M52,28 L68,28 L66,40 L60,44 L54,40 Z" fill="{HI}" stroke="{INK}" stroke-width="1.4"/>
'''

# H13 the Witness, with a turn parameter: 0 = facing front, negative = turned toward the viewer's left
def witness_head(turn=0.0):
    a = math.radians(turn); s, c = math.sin(a), math.cos(a)
    dx = 22 * s
    def X(x): return 60 + (x - 60) * (0.75 + 0.25 * c) + dx * (1 - abs(x - 60) / 120)
    near_r, far_r = 10.5, max(3.0, 10.5 * c ** 1.3)
    lx, rx = X(44), X(76)
    ear_r = f'<path d="M100,78 C112,74 114,94 108,102 C104,106 100,104 98,100 Z" fill="{PAP}" stroke="{INK}" stroke-width="2.6"/>' if turn > -45 else ""
    ear_l = f'<path d="M20,78 C8,74 6,94 12,102 C16,106 20,104 22,100 Z" fill="{PAP}" stroke="{INK}" stroke-width="2.6"/>' if turn > -10 else ""
    nose = f'<path d="M{F(X(60))},84 C{F(X(58) + 8*s)},100 {F(X(58) + 14*s)},112 {F(X(62) + 10*s)},120 C{F(X(64))},124 {F(X(68))},122 {F(X(68))},118" fill="none" stroke="{INK}" stroke-width="2.6" stroke-linecap="round"/>'
    return f'''
{ear_l}{ear_r}
<path d="M60,30 C84,30 98,52 98,82 C98,112 88,140 60,146 C32,140 22,112 22,82 C22,52 36,30 60,30 Z" fill="{PAP}" stroke="{INK}" stroke-width="3"/>
{face_shadow("M80,36 C94,50 98,66 98,84 C98,108 92,126 84,136 C90,110 92,70 80,36 Z")}
<path d="M{F(X(34))},104 C{F(X(36))},116 {F(X(40))},124 {F(X(46))},130 M{F(X(86))},104 C{F(X(84))},116 {F(X(80))},124 {F(X(74))},130" fill="none" stroke="{INK}" stroke-width="1.6"/>
{nose}
<path d="M{F(X(48))},132 C{F(X(54))},130 {F(X(66))},130 {F(X(72))},132" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>
<g fill="{HI}" opacity=".9"><circle cx="{F(X(42))}" cy="134" r="1"/><circle cx="{F(X(50))}" cy="139" r="1"/><circle cx="{F(X(60))}" cy="141" r="1"/><circle cx="{F(X(70))}" cy="139" r="1"/><circle cx="{F(X(78))}" cy="134" r="1"/></g>
<ellipse cx="{F(lx)}" cy="84" rx="{F(far_r if turn < 0 else near_r)}" ry="10.5" fill="{HI}" stroke="{INK}" stroke-width="3.2"/>
<ellipse cx="{F(rx)}" cy="84" rx="{F(near_r)}" ry="10.5" fill="{HI}" stroke="{INK}" stroke-width="3.2"/>
<path d="M{F(lx + (far_r if turn < 0 else near_r))},84 L{F(rx - near_r)},84" stroke="{INK}" stroke-width="2.6"/>
<path d="M{F(lx - 4)},80 C{F(lx - 2)},77 {F(lx + 1)},76 {F(lx + 3)},76 M{F(rx - 4)},80 C{F(rx - 2)},77 {F(rx + 1)},76 {F(rx + 3)},76" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
<path d="M18,64 C18,34 42,16 62,16 C86,16 104,30 106,52 L116,60 C104,66 90,66 60,64 C42,64 28,66 18,64 Z" fill="{INK}"/>
<path d="M{F(30 + dx*.6)},40 C{F(44 + dx*.6)},28 {F(70 + dx*.6)},24 {F(92 + dx*.6)},34" fill="none" stroke="{PAP}" stroke-width="1.4" opacity=".85"/>
<path d="M22,60 H108" stroke="{PAP}" stroke-width="1.2" opacity=".7"/>
'''
HEADS["hd13"] = witness_head(0)
for i, t in enumerate([-70, -54, -38, -24, -11, 0]):
    HEADS[f"wt2_{i+1}"] = witness_head(t)

# H14 the Memory: drawn in ink, printed through the burgundy plate filter; face dissolved into dots
def memory_head(pattern="dotBurg", feats=False):
    f = ""
    if feats:
        f = f'<g fill="{INK}"><circle cx="46" cy="88" r="2.6"/><circle cx="74" cy="88" r="2.6"/></g><path d="M50,114 C56,117 64,117 70,114" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>'
    return f'''
<path d="M16,84 C6,80 4,98 10,104 C14,108 20,108 22,102 Z M104,84 C114,80 116,98 110,104 C106,108 100,108 98,102 Z" fill="{HI}" stroke="{INK}" stroke-width="2.6"/>
<path d="M60,36 C88,36 100,58 99,86 C98,114 86,134 60,140 C34,134 22,114 21,86 C20,58 32,36 60,36 Z" fill="{HI}" stroke="{INK}" stroke-width="3"/>
{f}
<path d="M60,40 C86,40 96,60 95,86 C94,112 84,130 60,136 C36,130 26,112 25,86 C24,60 34,40 60,40 Z" fill="url(#{pattern})"/>
<path d="M18,70 C16,36 38,18 60,18 C82,18 104,36 102,70 Z" fill="{HI}" stroke="{INK}" stroke-width="3"/>
<path d="M14,70 L118,70 C118,80 100,84 84,82 L16,78 Z" fill="{HI}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M60,20 C56,36 56,52 58,70 M38,28 C34,42 34,56 36,70" fill="none" stroke="{INK}" stroke-width="1.6"/>
<circle cx="61" cy="19" r="3.4" fill="{INK}"/>
'''
HEADS["hd14"] = memory_head("dotBurg", feats=False)
HEADS["mh_1"] = memory_head("dotBurgS", feats=True)
HEADS["mh_2"] = memory_head("dotBurg", feats=True)
HEADS["mh_3"] = memory_head("dotBurgL", feats=False)

# ─────────────────────────── BODY PARTS ───────────────────────────
class C:
    def __init__(s, sid, w, cm, heads=5.8, cx=None):
        s.sid, s.w, s.H = sid, w, cm * U
        s.cx = w / 2 if cx is None else cx
        s.top = 640 - s.H; s.hu = s.H / heads
        s.L = []
    def add(s, x): s.L.append(x)
    def y(s, k): return s.top + k * s.hu
    # head symbol placed so that its chin sits at the given y
    def head(s, hid, scale=1.0, dx=0, chin=None, rot=0):
        hh = s.hu * 1.32 * scale * 1.38; hw = hh * 0.8
        cy = s.y(1.08) if chin is None else chin
        x, y = s.cx + dx - hw / 2, cy - hh * 0.93
        t = f' transform="rotate({rot} {F(s.cx+dx)} {F(cy)})"' if rot else ""
        s.add(f'<use href="#{hid}" x="{F(x)}" y="{F(y)}" width="{F(hw)}" height="{F(hh)}"{t}/>')
    def torso(s, top_k, hem_k, sw, hw, fill=INK, kind="hoodie", flare=0):
        cx, hu = s.cx, s.hu; t, b = s.y(top_k), s.y(hem_k)
        L, R = cx - sw * hu / 2, cx + sw * hu / 2
        bl, br = cx - hw * hu / 2 - flare, cx + hw * hu / 2 + flare
        d = (f"M{F(L+14)},{F(t)} C{F(L)},{F(t+2)} {F(L-4)},{F(t+14)} {F(L-3)},{F(t+30)} L{F(bl)},{F(b)} "
             f"C{F(bl+30)},{F(b+8)} {F(br-30)},{F(b+8)} {F(br)},{F(b)} L{F(R+3)},{F(t+30)} C{F(R+4)},{F(t+14)} {F(R)},{F(t+2)} {F(R-14)},{F(t)} Z")
        s.add(f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
        if fill not in (INK, DEEP, HI, PAP):
            s.add(f'<path d="M{F(cx+sw*hu*.18)},{F(t+4)} L{F(R-6)},{F(t+2)} C{F(R+4)},{F(t+14)} {F(R+3)},{F(t+30)} {F(R+3)},{F(t+30)} L{F(br)},{F(b)} C{F(br-12)},{F(b+4)} {F(br-24)},{F(b+6)} {F(cx+hw*hu*.2)},{F(b+6)} Z" fill="url(#dotInk)" opacity=".8"/>')
        fc = fold_col(fill)
        lines = []
        if kind == "hoodie":
            lines += [f"M{F(cx-hw*hu*.32)},{F(b-hu*.55)} L{F(cx+hw*hu*.32)},{F(b-hu*.55)} L{F(cx+hw*hu*.38)},{F(b-hu*.12)} L{F(cx-hw*hu*.38)},{F(b-hu*.12)} Z",
                      f"M{F(bl+4)},{F(b-8)} C{F(bl+40)},{F(b-2)} {F(br-40)},{F(b-2)} {F(br-4)},{F(b-8)}"]
        elif kind == "jacket":
            lines += [f"M{F(cx)},{F(t+6)} L{F(cx)},{F(b+4)}", f"M{F(cx+sw*hu*.12)},{F(t+hu*.9)} L{F(cx+sw*hu*.34)},{F(t+hu*.86)}",
                      f"M{F(bl+4)},{F(b-8)} C{F(bl+40)},{F(b-2)} {F(br-40)},{F(b-2)} {F(br-4)},{F(b-8)}"]
        elif kind == "puffer":
            for k in (0.55, 1.05, 1.55):
                yy = t + k * hu
                if yy < b - 6: lines.append(f"M{F(L-2)},{F(yy)} C{F(L+30)},{F(yy+8)} {F(R-30)},{F(yy+8)} {F(R+2)},{F(yy)}")
            lines.append(f"M{F(cx)},{F(t+6)} L{F(cx)},{F(b+4)}")
        elif kind == "coat":
            lines += [f"M{F(cx-3)},{F(t+10)} L{F(cx-6)},{F(b+2)}"]
            for k in (0.6, 1.2, 1.8, 2.4):
                yy = t + k * hu
                if yy < b - 10: s.add(f'<circle cx="{F(cx+4)}" cy="{F(yy)}" r="3" fill="{fc}"/>')
        elif kind == "cardigan":
            lines += [f"M{F(cx)},{F(t+10)} L{F(cx)},{F(b+2)}", f"M{F(cx-hw*hu*.3)},{F(b-hu*.6)} L{F(cx-hw*hu*.06)},{F(b-hu*.6)}", f"M{F(cx+hw*hu*.06)},{F(b-hu*.6)} L{F(cx+hw*hu*.3)},{F(b-hu*.6)}"]
            for k in (0.6, 1.1, 1.6, 2.1):
                yy = t + k * hu
                if yy < b - 10: s.add(f'<circle cx="{F(cx+6)}" cy="{F(yy)}" r="2.6" fill="{fc}"/>')
        elif kind == "tank":
            lines += [f"M{F(cx-sw*hu*.22)},{F(t)} C{F(cx-sw*hu*.16)},{F(t+hu*.6)} {F(cx+sw*hu*.16)},{F(t+hu*.6)} {F(cx+sw*hu*.22)},{F(t)}"]
        for d in lines:
            s.add(f'<path d="{d}" fill="none" stroke="{fc}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>')
    def sleeve(s, pts, w, fill=INK, cuff=True):
        d = "M" + " L".join(f"{F(x)},{F(y)}" for x, y in pts)
        s.add(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{F(w+6)}" stroke-linecap="round" stroke-linejoin="round"/>')
        s.add(f'<path d="{d}" fill="none" stroke="{fill}" stroke-width="{F(w)}" stroke-linecap="round" stroke-linejoin="round"/>')
        fc = fold_col(fill)
        if len(pts) >= 3:
            (x0, y0), (x1, y1), (x2, y2) = pts[0], pts[1], pts[2]
            s.add(f'<path d="M{F(x1-w*.35)},{F(y1-3)} C{F(x1-w*.1)},{F(y1-7)} {F(x1+w*.1)},{F(y1-7)} {F(x1+w*.35)},{F(y1-3)}" fill="none" stroke="{fc}" stroke-width="1.7" stroke-linecap="round" opacity=".9"/>')
        if cuff:
            (xa, ya), (xb, yb) = pts[-2], pts[-1]
            ang = math.atan2(yb - ya, xb - xa); nx, ny = -math.sin(ang), math.cos(ang)
            cx_, cy_ = xb - math.cos(ang) * w * 0.35, yb - math.sin(ang) * w * 0.35
            s.add(f'<path d="M{F(cx_+nx*w*.48)},{F(cy_+ny*w*.48)} L{F(cx_-nx*w*.48)},{F(cy_-ny*w*.48)}" stroke="{fc}" stroke-width="1.6" opacity=".85"/>')
    def hand(s, x, y, ang=0, scale=1.0, mirror=False, kind="hang"):
        sc = s.hu / 100 * 0.95 * scale
        mx = -sc if mirror else sc
        if kind == "hang":
            s.add(f'<use href="#handA" transform="translate({F(x)} {F(y)}) rotate({F(ang)}) scale({F(mx)} {F(sc)}) translate(-40 -404)"/>')
        elif kind == "fist":
            s.add(f'<use href="#handFist" width="120" height="140" transform="translate({F(x)} {F(y)}) rotate({F(ang)}) scale({F(mx*.62)} {F(sc*.62)}) translate(-60 -36)"/>')
        elif kind == "open":
            s.add(f'<use href="#handOpen" width="120" height="140" transform="translate({F(x)} {F(y)}) rotate({F(ang)}) scale({F(mx*.62)} {F(sc*.62)}) translate(-60 -122)"/>')
    def pants(s, hip_k, wid, fill=INK, gap=0.08, ground=612, flare=1.0):
        cx, hu = s.cx, s.hu; hy = s.y(hip_k); crotch = hy + hu * 0.62
        hw = wid * hu / 2
        d = (f"M{F(cx-hw)},{F(hy)} L{F(cx+hw)},{F(hy)} C{F(cx+hw*1.05*flare)},{F(hy+60)} {F(cx+hw*1.08*flare)},{F(ground-60)} {F(cx+hw*1.06*flare)},{F(ground)} "
             f"C{F(cx+hw*.75)},{F(ground+8)} {F(cx+gap*hu+8)},{F(ground+8)} {F(cx+gap*hu)},{F(ground)} L{F(cx+gap*hu*.5)},{F(crotch)} L{F(cx-gap*hu*.5)},{F(crotch)} "
             f"L{F(cx-gap*hu)},{F(ground)} C{F(cx-gap*hu-8)},{F(ground+8)} {F(cx-hw*.75)},{F(ground+8)} {F(cx-hw*1.06*flare)},{F(ground)} C{F(cx-hw*1.08*flare)},{F(ground-60)} {F(cx-hw*1.05*flare)},{F(hy+60)} {F(cx-hw)},{F(hy)} Z")
        s.add(f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
        if fill not in (INK, DEEP, HI, PAP):
            s.add(f'<path d="M{F(cx+hw*.45)},{F(hy+4)} L{F(cx+hw)},{F(hy+4)} C{F(cx+hw*1.05*flare)},{F(hy+60)} {F(cx+hw*1.08*flare)},{F(ground-60)} {F(cx+hw*1.06*flare)},{F(ground)} L{F(cx+hw*.6)},{F(ground+4)} Z" fill="url(#dotInk)" opacity=".75"/>')
        fc = fold_col(fill)
        for sgn in (-1, 1):
            xk = cx + sgn * (gap * hu + hw * .5)
            for d in (f"M{F(xk-12)},{F(ground-40)} C{F(xk-4)},{F(ground-32)} {F(xk+6)},{F(ground-32)} {F(xk+14)},{F(ground-40)}",
                      f"M{F(xk-14)},{F(ground-18)} C{F(xk-4)},{F(ground-10)} {F(xk+6)},{F(ground-10)} {F(xk+16)},{F(ground-18)}",
                      f"M{F(xk-6)},{F(crotch+30)} C{F(xk-2)},{F(crotch+50)} {F(xk-4)},{F(min(crotch+90, ground-56))} {F(xk)},{F(min(crotch+120, ground-50))}"):
                s.add(f'<path d="{d}" fill="none" stroke="{fc}" stroke-width="1.7" stroke-linecap="round" opacity=".88"/>')
    def skirt(s, hip_k, hem_y, wid, fill):
        cx, hu = s.cx, s.hu; hy = s.y(hip_k); hw = wid * hu / 2
        s.add(f'<path d="M{F(cx-hw)},{F(hy)} L{F(cx+hw)},{F(hy)} L{F(cx+hw*1.3)},{F(hem_y)} C{F(cx+hw*.5)},{F(hem_y+8)} {F(cx-hw*.5)},{F(hem_y+8)} {F(cx-hw*1.3)},{F(hem_y)} Z" fill="{fill}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
    def legs_bare(s, hip_y, gap=10, wid=22, fill=PAP, ground=610):
        for sgn in (-1, 1):
            x0 = s.cx + sgn * (gap + wid / 2)
            s.add(f'<path d="M{F(x0-wid/2)},{F(hip_y)} L{F(x0+wid/2)},{F(hip_y)} L{F(x0+wid/2-3)},{F(ground)} L{F(x0-wid/2+3)},{F(ground)} Z" fill="{fill}" stroke="{INK}" stroke-width="3"/>')
    def shoes(s, kind="shoeA", spread=0.6, scale=1.0, ground=640):
        sc = s.hu / 100 * scale
        for sgn in (-1, 1):
            x = s.cx + sgn * spread * s.hu * 0.62
            ref = {"shoeA": (79, 640), "shoeB": (89, 640), "shoeC": (80, 640), "shoeAr2": (79, 640)}[kind]
            mx = sc if sgn < 0 else -sc
            s.add(f'<use href="#{kind}" transform="translate({F(x)} {F(ground)}) scale({F(mx)} {F(sc)}) translate({-ref[0]} {-ref[1]})"/>')
    def svg(s):
        return f'<symbol id="{s.sid}" viewBox="0 0 {F(s.w)} 660" overflow="visible">' + "".join(s.L) + "</symbol>"

def P(d, fill=INK, sw=3, extra=""):
    return f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"{extra}/>'

SYMS = []

def standard(c, top_k, hem_k, sw, hw, tfill, kind, sfill=None, pfill=INK, pwid=1.5, shoe="shoeA", arms="hang", flare=1.0):
    """shoes → trousers → arms behind → torso → arms → hands. Returns shoulder points."""
    sfill = sfill or tfill
    c.shoes(shoe)
    c.pants(hem_k - 0.15, pwid, fill=pfill, flare=flare)
    return sfill

# CP01 writer — grey hoodie, black cargo, backpack, spray can, bandana
c = C("cp01", 250, 176, heads=5.9)
c.add(P(f"M{F(c.cx-c.hu*1.05)},{F(c.y(1.2))} L{F(c.cx+c.hu*1.05)},{F(c.y(1.2))} L{F(c.cx+c.hu*.98)},{F(c.y(2.85))} L{F(c.cx-c.hu*.98)},{F(c.y(2.85))} Z", fill=BRN))
c.shoes("shoeB"); c.pants(2.95, 1.55, fill=INK)
c.torso(1.12, 3.1, 1.95, 1.7, fill=CON, kind="hoodie")
c.add(f'<path d="M{F(c.cx-c.hu*.56)},{F(c.y(1.14))} L{F(c.cx-c.hu*.62)},{F(c.y(2.7))} M{F(c.cx+c.hu*.56)},{F(c.y(1.14))} L{F(c.cx+c.hu*.62)},{F(c.y(2.7))}" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>')
sh = c.y(1.3); L0, R0 = c.cx - c.hu * .92, c.cx + c.hu * .92
c.sleeve([(L0, sh), (L0 - 10, sh + c.hu * 1.05), (L0 - 6, sh + c.hu * 1.95)], c.hu * .5, fill=CON)
c.hand(L0 - 6, sh + c.hu * 1.95)
c.sleeve([(R0, sh), (R0 + 14, sh + c.hu * .95), (R0 + 26, sh + c.hu * 1.55)], c.hu * .5, fill=CON)
can_x, can_y = R0 + 30, sh + c.hu * 1.6
c.add(P(f"M{F(can_x-9)},{F(can_y-34)} L{F(can_x+9)},{F(can_y-34)} L{F(can_x+9)},{F(can_y+26)} L{F(can_x-9)},{F(can_y+26)} Z", fill=CON, sw=2.6) +
      P(f"M{F(can_x-8)},{F(can_y-42)} C{F(can_x-8)},{F(can_y-50)} {F(can_x+8)},{F(can_y-50)} {F(can_x+8)},{F(can_y-42)} L{F(can_x+8)},{F(can_y-34)} L{F(can_x-8)},{F(can_y-34)} Z", fill=INK, sw=2) +
      f'<path d="M{F(can_x-5)},{F(can_y-28)} V{F(can_y+20)}" stroke="{HI}" stroke-width="2" opacity=".8"/>')
c.hand(can_x, can_y - 18, ang=0, mirror=True, kind="fist")
c.head("hd01")
SYMS.append(c.svg())

# CP02 the gattara — headscarf, long brown coat, trolley with cat food and a tiny cat
def gattara(sid, hid):
    c = C(sid, 260, 152, heads=4.9, cx=96)
    c.legs_bare(c.y(3.9), gap=8, wid=20, fill=GRY, ground=620)
    c.shoes("shoeC", spread=.5, scale=.9)
    c.torso(1.05, 4.0, 1.95, 2.3, fill=BRN, kind="coat", flare=8)
    sh = c.y(1.25); L0, R0 = c.cx - c.hu * .95, c.cx + c.hu * .95
    c.sleeve([(L0, sh), (L0 - 10, sh + c.hu * .95), (L0 - 8, sh + c.hu * 1.75)], c.hu * .52, fill=BRN)
    c.hand(L0 - 8, sh + c.hu * 1.75)
    tx = R0 + 46
    c.sleeve([(R0, sh), (R0 + 16, sh + c.hu * .9), (tx - 6, sh + c.hu * 1.3)], c.hu * .52, fill=BRN)
    cart_top = sh + c.hu * 1.25
    c.add(P(f"M{F(tx-14)},{F(cart_top)} L{F(tx+44)},{F(cart_top+4)}", fill="none", sw=5) + P(f"M{F(tx+40)},{F(cart_top)} L{F(tx+40)},606", fill="none", sw=4))
    c.add(P(f"M{F(tx-8)},{F(cart_top+60)} L{F(tx+50)},{F(cart_top+60)} L{F(tx+46)},604 L{F(tx-4)},604 Z", fill=DEEP))
    c.add(f'<path d="M{F(tx-4)},{F(cart_top+80)} L{F(tx+46)},{F(cart_top+80)} M{F(tx-2)},{F(cart_top+110)} L{F(tx+44)},{F(cart_top+110)}" stroke="{PAP}" stroke-width="1.6"/>')
    for i, (ox, oy) in enumerate([(2, 46), (20, 40), (36, 46)]):
        c.add(P(f"M{F(tx+ox)},{F(cart_top+oy)} L{F(tx+ox+14)},{F(cart_top+oy)} L{F(tx+ox+14)},{F(cart_top+oy+16)} L{F(tx+ox)},{F(cart_top+oy+16)} Z", fill=HI, sw=2))
    cy0 = cart_top + 26
    c.add(P(f"M{F(tx+4)},{F(cy0+18)} C{F(tx+4)},{F(cy0)} {F(tx+28)},{F(cy0)} {F(tx+28)},{F(cy0+18)} Z", fill=INK, sw=2) + P(f"M{F(tx+6)},{F(cy0+4)} L{F(tx+8)},{F(cy0-8)} L{F(tx+14)},{F(cy0+2)} Z M{F(tx+26)},{F(cy0+4)} L{F(tx+24)},{F(cy0-8)} L{F(tx+18)},{F(cy0+2)} Z", fill=INK, sw=2) +
          f'<circle cx="{F(tx+12)}" cy="{F(cy0+10)}" r="2.4" fill="{HI}"/><circle cx="{F(tx+20)}" cy="{F(cy0+10)}" r="2.4" fill="{HI}"/>')
    c.add(f'<circle cx="{F(tx+2)}" cy="624" r="13" fill="{INK}"/><circle cx="{F(tx+2)}" cy="624" r="5" fill="{PAP}"/><circle cx="{F(tx+44)}" cy="624" r="13" fill="{INK}"/><circle cx="{F(tx+44)}" cy="624" r="5" fill="{PAP}"/>')
    c.hand(tx - 6, cart_top - 4, ang=-70, mirror=True, kind="fist")
    c.head(hid, scale=1.0)
    return c.svg()
SYMS.append(gattara("cp02", "hd02")); SYMS.append(gattara("cp02nf", "hd02nf"))

# CP03 pigeon commuter — puffed cement puffer chest, skinny legs, huge sneakers, headphones, bag
c = C("cp03", 250, 178, heads=5.6)
c.shoes("shoeA", spread=.5, scale=1.05)
c.legs_bare(c.y(3.1), gap=10, wid=26, fill=INK, ground=612)
c.add(f'<path d="M{F(c.cx-22)},{F(c.y(3.6))} L{F(c.cx-22)},600 M{F(c.cx+22)},{F(c.y(3.6))} L{F(c.cx+22)},600" stroke="{PAP}" stroke-width="1.4" opacity=".8"/>')
c.torso(1.0, 3.2, 2.25, 1.6, fill=CEM, kind="puffer", flare=-6)
sh = c.y(1.2); L0, R0 = c.cx - c.hu * 1.05, c.cx + c.hu * 1.05
c.sleeve([(L0, sh), (L0 - 12, sh + c.hu * 1.0), (L0 - 8, sh + c.hu * 1.85)], c.hu * .55, fill=CEM)
c.hand(L0 - 8, sh + c.hu * 1.85)
c.sleeve([(R0, sh), (R0 + 12, sh + c.hu * 1.0), (R0 + 8, sh + c.hu * 1.85)], c.hu * .55, fill=CEM)
c.hand(R0 + 8, sh + c.hu * 1.85, mirror=True)
c.add(f'<path d="M{F(c.cx-c.hu*.8)},{F(c.y(1.05))} L{F(c.cx+c.hu*.7)},{F(c.y(2.9))}" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>')
c.add(P(f"M{F(c.cx+c.hu*.45)},{F(c.y(2.7))} L{F(c.cx+c.hu*1.1)},{F(c.y(2.7))} L{F(c.cx+c.hu*1.1)},{F(c.y(3.3))} L{F(c.cx+c.hu*.45)},{F(c.y(3.3))} Z", fill=INK) +
      f'<path d="M{F(c.cx+c.hu*.5)},{F(c.y(2.86))} H{F(c.cx+c.hu*1.05)}" stroke="{PAP}" stroke-width="1.4"/>')
c.head("hd03", scale=.95)
SYMS.append(c.svg())

# CP04 kid on a scooter — kid proportions (4.2 heads), oversized tee, scooter
c = C("cp04", 250, 130, heads=4.2, cx=100)
deck = 622
c.add(P(f"M{F(c.cx-60)},{deck} L{F(c.cx+70)},{deck} L{F(c.cx+70)},{deck+8} L{F(c.cx-60)},{deck+8} Z", fill=INK, sw=2) +
      f'<circle cx="{F(c.cx-54)}" cy="632" r="8" fill="{INK}"/><circle cx="{F(c.cx+64)}" cy="632" r="8" fill="{INK}"/><circle cx="{F(c.cx-54)}" cy="632" r="3" fill="{PAP}"/><circle cx="{F(c.cx+64)}" cy="632" r="3" fill="{PAP}"/>')
c.add(f'<path d="M{F(c.cx+66)},{deck} L{F(c.cx+92)},{F(c.y(2.1))}" stroke="{INK}" stroke-width="7" stroke-linecap="round"/><path d="M{F(c.cx+76)},{F(c.y(2.1))} L{F(c.cx+108)},{F(c.y(2.1))}" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>')
c.shoes("shoeB", spread=.55, scale=.95, ground=deck)
c.pants(2.75, 1.45, fill=CEM, ground=deck - 20)
c.torso(1.0, 2.95, 1.8, 1.9, fill=HI, kind="tank", flare=4)
sh = c.y(1.2); L0, R0 = c.cx - c.hu * .85, c.cx + c.hu * .85
c.sleeve([(L0, sh), (L0 - 10, sh + c.hu * .8), (L0 - 4, sh + c.hu * 1.5)], c.hu * .38, fill=PAP, cuff=False)
c.hand(L0 - 4, sh + c.hu * 1.5, scale=.9)
c.sleeve([(R0, sh), (R0 + 14, sh + c.hu * .7), (c.cx + 92, c.y(2.12))], c.hu * .38, fill=PAP, cuff=False)
c.hand(c.cx + 94, c.y(2.06), ang=-90, mirror=True, kind="fist", scale=.9)
c.add(f'<path d="M{F(c.cx-c.hu*.5)},{F(c.y(1.6))} L{F(c.cx+c.hu*.3)},{F(c.y(1.6))}" stroke="{INK}" stroke-width="1.6" opacity=".6"/>')
c.head("hd04", scale=1.15)
SYMS.append(c.svg())

# CP05 café owner — bald, moustache, apron, both arms up pulling the shutter with a hook pole
c = C("cp05", 240, 174, heads=5.7)
c.shoes("shoeA"); c.pants(3.0, 1.6, fill=INK)
c.torso(1.1, 3.2, 2.15, 1.9, fill=CON, kind="tank")
c.add(P(f"M{F(c.cx-c.hu*.62)},{F(c.y(1.75))} L{F(c.cx+c.hu*.62)},{F(c.y(1.75))} L{F(c.cx+c.hu*.72)},{F(c.y(4.1))} L{F(c.cx-c.hu*.72)},{F(c.y(4.1))} Z", fill=HI) +
      f'<path d="M{F(c.cx-c.hu*.62)},{F(c.y(1.75))} L{F(c.cx-c.hu*.86)},{F(c.y(1.25))} M{F(c.cx+c.hu*.62)},{F(c.y(1.75))} L{F(c.cx+c.hu*.86)},{F(c.y(1.25))}" stroke="{INK}" stroke-width="2.4"/>' +
      f'<path d="M{F(c.cx-c.hu*.4)},{F(c.y(2.6))} L{F(c.cx+c.hu*.4)},{F(c.y(2.6))} L{F(c.cx+c.hu*.4)},{F(c.y(3.05))} L{F(c.cx-c.hu*.4)},{F(c.y(3.05))} Z" fill="none" stroke="{INK}" stroke-width="1.8"/>')
sh = c.y(1.3); L0, R0 = c.cx - c.hu * 1.0, c.cx + c.hu * 1.0
gx, gy = R0 + 26, c.y(0.1)
c.sleeve([(L0, sh), (L0 - 10, sh + c.hu * 1.0), (L0 - 6, sh + c.hu * 1.85)], c.hu * .42, fill=PAP, cuff=False)
c.add(f'<g stroke="{INK}" stroke-width="1" stroke-linecap="round"><path d="M{F(L0-12)},{F(sh+30)} l4,-6 M{F(L0-14)},{F(sh+50)} l4,-6 M{F(L0-12)},{F(sh+120)} l4,-6"/></g>')
c.hand(L0 - 6, sh + c.hu * 1.85)
c.add(f'<circle cx="{F(L0-6)}" cy="{F(sh+c.hu*2.75)}" r="9" fill="none" stroke="{INK}" stroke-width="3"/><path d="M{F(L0-10)},{F(sh+c.hu*2.85)} l-4,16 M{F(L0-2)},{F(sh+c.hu*2.85)} l3,18" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>')
c.sleeve([(R0, sh), (R0 + 20, sh - c.hu * .55), (gx, gy + 30)], c.hu * .42, fill=PAP, cuff=False)
c.add(f'<g stroke="{INK}" stroke-width="1" stroke-linecap="round"><path d="M{F(R0+10)},{F(sh-30)} l-4,-6 M{F(R0+18)},{F(sh-60)} l-4,-6"/></g>')
c.add(f'<path d="M{F(gx)},{F(gy+120)} L{F(gx)},-40" stroke="{INK}" stroke-width="5" stroke-linecap="round"/><path d="M{F(gx)},-38 C{F(gx+12)},-42 {F(gx+14)},-28 {F(gx+6)},-26" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>')
c.hand(gx, gy + 24, ang=180, mirror=True, kind="fist")
c.head("hd05", scale=1.02)
SYMS.append(c.svg())

# CP06 gull rider — black rain jacket, cube thermal backpack, grey wings-colour trousers
c = C("cp06", 250, 180, heads=5.7)
c.add(P(f"M{F(c.cx-c.hu*1.25)},{F(c.y(0.55))} L{F(c.cx+c.hu*1.25)},{F(c.y(0.55))} L{F(c.cx+c.hu*1.25)},{F(c.y(2.75))} L{F(c.cx-c.hu*1.25)},{F(c.y(2.75))} Z", fill=CON) +
      f'<path d="M{F(c.cx-c.hu*1.25)},{F(c.y(0.95))} H{F(c.cx+c.hu*1.25)}" stroke="{INK}" stroke-width="1.8"/><path d="M{F(c.cx+c.hu*.6)},{F(c.y(.55))} L{F(c.cx+c.hu*1.25)},{F(c.y(.55))} L{F(c.cx+c.hu*1.25)},{F(c.y(2.75))} L{F(c.cx+c.hu*.6)},{F(c.y(2.75))} Z" fill="url(#dotInk)" opacity=".8"/>')
c.shoes("shoeA"); c.pants(2.95, 1.5, fill=CON)
c.torso(1.05, 3.1, 2.0, 1.7, fill=INK, kind="jacket")
c.add(f'<path d="M{F(c.cx-c.hu*.7)},{F(c.y(1.1))} L{F(c.cx-c.hu*.74)},{F(c.y(2.7))} M{F(c.cx+c.hu*.7)},{F(c.y(1.1))} L{F(c.cx+c.hu*.74)},{F(c.y(2.7))}" stroke="{CON}" stroke-width="6" stroke-linecap="round"/>')
sh = c.y(1.25); L0, R0 = c.cx - c.hu * .95, c.cx + c.hu * .95
c.sleeve([(L0, sh), (L0 - 10, sh + c.hu * 1.0), (L0 - 6, sh + c.hu * 1.9)], c.hu * .5, fill=INK)
c.hand(L0 - 6, sh + c.hu * 1.9)
c.sleeve([(R0, sh), (R0 + 10, sh + c.hu * 1.0), (R0 + 6, sh + c.hu * 1.9)], c.hu * .5, fill=INK)
c.hand(R0 + 6, sh + c.hu * 1.9, mirror=True)
c.head("hd06", scale=1.0)
SYMS.append(c.svg())

# CP07 old man on the bench (human) — thick sweater, newspaper, cane
c = C("cp07", 240, 170, heads=5.7, cx=120)
seat = 500
c.top = seat - c.hu * 2.75
c.add(P(f"M8,{seat-70} L232,{seat-70} L232,{seat-54} L8,{seat-54} Z", fill=BRN) + P(f"M8,{seat} L232,{seat} L232,{seat+16} L8,{seat+16} Z", fill=BRN) +
      P(f"M20,{seat+16} L32,{seat+16} L32,640 L20,640 Z", fill=INK) + P(f"M208,{seat+16} L220,{seat+16} L220,640 L208,640 Z", fill=INK) +
      f'<path d="M8,{seat+6} H232 M8,{seat-62} H232" stroke="{INK}" stroke-width="1" opacity=".5"/>')
for sgn in (-1, 1):
    x0 = c.cx + sgn * c.hu * .42
    c.add(P(f"M{F(x0-c.hu*.38)},{seat-14} L{F(x0+c.hu*.38)},{seat-14} C{F(x0+c.hu*.42)},{seat+6} {F(x0+c.hu*.4)},{seat+22} {F(x0+c.hu*.34)},{seat+30} L{F(x0+c.hu*.3)},612 L{F(x0-c.hu*.3)},612 L{F(x0-c.hu*.34)},{seat+30} C{F(x0-c.hu*.4)},{seat+22} {F(x0-c.hu*.42)},{seat+6} {F(x0-c.hu*.38)},{seat-14} Z", fill=INK))
    c.add(f'<path d="M{F(x0-c.hu*.3)},{seat+24} C{F(x0-10)},{seat+30} {F(x0+10)},{seat+30} {F(x0+c.hu*.3)},{seat+24}" fill="none" stroke="{PAP}" stroke-width="1.6"/>')
c.shoes("shoeA", spread=.68, scale=.9)
c.torso(1.0, 2.8, 2.0, 1.95, fill=CON, kind="cardigan")
c.add(f'<path d="M{F(c.cx-c.hu*.5)},{F(c.y(1.0))} C{F(c.cx-c.hu*.3)},{F(c.y(1.3))} {F(c.cx+c.hu*.3)},{F(c.y(1.3))} {F(c.cx+c.hu*.5)},{F(c.y(1.0))}" fill="none" stroke="{INK}" stroke-width="5"/>')
sh = c.y(1.2); L0, R0 = c.cx - c.hu * .95, c.cx + c.hu * .95
c.add(f'<path d="M{F(c.cx+c.hu*.15)},{F(seat-30)} L{F(c.cx+c.hu*.2)},636" stroke="{INK}" stroke-width="6" stroke-linecap="round"/><path d="M{F(c.cx+c.hu*.15)},{F(seat-30)} C{F(c.cx+c.hu*.15)},{F(seat-50)} {F(c.cx+c.hu*.5)},{F(seat-50)} {F(c.cx+c.hu*.5)},{F(seat-34)}" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>')
c.add(P(f"M{F(c.cx-c.hu*1.0)},{F(seat-84)} L{F(c.cx-c.hu*.05)},{F(seat-92)} L{F(c.cx-c.hu*.0)},{F(seat-28)} L{F(c.cx-c.hu*.95)},{F(seat-20)} Z", fill=HI, sw=2.4) +
      f'<path d="M{F(c.cx-c.hu*.86)},{F(seat-74)} L{F(c.cx-c.hu*.2)},{F(seat-80)} M{F(c.cx-c.hu*.86)},{F(seat-64)} L{F(c.cx-c.hu*.3)},{F(seat-69)} M{F(c.cx-c.hu*.86)},{F(seat-54)} L{F(c.cx-c.hu*.2)},{F(seat-59)} M{F(c.cx-c.hu*.86)},{F(seat-44)} L{F(c.cx-c.hu*.4)},{F(seat-48)}" stroke="{INK}" stroke-width="1.2"/>')
c.sleeve([(L0, sh), (L0 - 6, sh + c.hu * .8), (c.cx - c.hu * .85, seat - 46)], c.hu * .48, fill=CON)
c.hand(c.cx - c.hu * .82, seat - 56, ang=-30, kind="fist")
c.sleeve([(R0, sh), (R0 + 4, sh + c.hu * .8), (c.cx + c.hu * .5, seat - 40)], c.hu * .48, fill=CON)
c.hand(c.cx + c.hu * .46, seat - 46, ang=30, mirror=True, kind="fist")
c.head("hd07", scale=1.0)
SYMS.append(c.svg())

# CP08 two girls on a low wall — human (tracksuit, hoops) + cat girl (hybrid, black hoodie)
wall_y = 540
c = C("cp08", 300, 165, heads=5.6, cx=82)
c.add(P(f"M0,{wall_y} L300,{wall_y} L300,640 L0,640 Z", fill=CON) + f'<rect x="0" y="{wall_y}" width="300" height="100" fill="url(#dotInk)" opacity=".25"/>' +
      f'<path d="M0,{wall_y+14} H300 M0,{wall_y+46} H300 M0,{wall_y+78} H300 M50,{wall_y} V{wall_y+14} M150,{wall_y} V{wall_y+14} M250,{wall_y} V{wall_y+14} M100,{wall_y+14} V{wall_y+46} M200,{wall_y+14} V{wall_y+46} M50,{wall_y+46} V{wall_y+78} M150,{wall_y+46} V{wall_y+78} M250,{wall_y+46} V{wall_y+78}" stroke="{INK}" stroke-opacity=".45" stroke-width="1.4"/>')
def sitter(c, cx, hid, tfill, pfill, shoe, hscale=1.0, arms_fill=None):
    hu = c.hu; c.cx = cx; c.top = wall_y - hu * 2.7
    for sgn in (-1, 1):
        x0 = cx + sgn * hu * .38
        c.add(P(f"M{F(x0-hu*.34)},{wall_y-12} L{F(x0+hu*.34)},{wall_y-12} C{F(x0+hu*.38)},{wall_y+4} {F(x0+hu*.34)},{wall_y+16} {F(x0+hu*.3)},{wall_y+24} L{F(x0+hu*.26)},{wall_y+92} L{F(x0-hu*.26)},{wall_y+92} L{F(x0-hu*.3)},{wall_y+24} C{F(x0-hu*.34)},{wall_y+16} {F(x0-hu*.38)},{wall_y+4} {F(x0-hu*.34)},{wall_y-12} Z", fill=pfill))
        fc = fold_col(pfill)
        c.add(f'<path d="M{F(x0-hu*.26)},{wall_y+70} C{F(x0-6)},{wall_y+76} {F(x0+6)},{wall_y+76} {F(x0+hu*.26)},{wall_y+70} M{F(x0-hu*.3)},{wall_y+20} C{F(x0-6)},{wall_y+28} {F(x0+6)},{wall_y+28} {F(x0+hu*.3)},{wall_y+20}" fill="none" stroke="{fc}" stroke-width="1.6"/>')
    c.shoes(shoe, spread=.62, scale=.9, ground=wall_y + 118)
    c.torso(1.0, 2.75, 1.8, 1.75, fill=tfill, kind="hoodie" if tfill == INK else "jacket")
    sh = c.y(1.2); L0, R0 = cx - hu * .85, cx + hu * .85
    af = arms_fill or tfill
    c.sleeve([(L0, sh), (L0 - 8, sh + hu * .8), (cx - hu * .95, wall_y - 8)], hu * .44, fill=af)
    c.hand(cx - hu * .98, wall_y - 14, ang=10)
    c.sleeve([(R0, sh), (R0 + 8, sh + hu * .8), (cx + hu * .95, wall_y - 8)], hu * .44, fill=af)
    c.hand(cx + hu * .98, wall_y - 14, ang=-10, mirror=True)
    c.head(hid, scale=hscale)
sitter(c, 82, "hd08a", CEM, CEM, "shoeB")
c.add(f'<path d="M{F(82-6)},{F(c.y(1.05))} L{F(82-6)},{F(c.y(2.7))}" stroke="{HI}" stroke-width="2.4"/><path d="M{F(82-c.hu*.9)},{F(c.y(1.6))} L{F(82-c.hu*.9)},{F(c.y(2.6))} M{F(82+c.hu*.9)},{F(c.y(1.6))} L{F(82+c.hu*.9)},{F(c.y(2.6))}" stroke="{HI}" stroke-width="3"/>')
c2 = C("tmp", 300, 168, heads=5.6)
c2.L = c.L
sitter(c2, 214, "hd08b", INK, INK, "shoeA", hscale=1.02)
c.L = c2.L
c.sid = "cp08"
SYMS.append(c.svg())

# CP09 boar construction worker — huge, hi-vis vest over black hoodie, helmet in hand, boots
c = C("cp09", 280, 192, heads=5.8)
c.shoes("shoeA", spread=.68, scale=1.15); c.pants(3.0, 1.85, fill=BRN, flare=1.05)
c.torso(1.05, 3.2, 2.55, 2.1, fill=INK, kind="hoodie")
c.add(P(f"M{F(c.cx-c.hu*1.0)},{F(c.y(1.25))} L{F(c.cx-c.hu*.25)},{F(c.y(1.25))} L{F(c.cx-c.hu*.25)},{F(c.y(3.0))} L{F(c.cx-c.hu*1.0)},{F(c.y(3.0))} Z", fill=HI) +
      P(f"M{F(c.cx+c.hu*1.0)},{F(c.y(1.25))} L{F(c.cx+c.hu*.25)},{F(c.y(1.25))} L{F(c.cx+c.hu*.25)},{F(c.y(3.0))} L{F(c.cx+c.hu*1.0)},{F(c.y(3.0))} Z", fill=HI) +
      f'<path d="M{F(c.cx-c.hu*1.0)},{F(c.y(2.2))} H{F(c.cx-c.hu*.25)} M{F(c.cx+c.hu*.25)},{F(c.y(2.2))} H{F(c.cx+c.hu*1.0)} M{F(c.cx-c.hu*1.0)},{F(c.y(2.5))} H{F(c.cx-c.hu*.25)} M{F(c.cx+c.hu*.25)},{F(c.y(2.5))} H{F(c.cx+c.hu*1.0)}" stroke="{CON}" stroke-width="7"/>' +
      f'<path d="M{F(c.cx+c.hu*.5)},{F(c.y(1.3))} L{F(c.cx+c.hu*1.0)},{F(c.y(1.3))} L{F(c.cx+c.hu*1.0)},{F(c.y(3.0))} L{F(c.cx+c.hu*.5)},{F(c.y(3.0))} Z" fill="url(#dotInk)" opacity=".6"/>')
sh = c.y(1.3); L0, R0 = c.cx - c.hu * 1.18, c.cx + c.hu * 1.18
c.sleeve([(L0, sh), (L0 - 10, sh + c.hu * 1.0), (L0 - 4, sh + c.hu * 1.9)], c.hu * .62, fill=INK)
c.hand(L0 - 4, sh + c.hu * 1.9, scale=1.15)
hx, hy = R0 + 10, sh + c.hu * 1.95
c.sleeve([(R0, sh), (R0 + 10, sh + c.hu * 1.0), (hx, hy - 6)], c.hu * .62, fill=INK)
c.add(P(f"M{F(hx-30)},{F(hy+34)} C{F(hx-30)},{F(hy-6)} {F(hx+30)},{F(hy-6)} {F(hx+30)},{F(hy+34)} Z", fill=HI) + P(f"M{F(hx-38)},{F(hy+34)} L{F(hx+38)},{F(hy+34)} L{F(hx+34)},{F(hy+42)} L{F(hx-34)},{F(hy+42)} Z", fill=HI) +
      f'<path d="M{F(hx)},{F(hy+2)} V{F(hy+34)}" stroke="{INK}" stroke-width="2"/>')
c.hand(hx, hy - 8, ang=0, mirror=True, kind="fist", scale=1.1)
c.head("hd09", scale=1.08)
SYMS.append(c.svg())

# CP10 smoker on the balcony — paper tank top, black track pants, behind the railing, smoke
c = C("cp10", 240, 175, heads=5.7)
c.top += 20
c.pants(3.0, 1.5, fill=INK)
c.torso(1.05, 3.15, 2.0, 1.65, fill=HI, kind="tank")
c.add(f'<path d="M{F(c.cx-c.hu*.3)},{F(c.y(1.12))} C{F(c.cx-c.hu*.2)},{F(c.y(1.6))} {F(c.cx+c.hu*.2)},{F(c.y(1.6))} {F(c.cx+c.hu*.3)},{F(c.y(1.12))}" fill="none" stroke="{INK}" stroke-width="2.4" stroke-dasharray="2 2"/>')
rail = 468
sh = c.y(1.25); L0, R0 = c.cx - c.hu * .92, c.cx + c.hu * .92
c.sleeve([(L0, sh), (L0 - 14, sh + c.hu * .9), (c.cx - c.hu * .35, rail - 6)], c.hu * .42, fill=PAP, cuff=False)
c.sleeve([(R0, sh), (R0 + 14, sh + c.hu * .9), (c.cx + c.hu * .4, rail - 6)], c.hu * .42, fill=PAP, cuff=False)
c.add(P(f"M0,{rail} L240,{rail} L240,{rail+12} L0,{rail+12} Z", fill=INK) + "".join(P(f"M{x},{rail+12} L{x+6},{rail+12} L{x+6},640 L{x},640 Z", fill=INK, sw=1) for x in range(10, 240, 22)) +
      P(f"M0,626 L240,626 L240,640 L0,640 Z", fill=CON) + f'<path d="M4,{rail+3} H236" stroke="{PAP}" stroke-width="1.4"/>')
c.hand(c.cx - c.hu * .32, rail - 10, ang=-80, kind="fist"); c.hand(c.cx + c.hu * .42, rail - 10, ang=80, mirror=True, kind="fist")
c.head("hd10", scale=1.0)
hx = c.cx + c.hu * .42 * 0 + 0
smoke_x, smoke_y = c.cx + 30, c.y(0) - 20
c.add(f'<path d="M{F(c.cx+40)},{F(c.y(.85))} C{F(c.cx+60)},{F(c.y(.6))} {F(c.cx+44)},{F(c.y(.35))} {F(c.cx+62)},{F(c.y(.1))} C{F(c.cx+76)},{F(c.y(-.1))} {F(c.cx+60)},{F(c.y(-.3))} {F(c.cx+72)},{F(c.y(-.5))}" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round" opacity=".9"/>'
      f'<path d="M{F(c.cx+40)},{F(c.y(.85))} C{F(c.cx+60)},{F(c.y(.6))} {F(c.cx+44)},{F(c.y(.35))} {F(c.cx+62)},{F(c.y(.1))} C{F(c.cx+76)},{F(c.y(-.1))} {F(c.cx+60)},{F(c.y(-.3))} {F(c.cx+72)},{F(c.y(-.5))}" fill="none" stroke="{HI}" stroke-width="4" stroke-linecap="round"/>')
SYMS.append(c.svg())

# CP11 laundry woman — housecoat with dot print, curlers, slippers, arms up to the line
c = C("cp11", 270, 162, heads=5.2, cx=104)
line_y = c.y(-0.25)
c.legs_bare(c.y(3.9), gap=9, wid=22, fill=PAP, ground=622)
c.shoes("shoeC", spread=.5, scale=.85)
c.torso(1.05, 4.0, 2.0, 2.4, fill=CEM, kind="coat", flare=8)
c.add(f'<path d="M{F(c.cx-c.hu*1.0)},{F(c.y(1.2))} L{F(c.cx+c.hu*1.2)},{F(c.y(1.2))} L{F(c.cx+c.hu*1.4)},{F(c.y(4.0))} L{F(c.cx-c.hu*1.3)},{F(c.y(4.0))} Z" fill="url(#dotPaper)" opacity=".55"/>')
sh = c.y(1.25); L0, R0 = c.cx - c.hu * .95, c.cx + c.hu * .95
c.sleeve([(L0, sh), (L0 - 18, sh - c.hu * .5), (c.cx - c.hu * .6, line_y + 18)], c.hu * .5, fill=CEM)
c.sleeve([(R0, sh), (R0 + 18, sh - c.hu * .5), (c.cx + c.hu * .9, line_y + 18)], c.hu * .5, fill=CEM)
c.add(f'<path d="M0,{F(line_y)} L270,{F(line_y+6)}" stroke="{INK}" stroke-width="2"/>')
c.add(P(f"M{F(c.cx+c.hu*.9)},{F(line_y+2)} L256,{F(line_y+6)} L252,{F(line_y+190)} C224,{F(line_y+184)} 204,{F(line_y+196)} {F(c.cx+c.hu*.96)},{F(line_y+184)} Z", fill=HI) +
      f'<path d="M{F(c.cx+c.hu*1.3)},{F(line_y+20)} C{F(c.cx+c.hu*1.4)},{F(line_y+80)} {F(c.cx+c.hu*1.3)},{F(line_y+140)} {F(c.cx+c.hu*1.36)},{F(line_y+180)} M224,{F(line_y+16)} C228,{F(line_y+70)} 222,{F(line_y+130)} 228,{F(line_y+186)}" fill="none" stroke="{INK}" stroke-width="1.4" opacity=".6"/>' +
      f'<path d="M{F(c.cx+c.hu*1.0)},{F(line_y-4)} v14 M238,{F(line_y)} v14" stroke="{INK}" stroke-width="5"/><path d="M{F(c.cx+c.hu*1.0)},{F(line_y-4)} v14 M238,{F(line_y)} v14" stroke="{HI}" stroke-width="2"/>')
c.hand(c.cx - c.hu * .6, line_y + 18, ang=180, kind="fist"); c.hand(c.cx + c.hu * .9, line_y + 20, ang=180, mirror=True, kind="fist")
c.head("hd11", scale=1.0)
SYMS.append(c.svg())

# CP12 crow ticket inspector — black uniform with paper piping, peaked cap, tablet
c = C("cp12", 250, 184, heads=5.8)
c.shoes("shoeA"); c.pants(3.0, 1.45, fill=DEEP)
c.add(f'<path d="M{F(c.cx-c.hu*.72)},{F(c.y(3.1))} L{F(c.cx-c.hu*.78)},600 M{F(c.cx+c.hu*.72)},{F(c.y(3.1))} L{F(c.cx+c.hu*.78)},600" stroke="{PAP}" stroke-width="2"/>')
c.torso(1.05, 3.15, 2.05, 1.75, fill=INK, kind="jacket")
c.add(f'<path d="M{F(c.cx-c.hu*.85)},{F(c.y(2.0))} L{F(c.cx+c.hu*.85)},{F(c.y(2.0))}" stroke="{PAP}" stroke-width="3"/>')
c.add(P(f"M{F(c.cx-c.hu*.62)},{F(c.y(1.5))} L{F(c.cx-c.hu*.3)},{F(c.y(1.5))} L{F(c.cx-c.hu*.3)},{F(c.y(1.75))} L{F(c.cx-c.hu*.62)},{F(c.y(1.75))} Z", fill=HI, sw=1.6))
sh = c.y(1.25); L0, R0 = c.cx - c.hu * .98, c.cx + c.hu * .98
c.sleeve([(L0, sh), (L0 - 10, sh + c.hu * 1.0), (L0 - 6, sh + c.hu * 1.9)], c.hu * .5, fill=INK)
c.hand(L0 - 6, sh + c.hu * 1.9)
tx, ty = c.cx + c.hu * .6, c.y(2.45)
c.sleeve([(R0, sh), (R0 + 8, sh + c.hu * .9), (tx + 10, ty)], c.hu * .5, fill=INK)
c.add(P(f"M{F(tx-30)},{F(ty-34)} L{F(tx+14)},{F(ty-38)} L{F(tx+16)},{F(ty+20)} L{F(tx-28)},{F(ty+24)} Z", fill=INK) + P(f"M{F(tx-24)},{F(ty-28)} L{F(tx+8)},{F(ty-31)} L{F(tx+10)},{F(ty+8)} L{F(tx-22)},{F(ty+12)} Z", fill=HI, sw=1.6))
c.hand(tx + 10, ty - 6, ang=60, mirror=True, kind="fist")
c.head("hd12", scale=1.0)
SYMS.append(c.svg())

# Witness v2 — tall, cardigan to the knees, hands behind the back (elbows out), held cel
def witness(sid, hid):
    c = C(sid, 240, 186, heads=6.2)
    c.shoes("shoeA", spread=.55, scale=.95)
    c.pants(3.4, 1.25, fill=INK, flare=.95)
    sh = c.y(1.2); L0, R0 = c.cx - c.hu * .82, c.cx + c.hu * .82
    c.sleeve([(L0, sh), (L0 - 18, sh + c.hu * 1.1), (c.cx - 6, sh + c.hu * 1.7)], c.hu * .44, fill=CON, cuff=False)
    c.sleeve([(R0, sh), (R0 + 18, sh + c.hu * 1.1), (c.cx + 6, sh + c.hu * 1.7)], c.hu * .44, fill=CON, cuff=False)
    c.torso(1.02, 4.0, 1.75, 1.75, fill=CON, kind="cardigan", flare=6)
    c.add(f'<path d="M{F(c.cx-c.hu*.4)},{F(c.y(1.02))} L{F(c.cx)},{F(c.y(1.5))} L{F(c.cx+c.hu*.4)},{F(c.y(1.02))}" fill="{INK}" stroke="{INK}" stroke-width="2"/>')
    c.add(f'<path d="M{F(L0-8)},{F(sh+c.hu*1.05)} C{F(L0-2)},{F(sh+c.hu*1.0)} {F(L0+4)},{F(sh+c.hu*1.02)} {F(L0+8)},{F(sh+c.hu*1.08)} M{F(R0+8)},{F(sh+c.hu*1.05)} C{F(R0+2)},{F(sh+c.hu*1.0)} {F(R0-4)},{F(sh+c.hu*1.02)} {F(R0-8)},{F(sh+c.hu*1.08)}" fill="none" stroke="{INK}" stroke-width="1.6"/>')
    c.head(hid, scale=1.0)
    return c.svg()
SYMS.append(witness("figWitness2", "hd13"))

# Memory v2 — same construction, garments as paper so the figure reads as line; printed through the burgundy plate
def memory(sid):
    c = C(sid, 240, 172, heads=5.8)
    c.add(P(f"M{F(c.cx-c.hu*1.0)},{F(c.y(1.25))} L{F(c.cx+c.hu*1.0)},{F(c.y(1.25))} L{F(c.cx+c.hu*.92)},{F(c.y(2.8))} L{F(c.cx-c.hu*.92)},{F(c.y(2.8))} Z", fill=HI))
    c.shoes("shoeB", scale=.95); c.pants(2.95, 1.45, fill=HI)
    c.torso(1.08, 3.05, 1.95, 1.7, fill=HI, kind="jacket")
    c.add(f'<path d="M{F(c.cx-c.hu*.95)},{F(c.y(2.1))} L{F(c.cx+c.hu*.95)},{F(c.y(1.5))}" stroke="{INK}" stroke-width="2"/><path d="M{F(c.cx-c.hu*.95)},{F(c.y(2.1))} L{F(c.cx+c.hu*.95)},{F(c.y(1.5))} L{F(c.cx+c.hu*.95)},{F(c.y(1.15))} L{F(c.cx-c.hu*.2)},{F(c.y(1.15))} Z" fill="url(#dotInkFine)" opacity=".35"/>')
    c.add(f'<path d="M{F(c.cx-c.hu*.55)},{F(c.y(1.1))} L{F(c.cx-c.hu*.6)},{F(c.y(2.6))} M{F(c.cx+c.hu*.55)},{F(c.y(1.1))} L{F(c.cx+c.hu*.6)},{F(c.y(2.6))}" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>')
    sh = c.y(1.28); L0, R0 = c.cx - c.hu * .9, c.cx + c.hu * .9
    c.sleeve([(L0, sh), (L0 - 10, sh + c.hu * 1.0), (L0 - 6, sh + c.hu * 1.9)], c.hu * .5, fill=HI)
    c.hand(L0 - 6, sh + c.hu * 1.9)
    can_x, can_y = R0 + 10, sh + c.hu * 1.95
    c.sleeve([(R0, sh), (R0 + 10, sh + c.hu * 1.0), (can_x, can_y - 12)], c.hu * .5, fill=HI)
    c.add(P(f"M{F(can_x-9)},{F(can_y-6)} L{F(can_x+9)},{F(can_y-6)} L{F(can_x+9)},{F(can_y+52)} L{F(can_x-9)},{F(can_y+52)} Z", fill=HI, sw=2.6))
    c.hand(can_x, can_y - 14, mirror=True, kind="fist")
    c.head("hd14", scale=1.0)
    return c.svg()
SYMS.append(memory("figMemory3"))

out = ['<g id="hd_defs">'] if False else []
for k, v in HEADS.items():
    out.append(f'<symbol id="{k}" viewBox="0 0 120 152" overflow="visible">{v}</symbol>')
out += SYMS
open(sys.argv[1], "w").write("\n".join(out))
print(len(HEADS), "heads,", len(SYMS), "figures")

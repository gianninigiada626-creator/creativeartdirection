"""
Cut the puppets out of their black studio backdrops, and pull still plates from the clips.

The backdrop is near-black and touches the frame edges, so the matte is the region that is
dark AND connected to the border (dark details inside the puppet — pupils, soles, knee pads —
stay opaque). GrabCut then refines the fur edge. Results go to build/ (cached).
"""
import os
import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, 'assets')
B = os.path.join(HERE, 'build')


# black details that touch the backdrop (the cat's knee pads) are protected by hand: x, y, w, h
KEEP = {'gatto': [(600, 1490, 175, 175), (828, 1490, 170, 175)]}


def cutout(name, thr=26):
    img = cv2.imread(os.path.join(A, 'characters', f'{name}.webp'))
    h, w = img.shape[:2]
    lum = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    dark = (lum < thr).astype(np.uint8)
    keep = np.zeros((h, w), bool)
    for (x, y, bw, bh) in KEEP.get(name, []):
        keep[y:y + bh, x:x + bw] = True
    dark[keep] = 0
    # backdrop = dark pixels reachable from the border
    n, lab = cv2.connectedComponents(dark, connectivity=4)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    # GrabCut on the boundary only: sure background far out, sure puppet well inside
    m = np.full((h, w), cv2.GC_PR_FGD, np.uint8)
    m[cv2.erode(bg.astype(np.uint8), np.ones((25, 25), np.uint8)) > 0] = cv2.GC_BGD
    m[cv2.erode((~bg).astype(np.uint8), np.ones((25, 25), np.uint8)) > 0] = cv2.GC_FGD
    m[keep] = cv2.GC_FGD
    m[bg & (cv2.erode(bg.astype(np.uint8), np.ones((25, 25), np.uint8)) == 0)] = cv2.GC_PR_BGD
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, m, None, bgd, fgd, 3, cv2.GC_INIT_WITH_MASK)
    alpha = np.where((m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    # soft edge; keep only the puppet (largest piece)
    k, lab2, stats, _ = cv2.connectedComponentsWithStats((alpha > 0).astype(np.uint8))
    if k > 1:
        big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        alpha[lab2 != big] = 0
    alpha = cv2.GaussianBlur(alpha, (0, 0), 1.6)
    ys, xs = np.nonzero(alpha > 8)
    y0, y1, x0, x1 = max(0, ys.min() - 8), min(h, ys.max() + 8), max(0, xs.min() - 8), min(w, xs.max() + 8)
    rgba = np.dstack([img, alpha])[y0:y1, x0:x1]
    cv2.imwrite(os.path.join(B, f'{name}-cut.png'), rgba)
    return rgba


def main():
    os.makedirs(B, exist_ok=True)
    for name in ['gatto', 'polpo', 'orso', 'vecchio']:
        r = cutout(name)
        print('cut', name, r.shape)


if __name__ == '__main__':
    main()

"""
Prepare the photographs for 2.5D animation: a subject layer (cut out with GrabCut),
a clean background plate (subject and ball painted out), and the ball as its own sprite.
Results go to build/ and are cached; delete build/ to recompute.
"""
import os
import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, 'assets')
B = os.path.join(HERE, 'build')

# Hand-placed hints in source pixels (1500 × 2000): the subject's box for GrabCut,
# sure-foreground strokes, and the ball as a circle (cx, cy, r).
PHOTOS = {
    'strada': dict(rect=(470, 960, 1030, 1040), fg=[(910, 1060, 60), (910, 1180, 70), (880, 1700, 160)], bg=[(1080, 600, 340, 740)], ball=(632, 1340, 168)),
    'stadio': dict(rect=(180, 180, 1060, 1820), fg=[(700, 420, 120), (760, 1000, 220), (760, 1650, 200)]),
    'cortile': dict(rect=(600, 540, 400, 620), fg=[(800, 740, 60), (800, 950, 90)], ball=(322, 1035, 172), extra=[(520, 1440, 980, 560)]),
    'barbiere': dict(rect=(260, 760, 1240, 1240), fg=[(800, 1300, 150), (800, 1800, 220)]),
    'corsa': dict(ball=(845, 372, 100), keep_ball=True),
}


def grabcut(img, rect, fg, extra=(), bg=()):
    mask = np.zeros(img.shape[:2], np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    # work at half size: plenty for a soft matte, four times faster
    small = cv2.resize(img, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
    m = np.zeros(small.shape[:2], np.uint8)
    m[:] = cv2.GC_BGD
    for (x, y, w, h) in [rect, *extra]:
        m[y // 2:(y + h) // 2, x // 2:(x + w) // 2] = cv2.GC_PR_FGD
    for (x, y, w, h) in bg:
        m[y // 2:(y + h) // 2, x // 2:(x + w) // 2] = cv2.GC_BGD
    for (x, y, r) in fg:
        cv2.circle(m, (x // 2, y // 2), r // 2, cv2.GC_FGD, -1)
    cv2.grabCut(small, m, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
    mask = np.where((m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    mask = cv2.resize(mask, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_LINEAR)
    # keep the biggest pieces, close holes, feather the edge
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
    n, lab, stats, _ = cv2.connectedComponentsWithStats((mask > 127).astype(np.uint8))
    keep = np.zeros_like(mask)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] > 20000:
            keep[lab == i] = 255
    return cv2.GaussianBlur(keep, (0, 0), 3)


def plate(img, holes):
    """Paint out the holes at low resolution (fast, soft), then put the result back at full size."""
    k = 4
    small = cv2.resize(img, None, fx=1 / k, fy=1 / k, interpolation=cv2.INTER_AREA)
    hs = cv2.resize(holes, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
    hs = cv2.dilate(hs, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    filled = cv2.inpaint(small, hs, 12, cv2.INPAINT_TELEA)
    filled = cv2.GaussianBlur(filled, (0, 0), 2)
    big = cv2.resize(filled, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_CUBIC)
    a = cv2.GaussianBlur(holes, (0, 0), 8)[..., None] / 255.0
    return (img * (1 - a) + big * a).astype(np.uint8)


def main():
    os.makedirs(B, exist_ok=True)
    for name, p in PHOTOS.items():
        img = cv2.imread(os.path.join(A, f'{name}.webp'))
        src = img
        if 'ball' in p:
            x, y, r = p['ball']
            bm = np.zeros(img.shape[:2], np.uint8)
            cv2.circle(bm, (x, y), r, 255, -1)
            bm = cv2.GaussianBlur(bm, (0, 0), 4)
            # the ball sprite: a square crop with its own alpha
            s = r + 12
            crop = img[y - s:y + s, x - s:x + s]
            alpha = bm[y - s:y + s, x - s:x + s]
            cv2.imwrite(os.path.join(B, f'{name}-ball.png'), np.dstack([crop, alpha]))
            if not p.get('keep_ball'):
                # the photo without its ball, so the ball can leave the frame
                src = plate(img, cv2.dilate(bm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31))))
        cv2.imwrite(os.path.join(B, f'{name}-src.jpg'), src, [cv2.IMWRITE_JPEG_QUALITY, 94])
        if 'rect' in p:
            m = grabcut(img, p['rect'], p['fg'], p.get('extra', ()), p.get('bg', ()))
            cv2.imwrite(os.path.join(B, f'{name}-mask.png'), m)
            holes = cv2.dilate((m > 40).astype(np.uint8) * 255, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
            cv2.imwrite(os.path.join(B, f'{name}-plate.jpg'), plate(src, holes), [cv2.IMWRITE_JPEG_QUALITY, 94])
        print('prepared', name)


if __name__ == '__main__':
    main()

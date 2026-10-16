"""Render storyboard panels: python3 render_board.py [ids...] → ../out/board/panel-XX.jpg"""
import os
import sys
import time

from engine import save
from panels import PANELS

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'board')
os.makedirs(OUT, exist_ok=True)
ids = sys.argv[1:] or list(PANELS)
for i in ids:
    t = time.time()
    save(PANELS[i](), os.path.join(OUT, f'panel-{i}.jpg'))
    print(i, f'{time.time() - t:.1f}s', flush=True)

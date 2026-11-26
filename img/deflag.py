"""Remove the red dumpling flag from the front of each pedestal and continue the wooden rim.

For each icon: find the red flag at the bottom centre, fit the pedestal's oval bottom edge from the
visible edge on both sides, then refill the flag area with wood sampled (by height above the edge)
from just outside the flag, blended left-to-right. Anything below the fitted edge becomes transparent.
"""
import sys
from PIL import Image
CELL = 160
sheet = Image.open(sys.argv[1]).convert('RGBA')
out = sheet.copy()

def fit_parabola(pts):
    # least squares y = a*x^2 + b*x + c
    import itertools
    n = len(pts); sx = [sum(x ** k for x, _ in pts) for k in range(5)]
    sy = [sum(y * x ** k for x, y in pts) for k in range(3)]
    M = [[sx[4], sx[3], sx[2]], [sx[3], sx[2], sx[1]], [sx[2], sx[1], n]]
    v = [sy[2], sy[1], sy[0]]
    # solve 3x3 by Cramer's rule
    def det(m): return (m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1]) - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0]) + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]))
    D = det(M); res = []
    for col in range(3):
        mm = [row[:] for row in M]
        for r in range(3): mm[r][col] = v[r]
        res.append(det(mm) / D)
    return res

for i in range(9):
    cell = sheet.crop((i * CELL, 0, (i + 1) * CELL, CELL)); px = cell.load()
    reds = [(x, y) for y in range(118, CELL) for x in range(45, 115)
            if px[x, y][3] > 200 and px[x, y][0] > 120 and px[x, y][0] > 2.2 * px[x, y][1] and px[x, y][2] < 90]
    if not reds: print('no flag in', i); continue
    cxr = sorted(x for x, _ in reds)[len(reds) // 2]
    reds = [(x, y) for x, y in reds if abs(x - cxr) < 24]
    fx0 = min(x for x, _ in reds) - 9; fx1 = max(x for x, _ in reds) + 9
    fy0 = min(y for _, y in reds) - 4
    # extra margin (left, right) for flags whose trim reaches a little further on one side
    ex_l, ex_r = {1: (0, 9)}.get(i, (0, 0))
    fx0 -= ex_l; fx1 += ex_r
    def bottom(x):
        if not 0 <= x < CELL: return None
        for y in range(CELL - 1, 0, -1):
            if px[x, y][3] > 128: return y
        return None
    pts = [(x, bottom(x)) for x in list(range(fx0 - 28, fx0 - 1)) + list(range(fx1 + 2, fx1 + 29)) if bottom(x) is not None]
    a, b, c = fit_parabola(pts)
    ybot = lambda x: a * x * x + b * x + c
    # reference columns just outside the flag, averaged over a few columns each side
    L = list(range(fx0 - 6, fx0 - 1)); R = list(range(fx1 + 2, fx1 + 7))
    def sample(cols, depth):
        acc = [0, 0, 0, 0]; n = 0
        for x in cols:
            y = int(round(ybot(x) - depth))
            if 0 <= y < CELL and 0 <= x < CELL:
                p = px[x, y]
                for k in range(4): acc[k] += p[k]
                n += 1
        return tuple(v / max(1, n) for v in acc)
    for x in range(fx0, fx1 + 1):
        yb = ybot(x); t = (x - fx0) / (fx1 - fx0)
        for y in range(fy0, CELL):
            depth = yb - y
            if depth < -0.6:
                cell.putpixel((x, y), (0, 0, 0, 0)); continue
            lc = sample(L, depth); rc = sample(R, depth)
            col = [lc[k] * (1 - t) + rc[k] * t for k in range(4)]
            if depth < 0.4: col[3] *= max(0.0, (depth + 0.6))
            cell.putpixel((x, y), tuple(int(round(v)) for v in col))
    # anything still hanging below the pedestal's edge across the middle (leftover flag tabs) goes
    for x in range(max(0, fx0 - 22), min(CELL, fx1 + 23)):
        for y in range(int(ybot(x)) + 2, CELL):
            cell.putpixel((x, y), (0, 0, 0, 0))
    out.paste(cell, (i * CELL, 0))
out.save(sys.argv[2])
print('saved')

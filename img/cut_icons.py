"""Cut the 9 bar icons out of the design image with clean transparent backgrounds.

Usage: python3 cut_icons.py <bar-design-image> <output.png>
Each icon is cropped inside the dotted dividers, the pink panel is removed with an
edge-seeded flood fill, loose bits (dividers, floor waves, specks) are dropped, and the
edge is pulled in by a pixel so no pink fringe is left.
"""
import sys
from collections import deque
from PIL import Image, ImageFilter

src = Image.open(sys.argv[1]).convert('RGB')
out_path = sys.argv[2]
# (centre x, half width, top y) for each icon, chosen to stay inside the dotted dividers
SLOTS = [(113, 62, 170), (250, 62, 181), (404, 70, 172), (560, 70, 182), (714, 70, 172),
         (868, 68, 172), (1020, 68, 182), (1172, 68, 181), (1326, 72, 172)]
Y1 = 320
CELL = 160
# background pockets enclosed by the artwork (not reachable from the edges), as source-image points.
# Training: the glow trapped between the barbell, the arms and the dumpling's head.
POCKETS = {2: [(391, 227), (395, 225), (428, 227), (424, 225), (390, 231), (430, 231)]}
sheet = Image.new('RGBA', (CELL * 9, CELL), (0, 0, 0, 0))

def dist(a, b):
    return ((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2) ** 0.5

def components(mask, W, H):
    seen = [[False] * W for _ in range(H)]
    out = []
    for sy in range(H):
        for sx in range(W):
            if not mask[sy][sx] or seen[sy][sx]: continue
            comp = []; dq = deque([(sx, sy)]); seen[sy][sx] = True
            while dq:
                x, y = dq.popleft(); comp.append((x, y))
                for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
                    if 0 <= nx < W and 0 <= ny < H and mask[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True; dq.append((nx, ny))
            out.append(comp)
    return out

for i, (cx, hw, y0) in enumerate(SLOTS):
    im = src.crop((cx - hw, y0, cx + hw, Y1))
    W, H = im.size
    px = im.load()
    border = [px[x, 0] for x in range(W)] + [px[x, H-1] for x in range(W)] + [px[0, y] for y in range(H)] + [px[W-1, y] for y in range(H)]
    ref = tuple(sum(c[k] for c in border) / len(border) for k in range(3))
    bg = [[False] * W for _ in range(H)]
    q = deque((x, y) for x in range(W) for y in (0, H - 1))
    q.extend((x, y) for y in range(H) for x in (0, W - 1))
    for (x, y) in q: bg[y][x] = True
    while q:
        x, y = q.popleft(); c = px[x, y]
        for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
            if 0 <= nx < W and 0 <= ny < H and not bg[ny][nx]:
                n = px[nx, ny]
                if dist(n, c) < 18 and dist(n, ref) < 100:
                    bg[ny][nx] = True; q.append((nx, ny))
    for (sx, sy) in POCKETS.get(i, []):
        x0, y0p = sx - (cx - hw), sy - y0
        if not (0 <= x0 < W and 0 <= y0p < H) or bg[y0p][x0]: continue
        seed = px[x0, y0p]; bg[y0p][x0] = True; pq = deque([(x0, y0p)])
        while pq:
            x, y = pq.popleft(); c = px[x, y]
            for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
                if 0 <= nx < W and 0 <= ny < H and not bg[ny][nx]:
                    n = px[nx, ny]
                    if dist(n, c) < 16 and dist(n, seed) < 60:
                        bg[ny][nx] = True; pq.append((nx, ny))
    fg = [[not bg[y][x] for x in range(W)] for y in range(H)]
    comps = sorted(components(fg, W, H), key=len, reverse=True)
    main = comps[0]
    mx0 = min(x for x, _ in main); mx1 = max(x for x, _ in main)
    my0 = min(y for _, y in main); my1 = max(y for _, y in main)
    keep = set(main)
    for comp in comps[1:]:
        cy = sum(y for _, y in comp) / len(comp)
        cxm = sum(x for x, _ in comp) / len(comp)
        touches = any(x <= 1 or x >= W - 2 or y <= 1 or y >= H - 2 for x, y in comp)
        tall_thin = (max(y for _, y in comp) - min(y for _, y in comp)) > 4 * (max(x for x, _ in comp) - min(x for x, _ in comp) + 1)
        upper = cy < my0 + (my1 - my0) * 0.55  # zzz, sparkles, little stars live up here
        if len(comp) >= 30 and upper and not touches and not tall_thin and mx0 - 14 <= cxm <= mx1 + 14:
            keep.update(comp)
    mask = Image.new('L', (W, H), 0); mp = mask.load()
    for x, y in keep: mp[x, y] = 255
    # pull the edge in by a pixel (removes the pink fringe), then soften it
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    rgba = im.convert('RGBA'); rgba.putalpha(mask)
    # trim to the visible icon and scale it so every icon fills its cell about the same
    bbox = rgba.getbbox(); rgba = rgba.crop(bbox); bw, bh = rgba.size
    k = min((CELL - 8) / bw, (CELL - 6) / bh)
    rgba = rgba.resize((round(bw * k), round(bh * k)), Image.LANCZOS); bw, bh = rgba.size
    sheet.paste(rgba, (i * CELL + (CELL - bw) // 2, CELL - bh - 3), rgba)

# Training: the bar rests right on the dumpling's head, so no arms are drawn (drawn arms made the
# top knot read as a person's head). Clean up the few orange glow scraps left beside the head.
ox = 2 * CELL
cell = sheet.crop((ox, 0, ox + CELL, CELL)); cp = cell.load()
for (x0, y0c, x1, y1c) in ((90, 44, 110, 62), (50, 44, 66, 62)):
    for y in range(y0c, y1c):
        for x in range(x0, x1):
            r, g, b, a = cp[x, y]
            if a and r > 190 and 110 < g < 215 and b < 150 and r - b > 80:  # orange glow, not the brown bar or cream dumpling
                cp[x, y] = (r, g, b, 0)
# remove the yellow top knot above the headband (it read as a little head) ...
for y in range(40, 61):
    for x in range(64, 100):
        r, g, b, a = cp[x, y]
        if a and r > 190 and g > 150 and b < 205 and not (b > r):  # cream/yellow, not the blue headband
            cp[x, y] = (r, g, b, 0)
# drop light specks left between the bar and the headband
for y in range(44, 56):
    for x in range(60, 104):
        r, g, b, al = cp[x, y]
        if al and r > 170 and g > 150 and b > 120 and not (b > r): cp[x, y] = (r, g, b, 0)
# ... and paint over the little hands on the bar with the bar's own colour from just beside them
for (x0, x1, src_dx) in ((52, 70, -4), (95, 114, 5)):
    for y in range(34, 50):
        ref = cp[(x0 + src_dx) if src_dx < 0 else (x1 + src_dx), y]
        for x in range(x0, x1):
            r, g, b, a = cp[x, y]
            if a and r > 170 and g > 120:  # hand colours (cream/orange), leave the dark bar alone
                cp[x, y] = ref if ref[3] > 0 and ref[0] < 170 else (r, g, b, 0)
# clean faint smudges left where the original hands were, and specks above the headband
for (x0, y0c, x1, y1c) in ((48, 44, 62, 60), (95, 34, 108, 54), (60, 50, 100, 60)):
    for y in range(y0c, y1c):
        for x in range(x0, x1):
            r, g, b, al = cp[x, y]
            if al and (r + g + b) / 3 > 105 and not (b > r): cp[x, y] = (r, g, b, 0)
# give the dumpling arms, a rounded top behind its headband, and hands gripping the bar.
# Everything is drawn smooth at 4x; the head top and arms go *behind* the icon, the hands in front.
from PIL import ImageDraw
S4 = 4
CREAM, CREAM_D, LINE = (248, 230, 204, 255), (236, 208, 170, 255), (172, 118, 72, 255)
def layer():
    im = Image.new('RGBA', (CELL * S4, CELL * S4), (0, 0, 0, 0)); return im, ImageDraw.Draw(im)
def stroke(d, p0, p1, w, col):
    d.line([(p0[0] * S4, p0[1] * S4), (p1[0] * S4, p1[1] * S4)], fill=col, width=round(w * S4))
    for (x, y) in (p0, p1): d.ellipse([(x - w / 2) * S4, (y - w / 2) * S4, (x + w / 2) * S4, (y + w / 2) * S4], fill=col)
back, db = layer()
db.ellipse([48 * S4, 49 * S4, 110 * S4, 84 * S4], fill=LINE)            # rounded head top (outline)
db.ellipse([49.6 * S4, 50.6 * S4, 108.4 * S4, 84 * S4], fill=CREAM)
db.ellipse([58 * S4, 53 * S4, 76 * S4, 60 * S4], fill=(255, 250, 238, 255))   # soft shine
for p0, p1 in (((49, 82), (58, 47)), ((110, 82), (101, 47))):          # arms
    stroke(db, p0, p1, 11, LINE); stroke(db, p0, p1, 7.6, CREAM)
back = back.resize((CELL, CELL), Image.LANCZOS)
back.alpha_composite(cell)
front, dfr = layer()
for (hx, hy) in ((58, 44.5), (101, 44.5)):                              # hands wrapped round the bar
    dfr.ellipse([(hx - 6) * S4, (hy - 5.5) * S4, (hx + 6) * S4, (hy + 5.5) * S4], fill=LINE)
    dfr.ellipse([(hx - 4.6) * S4, (hy - 4.2) * S4, (hx + 4.6) * S4, (hy + 4.2) * S4], fill=CREAM)
    dfr.line([((hx - 3) * S4, hy * S4), ((hx + 3) * S4, hy * S4)], fill=CREAM_D, width=S4)
front = front.resize((CELL, CELL), Image.LANCZOS)
back.alpha_composite(front)
cell = back
sheet.paste(cell, (ox, 0))
sheet.save(out_path)
print('saved', out_path, sheet.size)

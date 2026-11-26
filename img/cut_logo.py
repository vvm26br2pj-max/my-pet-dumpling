"""Cut the 'My Pet Dumpling' sign (bun, clouds, chopsticks, ribbon) off the black background."""
import sys
from collections import deque
from PIL import Image, ImageFilter
src = Image.open(sys.argv[1]).convert('RGB')
# sign region; the ribbon's lower edge meets the bar frame around y=160, so stop just above it
box = (553, 14, 889, 138)  # bun, plaque, title, chopsticks and clouds; the red ribbon below is left off
im = src.crop(box); W, H = im.size; px = im.load()
def dark(p): return max(p) < 60
bg = [[False] * W for _ in range(H)]
q = deque()
for x in range(W):
    for y in (0,):
        if dark(px[x, y]): q.append((x, y)); bg[y][x] = True
for y in range(H):
    for x in (0, W - 1):
        if dark(px[x, y]) and not bg[y][x]: q.append((x, y)); bg[y][x] = True
while q:
    x, y = q.popleft()
    for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
        if 0 <= nx < W and 0 <= ny < H and not bg[ny][nx] and max(px[nx, ny]) < 100:
            bg[ny][nx] = True; q.append((nx, ny))
mask = Image.new('L', (W, H)); mp = mask.load()
for y in range(H):
    for x in range(W):
        mp[x, y] = 0 if bg[y][x] else 255
# drop small stray bits (blossom petals at the edges)
from collections import deque as dq
seen = [[False] * W for _ in range(H)]; keep = Image.new('L', (W, H)); kp = keep.load()
comps = []
for sy in range(H):
    for sx in range(W):
        if mp[sx, sy] and not seen[sy][sx]:
            c = []; d = dq([(sx, sy)]); seen[sy][sx] = True
            while d:
                x, y = d.popleft(); c.append((x, y))
                for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
                    if 0 <= nx < W and 0 <= ny < H and mp[nx, ny] and not seen[ny][nx]: seen[ny][nx] = True; d.append((nx, ny))
            comps.append(c)
comps.sort(key=len, reverse=True)
for c in comps:
    if len(c) > 400 or (c is comps[0]):
        for x, y in c: kp[x, y] = 255
    elif len(c) > 30:  # small bits near the top (steam, heart) stay, edge petals go
        xs = [x for x, _ in c]
        if 40 < sum(xs) / len(xs) < W - 40:
            for x, y in c: kp[x, y] = 255
keep = keep.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
out = im.convert('RGBA'); out.putalpha(keep)
# soften the flat cut along the bottom
a = out.getchannel('A'); ap = a.load()
for y in range(H - 6, H):
    k = (H - y) / 7
    for x in range(W): ap[x, y] = int(ap[x, y] * k)
out.putalpha(a)
out = out.crop(out.getbbox())
out.save(sys.argv[2]); print(out.size)

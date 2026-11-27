"""Crop the title art header and paint out the paw prints and the heart + lines on the banner."""
import sys
from PIL import Image, ImageFilter
im = Image.open(sys.argv[1]).convert('RGB').crop((0, 0, 852, 578))
px = im.load()
# regions (x0, y0, x1, y1) in the original image, filled by blending the banner colour from left and right
REGIONS = [(96, 438, 158, 499), (696, 438, 758, 499), (334, 504, 520, 545)]
for (x0, y0, x1, y1) in REGIONS:
    for y in range(y0, y1):
        L = px[x0 - 2, y]; R = px[x1 + 2, y]
        for x in range(x0, x1):
            t = (x - x0) / (x1 - x0)
            px[x, y] = tuple(round(L[k] * (1 - t) + R[k] * t) for k in range(3))
    # soften the patch edges
    box = (x0 - 4, y0 - 4, x1 + 4, y1 + 4)
    patch = im.crop(box).filter(ImageFilter.GaussianBlur(1.6))
    im.paste(patch, box)
im.save(sys.argv[2], quality=92, method=6)
print('saved')

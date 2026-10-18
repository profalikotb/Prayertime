"""Generates app icons and iOS splash screens (run: python3 scripts/make-icons.py)."""
from PIL import Image, ImageDraw, ImageFilter
import math, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public')
BG_TOP, BG_BOT = (11, 59, 51), (6, 22, 28)
GOLD_HI, GOLD, GOLD_LO = (255, 240, 200), (232, 199, 122), (176, 132, 44)

def gradient(w, h):
    img = Image.new('RGB', (w, h))
    px = img.load()
    cx, cy = w * 0.5, h * 0.35
    rmax = math.hypot(w, h) * 0.75
    for y in range(h):
        for x in range(w):
            t = min(1, math.hypot(x - cx, y - cy) / rmax)
            px[x, y] = tuple(int(BG_TOP[i] + (BG_BOT[i] - BG_TOP[i]) * t) for i in range(3))
    return img

def star8(d, cx, cy, r, color, width):
    for a0 in (0, 45):
        pts = []
        for k in range(4):
            a = math.radians(a0 + k * 90 + 45)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        d.polygon(pts, outline=color, width=width)

def crescent(size, scale):
    """Gold crescent + small star on transparent layer, supersampled."""
    S = size * 4
    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    disc = Image.new('L', (S, S), 0)
    dd = ImageDraw.Draw(disc)
    R = S * 0.30 * scale
    cx, cy = S * 0.47, S * 0.5
    dd.ellipse([cx - R, cy - R, cx + R, cy + R], fill=255)
    dd.ellipse([cx - R * 0.55, cy - R * 1.12, cx + R * 1.25, cy + R * 0.68], fill=0)
    grad = Image.new('RGBA', (S, S))
    gp = ImageDraw.Draw(grad)
    for i in range(S):
        t = i / S
        c = tuple(int(GOLD_HI[j] * (1 - t) + GOLD_LO[j] * t) if t < 0.5 else int(GOLD[j] * (1 - (t - .5) * 2) + GOLD_LO[j] * (t - .5) * 2) for j in range(3))
        gp.line([(0, i), (S, i)], fill=c + (255,))
    layer.paste(grad, (0, 0), disc)
    sd = ImageDraw.Draw(layer)
    sx, sy, sr = cx + R * 0.82, cy - R * 0.05, R * 0.2
    pts = []
    for k in range(10):
        a = math.radians(-90 + k * 36)
        rr = sr if k % 2 == 0 else sr * 0.42
        pts.append((sx + rr * math.cos(a), sy + rr * math.sin(a)))
    sd.polygon(pts, fill=GOLD + (255,))
    return layer.resize((size, size), Image.LANCZOS)

def icon(size, scale=1.0, pattern=True):
    base = gradient(size, size).convert('RGBA')
    if pattern:
        pat = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        pd = ImageDraw.Draw(pat)
        step = size / 4
        for i in range(-1, 6):
            for j in range(-1, 6):
                star8(pd, i * step, j * step, step * 0.32, GOLD + (26,), max(1, size // 256))
        base = Image.alpha_composite(base, pat)
    glow = crescent(size, scale).filter(ImageFilter.GaussianBlur(size / 40))
    base = Image.alpha_composite(base, Image.eval(glow, lambda v: int(v * 0.5)))
    base = Image.alpha_composite(base, crescent(size, scale))
    return base

os.makedirs(os.path.join(OUT, 'icons'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'splash'), exist_ok=True)
big = icon(1024)
for s, name in [(512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png'), (32, 'favicon-32.png')]:
    big.resize((s, s), Image.LANCZOS).convert('RGB').save(os.path.join(OUT, 'icons', name), optimize=True)
icon(512, scale=0.72).convert('RGB').save(os.path.join(OUT, 'icons', 'icon-maskable-512.png'), optimize=True)
big.resize((48, 48), Image.LANCZOS).save(os.path.join(OUT, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])

mark = crescent(420, 1.0)
for w, h in [(1320, 2868), (1290, 2796), (1206, 2622), (1179, 2556), (1170, 2532), (1125, 2436), (828, 1792), (750, 1334)]:
    img = Image.new('RGB', (w, h), BG_TOP)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=tuple(int(BG_TOP[i] + (BG_BOT[i] - BG_TOP[i]) * t) for i in range(3)))
    m = mark.resize((int(w * 0.36), int(w * 0.36)), Image.LANCZOS)
    img.paste(m, ((w - m.width) // 2, int(h * 0.38) - m.height // 2), m)
    img.save(os.path.join(OUT, 'splash', f'splash-{w}x{h}.png'), optimize=True)
print('icons + splash written')

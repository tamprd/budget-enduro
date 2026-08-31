#!/usr/bin/env python3
"""
Budget Enduro poster generator.

Builds one poster per event from the same registry the website uses, so every
round looks identical by construction and you get a shareable image for social
at the same time.

    python3 make_posters.py

Reads VENUES and EVENTS from build.py. Writes assets/event-<slug>.jpg and
prints the `poster:` line to paste into assets/be.js.

Needs: pillow, numpy, cairosvg  (pip install pillow numpy cairosvg)
Fonts live in fonts/ — see fonts/README.txt.
"""
import io
import os
import re

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, 'assets')
FONTS = os.path.join(HERE, 'fonts')

W, H = 1448, 1086                      # matches the supplied posters
RED = (206, 16, 22)
WHITE = (245, 245, 243)
BASE = (13, 15, 16)

MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
          'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']


# ----------------------------------------------------------------- fonts
def font(size):
    return ImageFont.truetype(
        os.path.join(FONTS, 'BarlowCondensed-ExtraBoldItalic.ttf'), size)


def font_bold(size):
    return ImageFont.truetype(
        os.path.join(FONTS, 'BarlowCondensed-BoldItalic.ttf'), size)


# ----------------------------------------------------------------- texture
def background(seed=0):
    """Dark base with cloudy variation, diagonal brush streaks and fine grain."""
    rng = np.random.default_rng(seed)

    # large soft blotches
    small = rng.random((H // 24, W // 24)).astype(np.float32)
    cloud = np.array(Image.fromarray((small * 255).astype(np.uint8))
                     .resize((W, H), Image.BICUBIC)).astype(np.float32) / 255.0
    cloud = (cloud - cloud.min()) / (np.ptp(cloud) + 1e-6)

    # diagonal brush streaks
    streak = rng.random((H // 3, W // 3)).astype(np.float32)
    streak = np.array(Image.fromarray((streak * 255).astype(np.uint8))
                      .resize((W, H), Image.BICUBIC)
                      .filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / 255.0
    yy, xx = np.mgrid[0:H, 0:W]
    ridge = np.sin((xx * 0.9 + yy * 1.25) * 0.017) * 0.5 + 0.5
    ridge *= np.sin((xx * 0.9 + yy * 1.25) * 0.0026) * 0.5 + 0.5
    streak = np.clip(streak * 0.24 + ridge * 0.76, 0, 1) ** 1.9

    grain = rng.normal(0, 1, (H, W)).astype(np.float32)

    lum = (np.array(BASE, dtype=np.float32).mean()
           + cloud * 9.0 + streak * 40.0 + grain * 3.0)

    # vignette
    cx, cy = W / 2, H / 2
    r = np.sqrt(((xx - cx) / cx) ** 2 + ((yy - cy) / cy) ** 2)
    lum *= np.clip(1.10 - 0.46 * r, 0.42, 1.12)

    lum = np.clip(lum, 3, 78)
    rgb = np.dstack([lum * 1.00, lum * 0.99, lum * 0.99]).astype(np.uint8)
    return Image.fromarray(rgb, 'RGB')


def distress(mask_img, seed=0, amount=0.10):
    """Knock speckles out of a text mask so type reads worn rather than clean."""
    rng = np.random.default_rng(seed)
    a = np.array(mask_img).astype(np.float32) / 255.0
    n = rng.random((H // 4, W // 4)).astype(np.float32)
    n = np.array(Image.fromarray((n * 255).astype(np.uint8))
                 .resize((W, H), Image.BICUBIC)).astype(np.float32) / 255.0
    speck = rng.random((H, W)).astype(np.float32)
    keep = ((n * 0.72 + speck * 0.28) > amount).astype(np.float32)
    return Image.fromarray((a * keep * 255).astype(np.uint8), 'L')


def halftone(size, colour, seed=1, dot=7, fade=1.0):
    """Corner dot-burst, as used on the supplied posters."""
    w, h = size
    layer = Image.new('L', size, 0)
    d = ImageDraw.Draw(layer)
    for y in range(0, h, dot):
        for x in range(0, w, dot):
            t = 1.0 - (x / w * 0.55 + y / h * 0.75)
            if t <= 0:
                continue
            r = max(0.0, (dot / 2.6) * t * fade)
            if r > 0.35:
                d.ellipse([x - r, y - r, x + r, y + r], fill=255)
    out = Image.new('RGBA', size, colour + (0,))
    out.putalpha(layer)
    return out


# ----------------------------------------------------------------- shapes
def chamfer(draw, box, fill, cut=10):
    x1, y1, x2, y2 = box
    draw.polygon([(x1 + cut, y1), (x2, y1), (x2 - cut, y2), (x1, y2)], fill=fill)


def arrow(draw, x, y, size, colour, weight=5):
    draw.line([(x, y), (x + size, y)], fill=colour, width=weight)
    draw.line([(x + size - size * 0.36, y - size * 0.30),
               (x + size, y), (x + size - size * 0.36, y + size * 0.30)],
              fill=colour, width=weight, joint='curve')


def fit(text, size, max_w, min_size=30):
    """Shrink until the string fits the column."""
    f = font(size)
    while f.getbbox(text)[2] > max_w and size > min_size:
        size -= 4
        f = font(size)
    return f


def wrap(text, size, max_w, min_size=40):
    """Break onto up to two lines, shrinking if a single word is still too wide."""
    words = text.split()
    for n in (1, 2):
        if n == 1:
            lines = [text]
        else:
            best, split = None, None
            for i in range(1, len(words)):
                a, b = ' '.join(words[:i]), ' '.join(words[i:])
                worst = max(len(a), len(b))
                if best is None or worst < best:
                    best, split = worst, (a, b)
            lines = list(split) if split else [text]
        f = font(size)
        if all(f.getbbox(l)[2] <= max_w for l in lines):
            return lines, f
    return lines, fit(max(lines, key=len), size, max_w, min_size)


# ----------------------------------------------------------------- map
def track_layer(svg_path, box_w, box_h, opacity=110):
    if not svg_path:
        return None
    p = os.path.join(HERE, svg_path.lstrip('/'))
    if not os.path.exists(p):
        return None
    try:
        import cairosvg
    except ImportError:
        return None
    svg = open(p, encoding='utf-8').read().replace('currentColor', '#ffffff')
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=box_w * 2)
    im = Image.open(io.BytesIO(png)).convert('RGBA')
    im.thumbnail((box_w, box_h), Image.LANCZOS)
    a = im.split()[3].point(lambda v: int(v * opacity / 255))
    im.putalpha(a)
    return im


# ----------------------------------------------------------------- poster
def poster(ev, venue, out_path, seed=None):
    seed = seed if seed is not None else abs(hash(ev['uuid'])) % 9999
    y, m, d = [int(x) for x in re.match(r'(\d{4})-(\d{2})-(\d{2})', ev['date']).groups()]

    img = background(seed)

    # corner dot bursts
    ht = halftone((300, 240), RED, seed)
    tr = ht.transpose(Image.FLIP_LEFT_RIGHT)
    bl = ht.transpose(Image.FLIP_TOP_BOTTOM)
    img.paste(tr, (W - 300, 0), tr)
    img.paste(bl, (0, H - 240), bl)

    # track map, behind everything else
    tl = track_layer(venue.get('map'), 410, 330, opacity=215)
    if tl:
        img.paste(tl, (W - tl.width - 74, H - tl.height - 132), tl)

    d_layer = ImageDraw.Draw(img)

    # red corner wedges
    d_layer.polygon([(0, 0), (168, 0), (0, 168)], fill=RED)
    d_layer.polygon([(W, H), (W - 168, H), (W, H - 168)], fill=RED)

    # thin inset border
    d_layer.rectangle([26, 26, W - 27, H - 27], outline=(104, 104, 104), width=1)

    # ---- date column, drawn to a mask so it can be distressed
    mask = Image.new('L', (W, H), 0)
    md = ImageDraw.Draw(mask)
    red_mask = Image.new('L', (W, H), 0)
    rd = ImageDraw.Draw(red_mask)

    x0 = 84
    md.text((x0, 46), '%02d' % d, font=font(470), fill=255)
    rd.text((x0, 495), MONTHS[m - 1], font=font(300), fill=255)
    md.text((x0, 812), str(y), font=font(205), fill=255)

    # ---- right column
    cx = 585
    col_w = W - cx - 96
    lines, vf = wrap(venue.get('short', venue.get('name', '')).upper(), 132, col_w)
    ty = 84
    for line in lines:
        md.text((cx, ty), line, font=vf, fill=255)
        ty += int(vf.size * 0.92)

    nlines, nf = wrap(ev['name'].upper(), 100, col_w)
    ty += 10
    for line in nlines:
        rd.text((cx, ty), line, font=nf, fill=255)
        ty += int(nf.size * 0.92)

    tag = font_bold(50)
    md.text((cx + 4, ty + 14), 'REAL CARS. REAL PEOPLE. REAL RACING.', font=tag, fill=210)
    ty += 74

    img.paste(Image.new('RGB', (W, H), WHITE), (0, 0), distress(mask, seed))
    img.paste(Image.new('RGB', (W, H), RED), (0, 0), distress(red_mask, seed + 5))

    # red divider between the two columns
    d_layer.rectangle([512, 80, 517, 940], fill=RED)

    # ---- status + buttons
    ty += 40
    label = 'ENTRIES OPEN' if ev.get('status') == 'open' else 'ENTRIES CLOSED'
    bf = font(66)
    tw = bf.getbbox(label)[2]
    chamfer(d_layer, (cx, ty, cx + tw + 70, ty + 94), WHITE, cut=13)
    d_layer.text((cx + 40, ty + 8), label, font=bf, fill=BASE)

    ty += 132
    for text, bg, fg in (('EVENT INFO', WHITE, BASE), ('ENTER NOW', RED, WHITE)):
        bw = max(430, bf.getbbox(text)[2] + 175)
        chamfer(d_layer, (cx, ty, cx + bw, ty + 96), bg, cut=13)
        d_layer.text((cx + 42, ty + 9), text, font=bf, fill=fg)
        arrow(d_layer, cx + bw - 124, ty + 48, 60, RED if bg == WHITE else WHITE, 6)
        ty += 120

    img.convert('RGB').save(out_path, quality=92, optimize=True)
    return out_path


# ----------------------------------------------------------------- registry
def load_registry():
    import importlib.util
    spec = importlib.util.spec_from_file_location('bebuild', os.path.join(HERE, 'build.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.VENUES, mod.VENUE


def load_events():
    """Pull ALL_EVENTS straight out of assets/be.js so there is one event list."""
    js = open(os.path.join(ASSETS, 'be.js'), encoding='utf-8').read()
    block = js[js.index('var ALL_EVENTS'):js.index('var EVENTS')]
    out = []
    for chunk in re.findall(r'\{(.*?)\}', block, re.S):
        ev = dict(re.findall(r"(\w+)\s*:\s*'([^']*)'", chunk))
        if ev.get('type') == 'enduro':
            out.append(ev)
    return out


if __name__ == '__main__':
    VENUES, VENUE = load_registry()
    events = load_events()
    print('Generating posters\n')
    for ev in events:
        v = VENUE.get(ev.get('venueSlug'), {})
        y, m, dd = re.match(r'(\d{4})-(\d{2})-(\d{2})', ev['date']).groups()
        slug = 'event-%s%s' % (MONTHS[int(m) - 1].lower(), dd)
        out = os.path.join(ASSETS, slug + '.jpg')
        poster(ev, v, out)
        print('  %-22s %s  %s' % (slug + '.jpg', ev['name'], v.get('short', '')))
        print('      poster:\'/assets/%s.jpg\'' % slug)
    print('\nDone. Paste the poster: lines into ALL_EVENTS in assets/be.js')

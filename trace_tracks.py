#!/usr/bin/env python3
"""Trace circuit maps to clean SVG for the venue cards."""
from PIL import Image
import numpy as np
from scipy import ndimage
import potrace

S8 = np.ones((3, 3), bool)


def despeckle(mask, erode=1, min_seed=300, guard=3):
    """Drop blobs (turn markers, chequered flags) that only touch the circuit by a
    hairline, without cutting the circuit itself. Erode to break the joins, keep the
    big pieces, then regrow inside the original while fencing off the discarded bits."""
    seed = ndimage.binary_erosion(mask, structure=S8, iterations=erode)
    lab, n = ndimage.label(seed, structure=S8)
    sizes = ndimage.sum(seed, lab, range(1, n + 1))
    keep = np.zeros_like(seed)
    drop = np.zeros_like(seed)
    for i, sz in enumerate(sizes, start=1):
        (keep if sz >= min_seed else drop)[lab == i] = True
    if not drop.any():
        return mask, np.zeros_like(mask)
    forbidden = ndimage.binary_dilation(drop, structure=S8, iterations=guard)
    allowed = mask & ~forbidden
    cur, prev = keep & allowed, None
    while not np.array_equal(cur, prev):
        prev = cur
        cur = ndimage.binary_dilation(cur, structure=S8) & allowed
    return cur, forbidden


def extract(src, thr=60, take=1, wipes=(), min_px=600, close=0, speck=None):
    a = np.array(Image.open(src).convert('L')).astype(int)
    ink = a < thr
    lab, n = ndimage.label(ink, structure=S8)
    sizes = ndimage.sum(ink, lab, range(1, n + 1))
    keep = np.argsort(sizes)[::-1][:take]
    m = np.zeros_like(ink)
    for i in keep:
        m |= (lab == i + 1)
    ys, xs = np.where(m)
    pad = 12
    m = m[max(0, ys.min() - pad):ys.max() + pad, max(0, xs.min() - pad):xs.max() + pad].copy()
    for (x1, y1, x2, y2) in wipes:
        m[y1:y2, x1:x2] = False
    lab2, n2 = ndimage.label(m, structure=S8)
    sz = ndimage.sum(m, lab2, range(1, n2 + 1))
    for i, s in enumerate(sz, start=1):
        if s < min_px:
            m[lab2 == i] = False
    forbidden = None
    if speck:
        m, forbidden = despeckle(m, **speck)
    if close:
        m = ndimage.binary_closing(m, structure=S8, iterations=close)
        if forbidden is not None:
            m &= ~forbidden          # don't let the repair regrow what we removed
    return m


def to_svg(mask, title, desc, out, turdsize=60):
    # potracer inverts on construction, so hand it the negative
    path = potrace.Bitmap(~mask).trace(turdsize=turdsize, alphamax=1.0,
                                       opticurve=True, opttolerance=0.3)
    H, W = mask.shape
    parts = []
    for curve in path:
        p = curve.start_point
        seg = 'M%.1f %.1f' % (p.x, p.y)
        for s in curve:
            e = s.end_point
            if s.is_corner:
                seg += 'L%.1f %.1fL%.1f %.1f' % (s.c.x, s.c.y, e.x, e.y)
            else:
                seg += 'C%.1f %.1f %.1f %.1f %.1f %.1f' % (
                    s.c1.x, s.c1.y, s.c2.x, s.c2.y, e.x, e.y)
        parts.append(seg + 'Z')
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" '
           'fill="currentColor" fill-rule="evenodd" role="img" aria-labelledby="ttl dsc">\n'
           '  <title id="ttl">%s</title>\n'
           '  <desc id="dsc">%s</desc>\n'
           '  <path id="circuit" d="%s"/>\n</svg>\n'
           % (W, H, title, desc, ' '.join(parts)))
    with open(out, 'w', encoding='utf-8') as f:
        f.write(svg)
    print('%-42s %dx%d  %3d subpaths  %8s bytes'
          % (out, W, H, len(parts), format(len(svg), ',')))


if __name__ == '__main__':
    U = '/mnt/user-data/uploads/'
    T = 'site/assets/tracks/'

    to_svg(extract(U + 'calder_map.png', take=2,
                   wipes=[(898, 12, 978, 80)], close=4),
           'Calder Park Raceway circuit map',
           'Outline of the 2.30 km Calder Park road course, with pit lane.',
           T + 'calder-park.svg')

    to_svg(extract(U + 'mallala_outline.png', take=1,
                   speck=dict(erode=1, min_seed=400, guard=2), close=4),
           'Mallala Motorsport Park circuit map',
           'Outline of the 2.56 km Mallala Motorsport Park circuit, chequered start\u002Ffinish line on the main straight.',
           T + 'mallala.svg')

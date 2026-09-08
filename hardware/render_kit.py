#!/usr/bin/env python3
"""Render the sculpted kit to one picture: every body in the same isometric view, the marker
painted as it looks after the wipe (dots and the ring outside the disc dark, the field light).
Pure Python; writes kit.svg (to --out, default next to this file). Convert to PNG with any browser."""
import math, os, sys, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_parts import normal
from render_preview import rot, LIGHT
import make_kit as K


def render(mesh, cx, cy, scale, painted, ax=-1.05, az=0.6):
    tris = []
    for a, b, c in mesh.tris:
        A, B, C = rot(a, ax, az), rot(b, ax, az), rot(c, ax, az)
        n = normal(A, B, C)
        if n[2] <= 0: continue
        depth = (A[2] + B[2] + C[2]) / 3
        shade = 0.35 + 0.65 * max(0.0, n[0]*LIGHT[0] + n[1]*LIGHT[1] + n[2]*LIGHT[2])
        pts = ' '.join('%.1f,%.1f' % (cx + P[0]*scale, cy - P[1]*scale) for P in (A, B, C))
        tris.append((depth, pts, shade, painted(a, b, c)))
    tris.sort(key=lambda t: t[0])
    out = []
    for _, pts, sh, dark in tris:
        if dark:
            r, g, b = int(30*sh + 8), int(34*sh + 10), int(44*sh + 14)
        else:
            r, g, b = int(140*sh + 60), int(190*sh + 50), int(215*sh + 40)
        col = '#%02x%02x%02x' % (min(255, r), min(255, g), min(255, b))
        out.append('<polygon points="%s" fill="%s" stroke="%s" stroke-width="0.35"/>' % (pts, col, col))
    return '\n'.join(out)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kit.svg'))
    ap.add_argument('--relief', default='deboss')
    args = ap.parse_args()
    names = list(K.DESIGNS)
    cols, cw, ch = 6, 250, 235
    rows = (len(names) + cols - 1) // cols
    W, H = cols * cw, rows * ch + 40
    body = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (W, H, W, H),
            '<rect width="100%%" height="100%%" fill="#0b1220"/>',
            '<text x="%d" y="26" fill="#8a97a8" font-family="sans-serif" font-size="13" text-anchor="middle" letter-spacing="3">THE RESIN KIT · MARKERS IN RELIEF (%s) · 70 mm BODIES</text>' % (W // 2, args.relief.upper())]
    for i, name in enumerate(names):
        kind, half, height, prof, tex, note = K.DESIGNS[name]
        m = K.build(name, args.relief)
        # after the wipe: for deboss the dots and the outer ring sit at the face plane (z = height) and the field 0.6 above;
        # for emboss the field is sunk and the dots and ring are at the plane. Either way the painted parts are at z == height.
        top = height
        painted = lambda a, b, c, top=top: all(abs(p[2] - top) < 1e-6 for p in (a, b, c))
        cx, cy = (i % cols) * cw + cw // 2, 40 + (i // cols) * ch + ch // 2 - 10
        m.tris = [tuple((p[0], p[1], p[2] - height / 2) for p in t) for t in m.tris]
        painted_shift = lambda a, b, c, h=height/2: painted(*[(p[0], p[1], p[2] + h) for p in (a, b, c)])
        body.append(render(m, cx, cy, 1.75, painted_shift))
        body.append('<text x="%d" y="%d" fill="#e6edf5" font-family="sans-serif" font-size="14" text-anchor="middle" letter-spacing="2">%s</text>' % (cx, cy + 92, name.upper()))
        body.append('<text x="%d" y="%d" fill="#8a97a8" font-family="sans-serif" font-size="10.5" text-anchor="middle">%s</text>' % (cx, cy + 108, note))
    body.append('</svg>')
    open(args.out, 'w').write('\n'.join(body))
    print('written', args.out, 'bodies', len(names))

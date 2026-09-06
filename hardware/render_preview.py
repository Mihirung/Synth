#!/usr/bin/env python3
"""Render the printed parts to an SVG (flat-shaded, painter's algorithm) for the docs.
Pure Python; no dependencies. Writes preview.svg next to this file."""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_parts import PARTS, normal

W, H = 1200, 460
LIGHT = (-0.4, 0.5, 0.75)
l = math.sqrt(sum(c*c for c in LIGHT)); LIGHT = tuple(c/l for c in LIGHT)


def rot(p, ax, az):
    x, y, z = p
    # around Z then tilt around X: a standard isometric-ish view
    x, y = x*math.cos(az) - y*math.sin(az), x*math.sin(az) + y*math.cos(az)
    y, z = y*math.cos(ax) - z*math.sin(ax), y*math.sin(ax) + z*math.cos(ax)
    return (x, y, z)


def render(mesh, cx, cy, scale, ax=-1.05, az=0.6):
    tris = []
    for a, b, c in mesh.tris:
        A, B, C = rot(a, ax, az), rot(b, ax, az), rot(c, ax, az)
        n = normal(A, B, C)
        if n[2] <= 0: continue                         # back face
        depth = (A[2] + B[2] + C[2]) / 3
        shade = 0.35 + 0.65 * max(0.0, n[0]*LIGHT[0] + n[1]*LIGHT[1] + n[2]*LIGHT[2])
        pts = ' '.join('%.1f,%.1f' % (cx + P[0]*scale, cy - P[1]*scale) for P in (A, B, C))
        tris.append((depth, pts, shade))
    tris.sort(key=lambda t: t[0])
    out = []
    for _, pts, sh in tris:
        r, g, b = int(120*sh + 40), int(200*sh + 30), int(230*sh + 20)
        col = '#%02x%02x%02x' % (min(255, r), min(255, g), min(255, b))
        out.append('<polygon points="%s" fill="%s" stroke="%s" stroke-width="0.4"/>' % (pts, col, col))
    return '\n'.join(out)


if __name__ == '__main__':
    parts = [('cube-60', 260, 250, 2.6), ('puck-70-round', 620, 260, 2.6), ('puck-70-hex', 960, 260, 2.6)]
    body = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (W, H, W, H),
            '<rect width="100%" height="100%" fill="#0b1220"/>']
    for name, cx, cy, sc in parts:
        m = PARTS[name][0]()
        # centre the puck meshes vertically (they sit on z=0..18)
        if name != 'cube-60':
            m.tris = [tuple((p[0], p[1], p[2]-9) for p in t) for t in m.tris]
        body.append(render(m, cx, cy, sc))
        body.append('<text x="%d" y="%d" fill="#c7d3e0" font-family="sans-serif" font-size="18" text-anchor="middle" letter-spacing="2">%s</text>' % (cx, H-30, name))
    body.append('</svg>')
    open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'preview.svg'), 'w').write('\n'.join(body))
    print('preview.svg written')

#!/usr/bin/env python3
"""Render the bodies kit to one picture: every body in the same isometric view, the codes painted as they look after the
wipe (dots and rings dark, fields light, the theme glyphs light). Writes bodies.svg (to --out); a browser makes the PNG."""
import math, os, sys, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_kit import render
from render_faces import shells_of
import make_kit as K


def painted_for(m):
    """painted = at a code face's plane (the dots and the ring), not raised to the field"""
    planes = [(f[3], K._dot(f[0], f[3])) for f, _ in getattr(m, 'faces', [])]
    def painted(a, b, c):
        for n, d in planes:
            if all(abs(p[0]*n[0] + p[1]*n[1] + p[2]*n[2] - d) < 1e-6 for p in (a, b, c)):
                return True
        return False
    return painted


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bodies.svg'))
    args = ap.parse_args()
    cols, cw, ch = 8, 250, 250
    rows = (len(K.KIT) + cols - 1) // cols
    W, H = cols * cw, rows * ch + 44
    body = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (W, H, W, H),
            '<rect width="100%%" height="100%%" fill="#0b1220"/>',
            '<text x="%d" y="26" fill="#8a97a8" font-family="sans-serif" font-size="13" text-anchor="middle" letter-spacing="3">THE BODIES KIT · EVERY FUNCTION ON 32 BODIES · A FACE IS A MODE, THE TURN IS THE CONTROL, THE SLIDER IS THE LEVEL</text>' % (W // 2)]
    for i, e in enumerate(K.KIT):
        m = K.body_of(e)
        cx, cy = (i % cols) * cw + cw // 2, 44 + (i // cols) * ch + ch // 2 - 14
        scale = 1.55 if e['shape'] == 'to' else 1.9
        body.append(render(shells_of(m), cx, cy, scale, painted_for(m)))
        shape = {'cube': 'cube · 6 faces', 'to': 'truncated octahedron · 8 faces', 'puck': 'two-sided puck'}[e['shape']]
        body.append('<text x="%d" y="%d" fill="#e6edf5" font-family="sans-serif" font-size="14" text-anchor="middle" letter-spacing="2">%s%s</text>' % (cx, cy + 96, e['body'].upper(), ' ×2' if e['twice'] else ''))
        body.append('<text x="%d" y="%d" fill="#8a97a8" font-family="sans-serif" font-size="10" text-anchor="middle">%s · %s</text>' % (cx, cy + 112, shape, e['theme']))
    body.append('</svg>')
    open(args.out, 'w').write('\n'.join(body))
    print('written', args.out, 'bodies', len(K.KIT))

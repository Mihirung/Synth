#!/usr/bin/env python3
"""Render the experimental many-faced set: a dodecahedron and the glyph cube in the isometric view, and one
face straight on so the corner glyphs can be seen. Writes kit-faces.svg (to --out); a browser makes the PNG."""
import math, os, sys, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_kit import render
import make_kit as K


def shells_of(m):
    w = K.Mesh(); w.tris = m.tris + [t for sh in getattr(m, 'shells', []) for t in sh.tris]; return w


def painted_for(m, top_faces):
    """painted = at a face plane (the dots and the ring), i.e. not raised to the field: distance along the face
    normal equals the face's inradius (within a hair) for any of the given (normal, inradius) pairs"""
    def painted(a, b, c):
        for n, ri in top_faces:
            if all(abs(p[0]*n[0] + p[1]*n[1] + p[2]*n[2] - ri) < 1e-6 for p in (a, b, c)):
                return True
        return False
    return painted


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kit-faces.svg'))
    args = ap.parse_args()
    W, H = 1500, 560
    body = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (W, H, W, H),
            '<rect width="100%" height="100%" fill="#0b1220"/>',
            '<text x="750" y="28" fill="#8a97a8" font-family="sans-serif" font-size="13" text-anchor="middle" letter-spacing="3">THE EXPERIMENTAL SET · TWELVE OBJECTS ON ONE DIE · THE OBJECT\'S GLYPH IN EVERY CORNER</text>']
    # 1. die 1 of the set, isometric
    die = K.d12_set()[0]
    faces = []
    phi = (1 + 5 ** 0.5) / 2
    for s1 in (-1, 1):
        for s2 in (-1, 1):
            for n in ((s1, 0, s2 * phi), (0, s1 * phi, s2), (s1 * phi, s2, 0)):
                faces.append((K.unit(n), 50.0))
    body.append(render(shells_of(die), 300, 290, 2.3, painted_for(die, faces)))
    body.append('<text x="300" y="520" fill="#e6edf5" font-family="sans-serif" font-size="14" text-anchor="middle" letter-spacing="2">D12 · DIE 1 OF 6 · 100 mm</text>')
    body.append('<text x="300" y="538" fill="#8a97a8" font-family="sans-serif" font-size="10.5" text-anchor="middle">osc sampler rec mic song water theremin drums harp marbles hum spheres</text>')
    # 2. the cube with glyphs
    cube = K.cube('osc')
    cf = [((0, 0, 1), 30.0), ((0, 0, -1), 30.0), ((1, 0, 0), 30.0), ((-1, 0, 0), 30.0), ((0, 1, 0), 30.0), ((0, -1, 0), 30.0)]
    body.append(render(shells_of(cube), 760, 290, 2.6, painted_for(cube, cf)))
    body.append('<text x="760" y="520" fill="#e6edf5" font-family="sans-serif" font-size="14" text-anchor="middle" letter-spacing="2">CUBE · FOUR FACES OF ONE OBJECT · 60 mm</text>')
    body.append('<text x="760" y="538" fill="#8a97a8" font-family="sans-serif" font-size="10.5" text-anchor="middle">the naive version: faces 1 to 4 of the oscillator, two blank</text>')
    # 3. one face straight on: the filter face of die 4, looking down its normal
    d4 = K.d12_set()[3]
    n0 = faces[0][0]
    # rotate so n0 points at the viewer: build a frame and re-express the mesh
    u = K.unit(K.cross(n0, (0, 0, 1)) if abs(n0[2]) < 0.9 else K.cross(n0, (1, 0, 0))); v = K.cross(n0, u)
    def flat(p): return (K._dot(p, u), K._dot(p, v), K._dot(p, n0))
    fm = K.Mesh(); fm.tris = [(flat(a), flat(b), flat(c)) for a, b, c in shells_of(d4).tris]
    painted_flat = lambda a, b, c: all(abs(p[2] - 50.0) < 1e-6 for p in (a, b, c))
    body.append(render(fm, 1230, 290, 3.6, painted_flat, ax=0.0, az=0.0))
    body.append('<text x="1230" y="520" fill="#e6edf5" font-family="sans-serif" font-size="14" text-anchor="middle" letter-spacing="2">ONE FACE, STRAIGHT ON</text>')
    body.append('<text x="1230" y="538" fill="#8a97a8" font-family="sans-serif" font-size="10.5" text-anchor="middle">the code in the middle, the object\'s glyph in the five corners, dark after the wipe</text>')
    body.append('</svg>')
    open(args.out, 'w').write('\n'.join(body))
    print('written', args.out)

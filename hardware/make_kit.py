#!/usr/bin/env python3
"""The Lumatable resin kit: every object as its own sculpted body, its marker in relief on top.

Pure Python, no dependencies. Every mesh is closed and watertight, in millimetres, Z up.

The marker is no longer a sticker in a pocket: the disc field, the id dots and the ring
around the disc are two levels of relief, 0.6 mm apart, so one wipe of paint colours the
code. Two schemes, pick the one that suits how you paint:

  deboss  the dots and the ring outside the disc are sunk. Flood the top with dark paint
          and wipe it flat: paint stays in the pits, the field wipes clean.  (default)
  emboss  the dots and the outer ring stand proud, the field is sunk. Roll or dab dark
          paint over the top: it touches only the raised parts.

Bodies are 70 mm across the top (64 mm for the square family) and 22-30 mm tall, with a flat
top for the marker, a flat bottom with a felt pocket, and sculpted sides that say what the
object is without a word on it: a wave for the oscillator, a coil for loops, a spool for the
recorder, a grille for the mic, a crown of sixteen studs for the sequencer, a funnel for the
filter, steps for the delay, a jagged star for drive, a bell for reverb, a twisted twin for
chorus, blocks for crush, a ring for the ring modulator, a slow wave for the LFO, a tapered
metronome for tempo, and a record for the song. The play tray has a drum, a triangular harp
with strings, a sphere with marble sockets, ripples for hum, a baton, a knurled knob, two
antennae, a bowl with rods, and Saturn.

Run:  python3 make_kit.py                 writes print/kit/*.stl (deboss)
      python3 make_kit.py --relief emboss --obj --out somewhere
      python3 make_kit.py --only osc,mic  a few bodies
      python3 make_kit.py --cube osc      a 60 mm cube: faces 1-4 of one object in relief, two blank
      python3 make_kit.py --hex key       a hexagonal puck for an advanced object
      python3 make_kit.py --round rec     a plain round puck for any object
"""
import math, os, re, sys, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_parts import Mesh, normal, polygon_radius

HERE = os.path.dirname(os.path.abspath(__file__))
MARK = dict(centre=0.11, headR=0.38, headDot=0.06, bitR=0.24, bitDot=0.045)   # fractions of the disc diameter, as in the instrument
NC = 96          # points round the disc and its rings (3.75 degrees: the 45 degree bit slots and the 22.5 degree sector edges land on the grid)
ND = 24          # points round a dot
N_SIDE = 72      # points round a body (5 degrees)
TAU = 2 * math.pi


def tuio_types():
    """the object list, read from the instrument so the ids stay in step"""
    try:
        html = open(os.path.join(HERE, '..', 'prototype', 'index.html'), encoding='utf-8').read()
        m = re.search(r"const TUIO_TYPES = \[(.*?)\];", html, re.S)
        return re.findall(r"'([a-z]+)'", m.group(1))
    except Exception:
        return ['osc','sampler','seq','filter','delay','mod','lfo','dist','reverb','rec','mic','tempo','chorus','crush',
                'key','tune','env','xpress','steps','euclid','chance','chain','scene','motion','warp','send','space','master','stems',
                'theremin','drums','harp','marbles','hum','conduct','air','water','spheres','song']


TYPES = tuio_types()


def marker_id(type_, variant=0):
    return TYPES.index(type_) * 4 + variant


# ---------------------------------------------------------------- outlines
def outline(kind, a, half):
    """distance from the centre to the plan outline along angle a"""
    if kind == 'circle':
        return half
    if kind == 'square':
        return half / max(abs(math.cos(a)), abs(math.sin(a)))
    if kind == 'rsquare':                                   # a superellipse: a square with soft corners
        return half / (abs(math.cos(a))**4 + abs(math.sin(a))**4) ** 0.25
    if kind == 'hex':
        return polygon_radius(a, 6, half)
    if kind == 'oct':
        return polygon_radius(a, 8, half)
    if kind == 'tri':                                       # apothem = half, so the corners reach 2*half
        return min(polygon_radius(a, 3, half), half * 1.9)
    raise ValueError(kind)


# ---------------------------------------------------------------- triangulation helpers
def _unwrap(angles):
    out, prev, add = [], None, 0.0
    for a in angles:
        if prev is not None and a + add < prev - 1e-9:
            add += TAU
        out.append(a + add); prev = a + add
    return out


def strip(tri, A, angA, B, angB, closed=True):
    """triangulate the band between an outer loop A and an inner loop B, both anticlockwise and
    ordered by angle about a common point; angA/angB are their (unwrapped) angles"""
    nA, nB = len(A), len(B)
    if closed:
        i = j = 0
        endA, endB = nA, nB
        nextA = lambda k: angA[(k + 1) % nA] + (TAU if (k + 1) >= nA else 0)
        nextB = lambda k: angB[(k + 1) % nB] + (TAU if (k + 1) >= nB else 0)
        while i < endA or j < endB:
            advanceA = (i < endA) and (j >= endB or nextA(i) <= nextB(j) + 1e-9)
            if advanceA:
                tri(A[i % nA], A[(i + 1) % nA], B[j % nB]); i += 1
            else:
                tri(A[i % nA], B[(j + 1) % nB], B[j % nB]); j += 1
    else:
        i = j = 0
        while i < nA - 1 or j < nB - 1:
            advanceA = (i < nA - 1) and (j >= nB - 1 or angA[i + 1] <= angB[j + 1] + 1e-9)
            if advanceA:
                tri(A[i], A[i + 1], B[j]); i += 1
            else:
                tri(A[i], B[j + 1], B[j]); j += 1


def loop_by_angle(pts2, centre):
    """rotate a closed anticlockwise loop so it starts at its smallest angle about centre; return (loop, unwrapped angles)"""
    ang = [math.atan2(p[1] - centre[1], p[0] - centre[0]) % TAU for p in pts2]
    k = min(range(len(pts2)), key=lambda i: ang[i])
    pts2 = pts2[k:] + pts2[:k]
    ang = _unwrap(ang[k:] + ang[:k])
    return pts2, ang


# ---------------------------------------------------------------- the marker in relief
def marker_face(m, frame, ring_out, D, mid, relief='deboss', depth=0.6):
    """the top of a body: ring_out is the body's top loop (anticlockwise seen from outside, angles 2*pi*i/len).
    Builds the ring outside the disc (level zO), the disc field (zF) with the id dots (zD), and the walls."""
    o, u, v, n = frame
    P = lambda x, y, z: (o[0] + u[0]*x + v[0]*y + n[0]*z, o[1] + u[1]*x + v[1]*y + n[1]*z, o[2] + u[2]*x + v[2]*y + n[2]*z)
    tri = m.tri
    zO, zF, zD = (0.0, depth, 0.0) if relief == 'deboss' else (0.0, -depth, 0.0)   # the face plane is the outer ring; the field rises (deboss) or sinks (emboss)
    R = D / 2
    r0, r1, r2 = MARK['centre'] * D, 0.17 * D, 0.31 * D
    circ = lambda r, k, z: P(r * math.cos(TAU * k / NC), r * math.sin(TAU * k / NC), z)

    # the region outside the disc, between the body outline and the disc edge
    nO = len(ring_out)
    A = [(pt[0] + n[0]*zO, pt[1] + n[1]*zO, pt[2] + n[2]*zO) for pt in ring_out]   # the body's top loop, at the outer level
    angA = [TAU * i / nO for i in range(nO)]
    discO = [circ(R, k, zO) for k in range(NC)]
    angC = [TAU * k / NC for k in range(NC)]
    strip(tri, A, angA, discO, angC)
    # the disc edge wall
    discF = [circ(R, k, zF) for k in range(NC)]
    wall(tri, discF, discO, zF > zO)
    # the field, ring by ring
    c0 = [circ(r0, k, zF) for k in range(NC)]
    c1 = [circ(r1, k, zF) for k in range(NC)]
    c2 = [circ(r2, k, zF) for k in range(NC)]
    for k in range(NC):                                                   # annulus r0..r1
        j = (k + 1) % NC
        tri(c0[k], c1[k], c1[j]); tri(c0[k], c1[j], c0[j])
    # dots, in world coordinates: the image's y is mirrored (the sheet is seen from above)
    dots = []                                                            # (x, y, r)
    dots.append((MARK['headR'] * D, 0.0, MARK['headDot'] * D))
    for s in range(8):
        if (mid >> s) & 1:
            a = s * math.pi / 4
            dots.append((math.cos(a) * MARK['bitR'] * D, -math.sin(a) * MARK['bitR'] * D, MARK['bitDot'] * D))
    def dot_loop(x, y, r, z):
        return [P(x + r * math.cos(TAU * k / ND), y + r * math.sin(TAU * k / ND), z) for k in range(ND)]
    def sector(inner, outer, k0, k1, dot):
        """the field between two arcs (grid steps k0..k1, inclusive) with an optional dot inside"""
        loop = [outer[k % NC] for k in range(k0, k1 + 1)] + [inner[k % NC] for k in range(k1, k0 - 1, -1)]   # anticlockwise: out along the outer arc, back along the inner
        loop2 = [(pt[0] - o[0], pt[1] - o[1]) for pt in loop]           # face-plane coordinates (the face frame is axis-aligned here)
        if dot is None:
            cx = sum(p[0] for p in loop2) / len(loop2); cy = sum(p[1] for p in loop2) / len(loop2)
            c = P(cx, cy, zF)
            for i in range(len(loop)):
                tri(c, loop[i], loop[(i + 1) % len(loop)])
            return
        x, y, r = dot
        L, angL = loop_by_angle(loop, (x, y))
        Dl = dot_loop(x, y, r, zF)
        Dl2, angD = loop_by_angle(Dl, (x, y))
        strip(tri, L, angL, Dl2, angD)
        # the dot's wall and its floor/top
        Dz = dot_loop(x, y, r, zD)
        wall(tri, Dz, Dl, zD > zF)
        cz = P(x, y, zD)
        for i in range(ND):
            tri(cz, Dz[i], Dz[(i + 1) % ND])
    # the bit band r1..r2: eight sectors of 12 grid steps, centred on the slots
    bits = {}
    for s in range(8):
        if (mid >> s) & 1:
            a = s * math.pi / 4
            bits[(8 - s) % 8] = (math.cos(a) * MARK['bitR'] * D, -math.sin(a) * MARK['bitR'] * D, MARK['bitDot'] * D)
    for s in range(8):
        k0, k1 = s * 12 - 6, s * 12 + 6
        sector(c1, c2, k0, k1, bits.get(s))
    # the outer band r2..R: the heading sector and the rest
    sector(c2, discF, -6, 6, dots[0])
    rest_in = [c2[k % NC] for k in range(6, 91)]
    rest_out = [discF[k % NC] for k in range(6, 91)]
    for k in range(len(rest_in) - 1):
        tri(rest_in[k], rest_out[k], rest_out[k + 1]); tri(rest_in[k], rest_out[k + 1], rest_in[k + 1])
    # the centre dot
    c0z = [circ(r0, k, zD) for k in range(NC)]
    wall(tri, c0z, c0, zD > zF)
    cc = P(0, 0, zD)
    for k in range(NC):
        tri(cc, c0z[k], c0z[(k + 1) % NC])


def wall(tri, inner_level, outer_level, solid_inside=None):
    """a vertical wall between two rings of the same circle at different levels: `inner_level` is the ring at the
    level of the region inside the circle, `outer_level` at the level outside. With both rings anticlockwise seen
    from +n, (outer_i, outer_j, inner_j) faces away from the solid whichever ring is the higher one: a boss faces
    outward, a pit faces the axis."""
    n = len(inner_level)
    for i in range(n):
        j = (i + 1) % n
        tri(outer_level[i], outer_level[j], inner_level[j]); tri(outer_level[i], inner_level[j], inner_level[i])


# ---------------------------------------------------------------- bodies
def bump(x, c, w):
    return math.exp(-((x - c) / w) ** 2)


def abump(a, c, w):
    """a bump in angle, periodic"""
    d = (a - c + math.pi) % TAU - math.pi
    return math.exp(-(d / w) ** 2)


def body(name, kind, half, height, profile, tex=None, marker=None, relief='deboss', D=56.0, rings=32, steps=(), felt=(30.0, 1.0)):
    """a sculpted body: plan `kind` of half-size `half`, `height` tall; profile(z)->radius scale (1 at the top);
    tex(theta, z)->mm added to the radius; marker id on the flat top; a felt pocket underneath"""
    m = Mesh()
    zs = [height * k / rings for k in range(rings + 1)]
    for z in steps:                                  # a step: two rings at the same height
        zs += [z - 1e-4, z + 1e-4]
    zs = sorted(set(zs))
    ring_list = []
    for zi, z in enumerate(zs):
        s = profile(min(height, max(0.0, z)))
        ring = []
        for i in range(N_SIDE):
            a = TAU * i / N_SIDE
            r = outline(kind, a, half) * s
            if tex is not None and 0.0 < z < height - 1e-6:
                r += tex(a, z) * min(1.0, (height - z) / 1.5) * min(1.0, z / 1.5)   # textures fade out at the top and bottom edges
            ring.append((r * math.cos(a), r * math.sin(a), z))
        ring_list.append(ring)
    for k in range(len(ring_list) - 1):
        lo, hi = ring_list[k], ring_list[k + 1]
        for i in range(N_SIDE):
            j = (i + 1) % N_SIDE
            m.tri(lo[i], lo[j], hi[j]); m.tri(lo[i], hi[j], hi[i])
    # the top: the marker in relief
    top = ring_list[-1]
    marker_face(m, ((0, 0, height), (1, 0, 0), (0, 1, 0), (0, 0, 1)), top, D, marker, relief)
    # the bottom: flat, with a felt pocket, seen from below (flipped winding)
    bot = ring_list[0]
    pr, pd = felt
    pr = min(pr, 0.9 * min(math.hypot(p[0], p[1]) for p in bot))
    fin = [(pr * math.cos(TAU * i / N_SIDE), pr * math.sin(TAU * i / N_SIDE), 0.0) for i in range(N_SIDE)]
    ffl = [(p[0], p[1], pd) for p in fin]
    c = (0.0, 0.0, pd)
    flip = lambda a, b, c_: m.tri(a, c_, b)
    for i in range(N_SIDE):
        j = (i + 1) % N_SIDE
        flip(fin[i], bot[i], bot[j]); flip(fin[i], bot[j], fin[j])        # annulus, facing down
        flip(fin[i], fin[j], ffl[j]); flip(fin[i], ffl[j], ffl[i])        # pocket wall
        flip(c, ffl[i], ffl[j])                                           # pocket floor, facing down
    m.name = name
    return m


def cube(type_, size=60.0, D=52.0, relief='deboss', variants=(0, 1, 2, 3)):
    """a cube with four faces of one object in relief and two blank faces"""
    m, h = Mesh(), size / 2
    frames = [
        ((0, 0, h),  (1, 0, 0), (0, 1, 0), (0, 0, 1)),
        ((0, 0, -h), (0, 1, 0), (1, 0, 0), (0, 0, -1)),
        ((h, 0, 0),  (0, 1, 0), (0, 0, 1), (1, 0, 0)),
        ((-h, 0, 0), (0, 0, 1), (0, 1, 0), (-1, 0, 0)),
        ((0, h, 0),  (0, 0, 1), (1, 0, 0), (0, 1, 0)),
        ((0, -h, 0), (1, 0, 0), (0, 0, 1), (0, -1, 0)),
    ]
    for fi, (o, u, v, n) in enumerate(frames):
        P = lambda x, y, z: (o[0] + u[0]*x + v[0]*y + n[0]*z, o[1] + u[1]*x + v[1]*y + n[1]*z, o[2] + u[2]*x + v[2]*y + n[2]*z)
        ring = []
        for i in range(N_SIDE):
            a = TAU * i / N_SIDE
            t = outline('square', a, h)
            ring.append(P(t * math.cos(a), t * math.sin(a), 0))
        if fi < len(variants):
            marker_face_general(m, (o, u, v, n), ring, D, marker_id(type_, variants[fi]), relief)
        else:
            c = P(0, 0, 0)
            for i in range(N_SIDE):
                m.tri(c, ring[i], ring[(i + 1) % N_SIDE])
    m.name = 'cube-60-' + type_
    return m


def marker_face_general(m, frame, ring, D, mid, relief):
    """marker_face for any face frame: build in a local axis-aligned frame, then map the points"""
    o, u, v, n = frame
    local = Mesh()
    lring = [(_dot(sub(p, o), u), _dot(sub(p, o), v), 0.0) for p in ring]
    marker_face(local, ((0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1)), lring, D, mid, relief)
    for a, b, c in local.tris:
        m.tri(*(tuple(o[k] + u[k]*p[0] + v[k]*p[1] + n[k]*p[2] for k in range(3)) for p in (a, b, c)))


def sub(a, b): return (a[0]-b[0], a[1]-b[1], a[2]-b[2])
def _dot(a, b): return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]


def puck(type_, kind='hex', half=35.0, height=18.0, D=60.0, relief='deboss', variant=0):
    m = body('%s-70-%s' % (kind, type_), kind, half, height, lambda z: 1.0, None, marker_id(type_, variant), relief, D, rings=4)
    return m


# ---------------------------------------------------------------- the designs
def flat(z): return 1.0

DESIGNS = {
    # the yellow family: rounded squares
    'osc':     ('rsquare', 33, 26, flat, lambda a, z: 2.4 * bump(z, 13 + 5.0 * math.sin(6 * a), 2.2),                  'a wave runs round it'),
    'sampler': ('rsquare', 33, 26, flat, lambda a, z: -1.8 * bump(((z - 6.5 * a / TAU) % 6.5), 3.25, 1.3),                'a coil: the loop'),
    'rec':     ('rsquare', 33, 26, lambda z: 1 - 0.17 * math.sin(math.pi * z / 26) ** 2, None,                          'a spool'),
    'mic':     ('rsquare', 33, 26, lambda z: 1 + 0.08 * math.sin(math.pi * z / 26), lambda a, z: -1.3 * (math.sin(12 * a) * math.sin(TAU * z / 5.6)) ** 2 * 2, 'a grille of dimples'),
    'song':    ('circle',  35, 9,  flat, lambda a, z: 0.35 * math.sin(90 * a),                                          'a record: thin, milled edge'),
    'water':   ('circle',  35, 28, lambda z: 0.72 + 0.28 * (z / 28) ** 0.6, lambda a, z: sum(2.2 * abump(a, k * TAU / 10, 0.07) for k in range(10)) * (1 if z < 22 else 0), 'a bowl with ten rods'),
    'theremin':('rsquare', 33, 26, flat, lambda a, z: 3.4 * (abump(a, 0, 0.11) + abump(a, math.pi, 0.11)) + 1.6 * abump(a, math.pi / 2, 0.5) * bump(z, 13, 2.0), 'two antennae and a loop'),
    'drums':   ('circle',  35, 26, flat, lambda a, z: 1.8 * (bump(z, 23.5, 1.4) + bump(z, 2.5, 1.4)) + sum(1.6 * abump(a, k * math.pi / 4, 0.07) for k in range(8)), 'a drum with its rods'),
    'harp':    ('tri',     31, 24, flat, lambda a, z: 1.1 * max(0.0, math.sin(30 * a)) ** 0.5,                          'a triangle strung with ribs'),
    'marbles': ('circle',  35, 28, lambda z: 0.62 + 0.38 * math.sqrt(max(0.0, 1 - ((z - 16) / 17) ** 2)), lambda a, z: -sum(1.8 * abump(a, k * TAU / 5 + 0.3, 0.16) * bump(z, 12, 3) for k in range(5)), 'a sphere with marble sockets'),
    'hum':     ('rsquare', 33, 26, flat, lambda a, z: 1.5 * math.sin(TAU * math.hypot(33 * ((a + math.pi) % TAU - math.pi), z - 13) / 7.0), 'ripples from one point'),
    'spheres': ('circle',  35, 28, lambda z: 0.62 + 0.38 * math.sqrt(max(0.0, 1 - ((z - 16) / 17) ** 2)), lambda a, z: 3.0 * bump(z, 12.5, 1.5), 'Saturn'),
    # the green family: round
    'filter':  ('circle',  35, 24, lambda z: 0.7 + 0.3 * (z / 24) ** 1.5, None,                                         'a funnel'),
    'delay':   ('circle',  35, 24, lambda z: 1.0 if z > 16 else 0.86 if z > 8 else 0.72, None,                          'steps: echoes'),
    'dist':    ('circle',  35, 24, flat, lambda a, z: 3.2 * (2 * abs(((10 * a) / TAU) % 1.0 - 0.5) - 0.5),               'a jagged star'),
    'reverb':  ('circle',  35, 26, lambda z: 1 + 0.13 * (1 - z / 26) ** 2.5, None,                                      'a bell'),
    'chorus':  ('circle',  35, 26, flat, lambda a, z: 3.0 * math.sin(2 * a + 1.4 * z / 26 * math.pi),                   'a twisted twin'),
    'crush':   ('oct',     35, 24, flat, lambda a, z: -1.4 * ((int(z / 4.8) + int((a % TAU) / (math.pi / 6))) % 2),      'blocks'),
    'mod':     ('circle',  35, 26, flat, lambda a, z: 3.0 * bump(z, 13, 2.2),                                            'a ring'),
    # the purple family: hexagons
    'seq':     ('hex',     35, 26, flat, lambda a, z: 2.8 * max(0.0, math.cos(16 * a)) ** 6 * (1 if 14 < z < 22 else 0), 'a crown of sixteen studs'),
    'lfo':     ('hex',     35, 26, flat, lambda a, z: 2.6 * bump(z, 13 + 6.0 * math.sin(a), 2.6),                        'one slow wave'),
    'tempo':   ('hex',     35, 26, lambda z: 1.14 - 0.14 * z / 26, lambda a, z: 2.8 * abump(a, 0, 0.14) * (z / 26),      'a tapered metronome with its pendulum'),
    'conduct': ('hex',     35, 26, flat, lambda a, z: 2.6 * abump(a, 0.9 * (z / 26 - 0.5), 0.09),                       'a baton'),
    'air':     ('hex',     35, 22, flat, lambda a, z: 1.3 * abs(math.sin(30 * a)),                                       'a knurled knob'),
}
STEPS = {'delay': (8.0, 16.0)}


def build(name, relief='deboss'):
    kind, half, height, prof, tex, _ = DESIGNS[name]
    return body(name, kind, half, height, prof, tex, marker_id(name, 0), relief, D=56.0 if kind != 'tri' else 52.0, steps=STEPS.get(name, ()))


def write(m, out, obj=False):
    ok = m.watertight()
    vol = m.volume()
    m.stl(os.path.join(out, m.name + '.stl'), m.name)
    if obj:
        m.obj(os.path.join(out, m.name + '.obj'), m.name)
    print('%-22s %6d triangles %7.1f cm3  watertight=%s' % (m.name, len(m.tris), vol / 1000, ok))
    assert ok and vol > 0, m.name


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--relief', default='deboss', choices=['deboss', 'emboss'])
    ap.add_argument('--obj', action='store_true')
    ap.add_argument('--out', default=os.path.join(HERE, 'print', 'kit'))
    ap.add_argument('--only', default='')
    ap.add_argument('--cube', default='')
    ap.add_argument('--hex', default='')
    ap.add_argument('--round', default='')
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    made = False
    for t in [x for x in args.cube.split(',') if x]:
        write(cube(t, relief=args.relief), args.out, args.obj); made = True
    for t in [x for x in args.hex.split(',') if x]:
        write(puck(t, 'hex', relief=args.relief), args.out, args.obj); made = True
    for t in [x for x in args.round.split(',') if x]:
        write(puck(t, 'circle', relief=args.relief), args.out, args.obj); made = True
    if not made or args.only:
        names = [x for x in args.only.split(',') if x] or list(DESIGNS)
        for n in names:
            write(build(n, args.relief), args.out, args.obj)

#!/usr/bin/env python3
"""Generate the Lumatable tangible parts as binary STL and OBJ.

Pure Python, no dependencies. Every part is a closed, watertight triangle mesh:
  cube-60.stl        60 mm cube, a 53 mm x 0.8 mm marker pocket on all six faces
  puck-70-round.stl  70 mm round puck, 18 mm tall, marker pocket on top, felt pocket below
  puck-70-hex.stl    70 mm across-flats hexagonal puck (the advanced set), same pockets

Run:  python3 make_parts.py   (writes into ./print)
"""
import math, struct, os

N = 72                      # boundary samples per outline (5 deg): 0/45/60/90 deg all fall on the grid
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'print')


def polygon_radius(a, sides, apothem):
    """distance from centre to a regular polygon's edge along angle a (vertex at angle 0)"""
    step = 2 * math.pi / sides
    face = (math.floor(a / step) + 0.5) * step          # angle of the nearest face normal
    return apothem / math.cos(a - face)


def outline(kind, a, half):
    if kind == 'circle':
        return half
    if kind == 'square':
        return half / max(abs(math.cos(a)), abs(math.sin(a)))
    if kind == 'hex':
        return polygon_radius(a, 6, half)
    raise ValueError(kind)


class Mesh:
    def __init__(self):
        self.tris = []

    def tri(self, a, b, c):
        self.tris.append((a, b, c))

    def quad(self, a, b, c, d):
        self.tri(a, b, c)
        self.tri(a, c, d)

    # a flat face in the frame (o, u, v, n): the polygon outline minus a pocket disc,
    # the pocket wall, and the pocket floor. Winding is anticlockwise seen from +n.
    def face_with_pocket(self, o, u, v, n, kind, half, pr, pd, flip=False):
        tri = self.tri
        if flip:                                  # same sampling frame, mirrored winding (for a face whose n = -(u x v))
            tri = lambda a, b, c: self.tri(a, c, b)
        P = lambda x, y, z: (o[0] + u[0]*x + v[0]*y + n[0]*z,
                             o[1] + u[1]*x + v[1]*y + n[1]*z,
                             o[2] + u[2]*x + v[2]*y + n[2]*z)
        ring_out, ring_in, ring_floor = [], [], []
        for i in range(N):
            a = 2 * math.pi * i / N
            t = outline(kind, a, half)
            ring_out.append(P(t*math.cos(a), t*math.sin(a), 0))
            ring_in.append(P(pr*math.cos(a), pr*math.sin(a), 0))
            ring_floor.append(P(pr*math.cos(a), pr*math.sin(a), -pd))
        centre = P(0, 0, -pd)
        for i in range(N):
            j = (i + 1) % N
            # annulus between outline and pocket rim (normal +n)
            tri(ring_in[i], ring_out[i], ring_out[j])
            tri(ring_in[i], ring_out[j], ring_in[j])
            # pocket wall (normal toward the axis)
            tri(ring_in[i], ring_in[j], ring_floor[j])
            tri(ring_in[i], ring_floor[j], ring_floor[i])
            # pocket floor (normal +n)
            tri(centre, ring_floor[i], ring_floor[j])
        return ring_out

    def stl(self, path, name):
        with open(path, 'wb') as f:
            f.write(name.encode('ascii').ljust(80, b'\0'))
            f.write(struct.pack('<I', len(self.tris)))
            for a, b, c in self.tris:
                nx, ny, nz = normal(a, b, c)
                f.write(struct.pack('<12fH', nx, ny, nz, *a, *b, *c, 0))

    def obj(self, path, name):
        idx, verts, faces = {}, [], []
        for tri in self.tris:
            ids = []
            for p in tri:
                k = tuple(round(x, 5) for x in p)
                if k not in idx:
                    idx[k] = len(verts) + 1
                    verts.append(k)
                ids.append(idx[k])
            faces.append(ids)
        with open(path, 'w') as f:
            f.write('# Lumatable %s (mm)\no %s\n' % (name, name))
            for x, y, z in verts:
                f.write('v %.5f %.5f %.5f\n' % (x, y, z))
            for a, b, c in faces:
                f.write('f %d %d %d\n' % (a, b, c))

    def watertight(self):
        """every edge must be used exactly twice, once in each direction"""
        edges = {}
        key = lambda p: tuple(round(x, 5) for x in p)
        for a, b, c in self.tris:
            for p, q in ((a, b), (b, c), (c, a)):
                edges[(key(p), key(q))] = edges.get((key(p), key(q)), 0) + 1
        for (p, q), n in edges.items():
            if n != 1 or edges.get((q, p), 0) != 1:
                return False
        return True

    def volume(self):
        v = 0.0
        for a, b, c in self.tris:
            v += (a[0]*(b[1]*c[2]-b[2]*c[1]) - a[1]*(b[0]*c[2]-b[2]*c[0]) + a[2]*(b[0]*c[1]-b[1]*c[0])) / 6.0
        return v


def normal(a, b, c):
    ux, uy, uz = b[0]-a[0], b[1]-a[1], b[2]-a[2]
    vx, vy, vz = c[0]-a[0], c[1]-a[1], c[2]-a[2]
    nx, ny, nz = uy*vz-uz*vy, uz*vx-ux*vz, ux*vy-uy*vx
    l = math.sqrt(nx*nx+ny*ny+nz*nz) or 1.0
    return nx/l, ny/l, nz/l


def cube(size, pocket_r, pocket_d):
    m, h = Mesh(), size / 2
    # (origin, u, v, n) for the six faces; u x v = n so the outline winds anticlockwise from outside
    frames = [
        ((0, 0, h),  (1, 0, 0), (0, 1, 0), (0, 0, 1)),
        ((0, 0, -h), (0, 1, 0), (1, 0, 0), (0, 0, -1)),
        ((h, 0, 0),  (0, 1, 0), (0, 0, 1), (1, 0, 0)),
        ((-h, 0, 0), (0, 0, 1), (0, 1, 0), (-1, 0, 0)),
        ((0, h, 0),  (0, 0, 1), (1, 0, 0), (0, 1, 0)),
        ((0, -h, 0), (1, 0, 0), (0, 0, 1), (0, -1, 0)),
    ]
    for o, u, v, n in frames:
        m.face_with_pocket(o, u, v, n, 'square', h, pocket_r, pocket_d)
    return m


def puck(kind, half, height, top_r, top_d, bottom_r, bottom_d):
    m = Mesh()
    top = m.face_with_pocket((0, 0, height), (1, 0, 0), (0, 1, 0), (0, 0, 1), kind, half, top_r, top_d)
    bot = m.face_with_pocket((0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, -1), kind, half, bottom_r, bottom_d, flip=True)
    for i in range(N):
        j = (i + 1) % N
        m.tri(bot[i], bot[j], top[j])       # side wall, normal outward
        m.tri(bot[i], top[j], top[i])
    return m


PARTS = {
    'cube-60':        (lambda: cube(60, 26.5, 0.8),                          '60 mm cube, 53 mm marker pockets on all six faces'),
    'puck-70-round':  (lambda: puck('circle', 35, 18, 26.5, 0.8, 30, 1.0),   '70 mm round puck, 18 mm tall'),
    'puck-70-hex':    (lambda: puck('hex', 35, 18, 26.5, 0.8, 30, 1.0),      '70 mm across-flats hexagonal puck, 18 mm tall'),
}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, (build, desc) in PARTS.items():
        m = build()
        ok = m.watertight()
        m.stl(os.path.join(OUT, name + '.stl'), name)
        m.obj(os.path.join(OUT, name + '.obj'), name)
        print('%-15s %5d triangles  %7.1f cm3  watertight=%s  %s' % (name, len(m.tris), m.volume()/1000, ok, desc))
        assert ok, name + ' is not watertight'

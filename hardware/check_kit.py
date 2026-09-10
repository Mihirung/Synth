#!/usr/bin/env python3
"""Decode every code face of the bodies kit from its mesh, the way the camera will see it: the dots that stand at the
face plane (the painted level) are found as clusters of triangles in the face's own frame, and their positions are read
back as a marker id. A face that is mirrored, rotated or mislabelled fails here before anything is printed.
Pure Python.   python3 check_kit.py            (every body)      python3 check_kit.py lfo send    (some)"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_kit as K

TAU = 2 * math.pi


def decode_face(m, frame, D, relief='deboss'):
    """the id read from the dots on one face: returns (id, heading_ok, detail)"""
    o, u, v, n = frame
    R = D / 2
    level = 0.0                          # deboss: dots and the ring are at the face plane; the field stands 0.6 above
    # every dot is a fan of triangles at the painted level round one vertex: count how often each vertex is used
    count = {}
    for a, b, c in m.tris:
        loc = []
        for p in (a, b, c):
            d = K.sub(p, o)
            loc.append((K._dot(d, u), K._dot(d, v), K._dot(d, n)))
        if all(abs(q[2] - level) < 1e-6 for q in loc):
            for q in loc:
                if math.hypot(q[0], q[1]) < R - 0.5:
                    key = (round(q[0], 4), round(q[1], 4))
                    count[key] = count.get(key, 0) + 1
    dots = [k for k, c in count.items() if c >= 12]
    centre = [d for d in dots if math.hypot(*d) < 0.05 * D]
    head = [d for d in dots if abs(math.hypot(*d) - K.MARK['headR'] * D) < 0.03 * D]
    bits = [d for d in dots if abs(math.hypot(*d) - K.MARK['bitR'] * D) < 0.03 * D]
    if len(centre) != 1 or len(head) != 1:
        return -1, False, 'centre %d head %d bits %d' % (len(centre), len(head), len(bits))
    ha = math.atan2(head[0][1], head[0][0])
    mid = 0
    for bx, by in bits:
        a = (math.atan2(by, bx) - ha)            # relative to the heading, in the face frame (y up)
        s = round((-a % TAU) / (math.pi / 4)) % 8   # the sheet's y is mirrored: slot s sits at -s*45 degrees
        mid |= 1 << s
    return mid, abs(ha) < 1e-6, 'bits %d' % len(bits)


if __name__ == '__main__':
    want = sys.argv[1:]
    bad = 0; n = 0
    for e in K.KIT:
        if want and e['body'] not in want:
            continue
        m = K.body_of(e)
        D = 60.0 if e['shape'] == 'puck' else 52.0
        for frame, mid in m.faces:
            got, head_ok, info = decode_face(m, frame, D)
            t = K.TYPES.index(K.EXTRA[mid - len(K.TYPES) * 4][0]) if mid >= len(K.TYPES) * 4 else mid >> 2
            ok = got == mid and head_ok
            n += 1
            if not ok:
                bad += 1
            print('%-14s face id %3d  read %3d  %s  %s' % (m.name, mid, got, 'ok ' if ok else 'BAD', info))
    print('faces', n, 'bad', bad)
    sys.exit(1 if bad else 0)

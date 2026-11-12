"""Pack the viewer's base64 STL models into small binary meshes for the home page.

    python ederdrone/cad/src/pack_mesh.py

Reads ederdrone/cad/models/<name>.json, welds duplicate vertices, quantises positions to
uint16 and writes assets/models/<name>.bin:

    uint32 magic 'OCM1' | uint32 nVerts | uint32 nIndices | float32 min[3] | float32 size[3]
    uint16 positions[nVerts*3] | (pad to 4 bytes) | uint16 or uint32 indices[nIndices]

Indices are uint16 when nVerts <= 65535. Normals are not stored: the page shades flat.
"""
import base64, json, os, struct, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "models")
OUT = os.path.join(HERE, "..", "..", "..", "assets", "models")
NAMES = sys.argv[1:] or ["o30_frame", "o30_lid", "o30_deck"]

def pack(name):
    raw = base64.b64decode(json.load(open(os.path.join(SRC, name + ".json")))["stl"])
    n = struct.unpack_from("<I", raw, 80)[0]
    rec = np.frombuffer(raw, dtype=np.dtype([("n", "<f4", 3), ("v", "<f4", (3, 3)), ("a", "<u2")]), count=n, offset=84)
    v = rec["v"].reshape(-1, 3).astype(np.float64)
    lo, hi = v.min(0), v.max(0)
    size = np.where(hi - lo > 0, hi - lo, 1.0)
    q = np.round((v - lo) / size * 65535).astype(np.uint16)
    uniq, inv = np.unique(q, axis=0, return_inverse=True)
    tri = inv.reshape(-1, 3)
    tri = tri[(tri[:, 0] != tri[:, 1]) & (tri[:, 1] != tri[:, 2]) & (tri[:, 0] != tri[:, 2])]  # drop collapsed
    idx = tri.astype(np.uint16 if len(uniq) <= 65535 else np.uint32).ravel()
    head = struct.pack("<4sII3f3f", b"OCM1", len(uniq), len(idx), *lo.astype(np.float32), *size.astype(np.float32))
    pos = uniq.tobytes()
    pad = b"\0" * ((-(len(head) + len(pos))) % 4)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + ".bin")
    open(path, "wb").write(head + pos + pad + idx.tobytes())
    print("%-12s %6d tris -> %6d verts, %6d tris, %7d bytes (was %d)" % (name, n, len(uniq), len(tri), os.path.getsize(path), os.path.getsize(os.path.join(SRC, name + ".json"))))

for nm in NAMES:
    pack(nm)

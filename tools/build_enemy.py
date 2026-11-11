#!/usr/bin/env python3
"""Extrai a malha base do MakeHuman (CC0) usada pelo MiniBlender para o corpo do inimigo.

Lê ../Miniblender/assets/human.bin.gz (formato do MiniBlender: cabeçalho JSON + arrays,
alguns com bytes embaralhados) e grava assets/enemy_body.bin só com o que o jogo precisa:
  uint32 nV, uint32 nT, float32 pos[nV*3], float32 uv[nV*2], uint32 idx[nT*3], float32 joints (cabeça, pescoço, mãos)
Faces de olhos/ajudantes (fmat != 0) ficam de fora. UV por vértice = média dos cantos.
Uso: python3 tools/build_enemy.py [caminho/human.bin.gz]
"""
import gzip, json, struct, sys, os
from array import array
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, '..', 'Miniblender', 'assets', 'human.bin.gz')
b = gzip.open(src).read()
hl = struct.unpack('<I', b[:4])[0]; head = json.loads(b[4:4 + hl]); base = 4 + hl
T = {'float32': ('f', 4), 'uint16': ('H', 2), 'uint8': ('B', 1)}
def arr(name):
    m = head['arrays'][name]; code, sz = T[m['t']]; o = base + m['o']; n = m['n']
    if m.get('sh'):  # bytes embaralhados: primeiro todos os bytes baixos, depois os altos
        lo = b[o:o + n]; hi = b[o + n:o + 2 * n]; raw = bytes(x for p in zip(lo, hi) for x in p)
    else:
        raw = b[o:o + n * sz]
    a = array(code); a.frombytes(raw); return a
pos, quads, fmat, uv = arr('pos'), arr('quads'), arr('fmat'), arr('uv')
nV = len(pos) // 3; nF = head['nF']
us = [0.0] * nV; vs = [0.0] * nV; cnt = [0] * nV; tris = array('I')
for f in range(nF):
    if fmat[f] != 0: continue
    q = quads[4 * f:4 * f + 4]
    for k in range(4):
        v = q[k]; us[v] += uv[f * 8 + 2 * k] / 65535; vs[v] += uv[f * 8 + 2 * k + 1] / 65535; cnt[v] += 1
    tris.extend([q[0], q[1], q[2], q[0], q[2], q[3]])
uvo = array('f')
for v in range(nV):
    c = cnt[v] or 1; uvo.extend([us[v] / c, vs[v] / c])
joints = array('f')
for name in ['Cabeca', 'Pescoco', 'Mao_E', 'Mao_D', 'Peito']:
    ids = head['joints'][name]; x = y = z = 0
    for i in ids: x += pos[3 * i]; y += pos[3 * i + 1]; z += pos[3 * i + 2]
    joints.extend([x / len(ids), y / len(ids), z / len(ids)])
out = os.path.join(root, 'assets', 'enemy_body.bin')
with open(out, 'wb') as fo:
    fo.write(struct.pack('<II', nV, len(tris) // 3)); fo.write(pos.tobytes()); fo.write(uvo.tobytes()); fo.write(tris.tobytes()); fo.write(joints.tobytes())
print(out, nV, 'vértices', len(tris) // 3, 'triângulos', os.path.getsize(out) // 1024, 'KB')

'use strict';
/* Biblioteca de objetos do mapa. Cada função monta o objeto com várias peças (nada de "caixa
   pintada"), com variação aleatória de cor/desgaste/posição para não repetir, colisor simplificado
   e nível de detalhe. Vegetação e objetos muito repetidos usam InstancedMesh por célula. */
(function (OE) {
  const M = () => OE.MAT, D = OE.DEG;
  const rot = (x, z, yaw, lx, lz) => { const c = Math.cos(yaw), s = Math.sin(yaw); return { x: x + lx * c + lz * s, z: z - lx * s + lz * c }; };
  // "Local": desenha em coordenadas do objeto
  const PY = () => OE.PY || 0;            // piso base do setor (subsolo = -4,5)
  const OY = o => (o && o.y !== undefined ? o.y : PY());
  function L(b, x, z, yaw, y0) {
    y0 = y0 === undefined ? PY() : y0;
    return {
      box(m, lx, ly, lz, w, h, d, o) { const p = rot(x, z, yaw, lx, lz); o = Object.assign({}, o); o.yaw = yaw + (o.yaw || 0); b.box(m, p.x, y0 + ly, p.z, w, h, d, o); return this; },
      cyl(m, lx, ly, lz, rt, rb, h, seg, o) { const p = rot(x, z, yaw, lx, lz); o = Object.assign({}, o); o.yaw = yaw + (o.yaw || 0); b.cyl(m, p.x, y0 + ly, p.z, rt, rb, h, seg, o); return this; },
      geo(m, g, lx, ly, lz, o) { const p = rot(x, z, yaw, lx, lz); o = Object.assign({}, o); o.yaw = yaw + (o.yaw || 0); b.geo(m, g, p.x, y0 + ly, p.z, o); return this; },
      bar(m, a, c, t, o) { const pa = rot(x, z, yaw, a[0], a[2]), pc = rot(x, z, yaw, c[0], c[2]); b.bar(m, [pa.x, y0 + a[1], pa.z], [pc.x, y0 + c[1], pc.z], t, o); return this; },
      col(lx, ly, lz, w, h, d, tag) { const p = rot(x, z, yaw, lx, lz); return b.colBox(p.x, y0 + ly, p.z, w, h, d, yaw, tag); },
      p(lx, lz) { return rot(x, z, yaw, lx, lz); }, y0
    };
  }
  const P = {}; OE.Props = P; P.L = L; P.rot = rot;

  // ---------------- Caixas, barris, estantes ----------------
  P.crate = function (b, x, z, yaw, o) {
    o = o || {}; const s = o.s || 1, y = OY(o), m = o.mat || M().wood, l = L(b, x, z, yaw, y), t = 0.05 * s;
    l.box(m, 0, 0, 0, s, s, s, { col: false, tint: o.tint, lod: o.lod });
    // ripas e reforços em X nas faces
    [-1, 1].forEach(k => { l.box(m, 0, 0, k * (s / 2 + 0.01), s + 0.02, t * 1.6, 0.03, { col: false, lod: 'detail' }); l.box(m, 0, s - t * 1.6, k * (s / 2 + 0.01), s + 0.02, t * 1.6, 0.03, { col: false, lod: 'detail' });
      l.box(m, k * (s / 2 + 0.01), 0, 0, 0.03, t * 1.6, s + 0.02, { col: false, lod: 'detail' }); l.box(m, k * (s / 2 + 0.01), s - t * 1.6, 0, 0.03, t * 1.6, s + 0.02, { col: false, lod: 'detail' });
      l.box(m, 0, s / 2 - s * 0.6, k * (s / 2 + 0.012), s * 1.2, t * 1.2, 0.02, { rz: 45 * D * k, col: false, lod: 'clutter' }); });
    if (o.col !== false) l.col(0, 0, 0, s, s, s, 'prop');
    if (o.stencil) l.box(M().paint, 0, s * 0.4, s / 2 + 0.016, s * 0.5, s * 0.15, 0.005, { tint: 0x1a1a1a, col: false, lod: 'clutter' });
  };
  P.crateStack = function (b, x, z, yaw, n, o) {
    o = o || {}; const r = b.r; let y = OY(o);
    for (let i = 0; i < n; i++) { const s = (o.s || 1) * (0.85 + r() * 0.25); P.crate(b, x + (r() - 0.5) * 0.12, z + (r() - 0.5) * 0.12, yaw + (r() - 0.5) * 0.25, { s, y, tint: [0.8 + r() * 0.3, 0.8 + r() * 0.25, 0.8 + r() * 0.2] }); y += s; }
  };
  P.cardboard = function (b, x, z, yaw, o) {
    o = o || {}; const r = b.r, w = o.w || 0.45 + r() * 0.3, h = o.h || 0.3 + r() * 0.3, d = o.d || 0.35 + r() * 0.25, l = L(b, x, z, yaw, OY(o));
    l.box(M().cardboard, 0, 0, 0, w, h, d, { col: o.col !== false, lod: o.lod || 'detail', tag: 'prop' });
    if (r() < 0.5) { l.box(M().cardboard, -w / 4, h, 0, w / 2, 0.01, d, { rz: 0.5, col: false, lod: 'clutter' }); }
  };
  P.cardboardPile = function (b, x, z, n, o) { const r = b.r, y0 = OY(o); let y = y0; for (let i = 0; i < n; i++) { const h = 0.3 + r() * 0.25; P.cardboard(b, x + (r() - 0.5) * 0.3, z + (r() - 0.5) * 0.3, r() * 6, { y, h, col: i === 0 }); y += h; } if (n > 1) b.colBox(x, y0, z, 0.8, y - y0, 0.8, 0, 'prop'); };
  P.barrel = function (b, x, z, o) {
    o = o || {}; const r = b.r, y = OY(o), m = o.mat || (r() < 0.5 ? M().rust : r() < 0.5 ? M().metalBlue : M().metalRed);
    if (o.fallen) { b.cyl(m, x, y + 0.29, z, 0.29, 0.29, 0.88, 12, { rz: Math.PI / 2, yaw: o.yaw || r() * 6, lod: o.lod }); b.colBox(x, y, z, 0.88, 0.58, 0.58, o.yaw || 0, 'prop'); return; }
    b.cyl(m, x, y, z, 0.29, 0.29, 0.88, 12, { col: true, lod: o.lod, tag: 'prop' });
    [0.18, 0.7].forEach(h => b.cyl(M().iron, x, y + h, z, 0.3, 0.3, 0.04, 12, { lod: 'detail' }));
    b.cyl(M().iron, x, y + 0.88, z, 0.27, 0.27, 0.01, 12, { lod: 'detail' });
  };
  P.shelf = function (b, x, z, yaw, o) {
    o = o || {}; const w = o.w || 2, d = o.d || 0.5, h = o.h || 2.1, lv = o.levels || 4, m = o.mat || M().metalGray, l = L(b, x, z, yaw), r = b.r;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => l.box(m, i * (w / 2 - 0.02), 0, j * (d / 2 - 0.02), 0.04, h, 0.04, { col: false }));
    for (let k = 0; k < lv; k++) {
      const yy = 0.12 + k * (h - 0.2) / (lv - 1); l.box(m, 0, yy, 0, w, 0.025, d, { col: false });
      if (o.fill !== false) for (let q = -w / 2 + 0.2; q < w / 2 - 0.15; q += 0.2 + r() * 0.35) { if (r() < 0.3) continue;
        const kind = r(), bw = 0.15 + r() * 0.3, bh = Math.min(0.32, (h - 0.2) / (lv - 1) - 0.06) * (0.5 + r() * 0.5);
        const mat = kind < 0.45 ? M().cardboard : kind < 0.6 ? M().rust : kind < 0.75 ? M().paint : M().woodDark;
        l.box(mat, q, yy + 0.025, (r() - 0.5) * 0.1, bw, bh, d * 0.7, { col: false, lod: 'clutter', yaw: (r() - 0.5) * 0.3, tint: kind >= 0.6 && kind < 0.75 ? [0.3 + r() * 0.5, 0.3 + r() * 0.4, 0.3 + r() * 0.3] : undefined }); }
    }
    l.col(0, 0, 0, w, h, d, 'prop');
  };
  P.palletRack = function (b, x, z, yaw, len, o) {
    o = o || {}; const h = o.h || 5.4, d = 1.1, l = L(b, x, z, yaw), r = b.r, bays = Math.round(len / 2.7);
    for (let i = 0; i <= bays; i++) { const lx = -len / 2 + i * len / bays; [-1, 1].forEach(j => l.box(M().metalBlue, lx, 0, j * d / 2, 0.08, h, 0.08, { col: false }));
      for (let k = 0; k < 5; k++) l.bar(M().metalBlue, [lx, 0.3 + k * 1, -d / 2], [lx, 0.9 + k * 1, d / 2], 0.03, { lod: 'detail' }); }
    [1.4, 2.9, 4.4].forEach((yy, lev) => {
      [-1, 1].forEach(j => l.box(M().metalYellow, 0, yy, j * d / 2, len, 0.12, 0.06, { col: false }));
      for (let i = 0; i < bays; i++) { const cx = -len / 2 + (i + 0.5) * len / bays; if (r() < 0.25) continue;
        l.box(M().wood, cx, yy + 0.12, 0, 1.2, 0.12, 1.0, { col: false, lod: 'detail' });
        const k = r(); if (k < 0.5) l.box(M().cardboard, cx, yy + 0.24, 0, 1.1, 0.5 + r() * 0.5, 0.9, { col: false, lod: 'detail' });
        else if (k < 0.8) l.box(M().tarp, cx, yy + 0.24, 0, 1.15, 0.7, 0.95, { col: false, lod: 'detail', rx: (r() - 0.5) * 0.05 });
        else { l.cyl(M().rust, cx - 0.3, yy + 0.24, 0, 0.28, 0.28, 0.85, 10, { lod: 'detail' }); l.cyl(M().metalBlue, cx + 0.3, yy + 0.24, 0, 0.28, 0.28, 0.85, 10, { lod: 'detail' }); }
      }
    });
    // ao nível do chão: só o primeiro vão aberto embaixo (dá para se agachar e passar? não: travessas a 0,3 m)
    l.col(0, 0, 0, len, h, d, 'prop');
  };
  // ---------------- Móveis ----------------
  P.table = function (b, x, z, yaw, o) {
    o = o || {}; const w = o.w || 1.4, d = o.d || 0.8, h = o.h || 0.76, m = o.mat || M().woodDark, l = L(b, x, z, yaw, OY(o));
    l.box(m, 0, h - 0.04, 0, w, 0.04, d, { col: false });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => { l.box(m, i * (w / 2 - 0.06), 0, j * (d / 2 - 0.06), 0.06, h - 0.04, 0.06, { col: false }); });
    l.box(m, 0, h - 0.13, d / 2 - 0.05, w - 0.15, 0.08, 0.02, { col: false, lod: 'detail' }); l.box(m, 0, h - 0.13, -d / 2 + 0.05, w - 0.15, 0.08, 0.02, { col: false, lod: 'detail' });
    // colisor: só o tampo (dá para ficar embaixo) + pernas
    l.col(0, h - 0.2, 0, w, 0.2, d, 'furn');            // tampo + saia (aba) da mesa
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => { const p = l.p(i * (w / 2 - 0.06), j * (d / 2 - 0.06)); b.colCyl(p.x, p.z, 0.04, l.y0, l.y0 + h, 'furn'); });
    if (o.cloth) l.box(M().fabric, 0, h, 0, w + 0.1, 0.01, d + 0.1, { col: false, tint: o.cloth, lod: 'detail' });
  };
  P.chair = function (b, x, z, yaw, o) {
    o = o || {}; const m = o.mat || M().woodDark, l = L(b, x, z, yaw, OY(o));
    if (o.fallen) { l.box(m, 0, 0.02, 0, 0.44, 0.04, 0.44, { col: false, lod: 'detail', rx: 0.1 }); l.box(m, 0, 0.05, -0.3, 0.44, 0.04, 0.5, { col: false, lod: 'detail', rx: Math.PI / 2 - 0.1 }); return; }
    l.box(m, 0, 0.44, 0, 0.44, 0.04, 0.44, { col: false, lod: 'detail' });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => l.box(m, i * 0.19, 0, j * 0.19, 0.04, j < 0 ? 0.95 : 0.44, 0.04, { col: false, lod: 'detail' }));
    l.box(m, 0, 0.7, -0.2, 0.42, 0.22, 0.03, { col: false, lod: 'detail' });
    l.col(0, 0, 0, 0.44, 0.5, 0.44, 'furn');
  };
  P.stool = (b, x, z, o) => { b.cyl(M().woodDark, x, 0.6, z, 0.17, 0.17, 0.05, 10, { lod: 'detail' }); for (let i = 0; i < 3; i++) { const a = i * 2.09; b.cyl(M().woodDark, x + Math.cos(a) * 0.12, 0, z + Math.sin(a) * 0.12, 0.02, 0.02, 0.6, 5, { lod: 'detail' }); } b.colCyl(x, z, 0.18, 0, 0.62, 'furn'); };
  P.bench = function (b, x, z, yaw, o) {
    o = o || {}; const w = o.w || 1.8, m = o.mat || M().wood, l = L(b, x, z, yaw, OY(o)), park = o.park;
    l.box(m, 0, 0.42, 0, w, 0.05, park ? 0.45 : 0.32, { col: false });
    if (park) { l.box(m, 0, 0.62, -0.22, w, 0.14, 0.04, { col: false, rx: -0.15 }); l.box(m, 0, 0.8, -0.24, w, 0.14, 0.04, { col: false, rx: -0.15, lod: 'detail' });
      [-1, 1].forEach(i => { l.box(M().iron, i * (w / 2 - 0.1), 0, 0, 0.06, 0.45, 0.5, { col: false }); l.box(M().iron, i * (w / 2 - 0.1), 0.45, -0.24, 0.06, 0.5, 0.05, { col: false, lod: 'detail' }); }); }
    else[-1, 1].forEach(i => l.box(m, i * (w / 2 - 0.1), 0, 0, 0.05, 0.42, 0.3, { col: false }));
    l.col(0, 0.38, 0, w, 0.1, park ? 0.45 : 0.32, 'furn'); [-1, 1].forEach(i => { const p = l.p(i * (w / 2 - 0.1), 0); b.colCyl(p.x, p.z, 0.05, l.y0, l.y0 + 0.42, 'furn'); });
  };
  P.bed = function (b, x, z, yaw, o) {
    o = o || {}; const w = o.w || 1.0, d = o.d || 2.0, m = o.mat || M().iron, l = L(b, x, z, yaw, OY(o)), r = b.r, hy = o.hy || 0.45;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => l.box(m, i * (w / 2 - 0.03), 0, j * (d / 2 - 0.03), 0.05, j < 0 ? 1.0 : 0.75, 0.05, { col: false }));
    l.box(m, 0, hy - 0.08, 0, w, 0.06, d, { col: false }); l.box(m, 0, 0.6, -d / 2 + 0.03, w, 0.04, 0.04, { col: false, lod: 'detail' }); l.box(m, 0, 0.9, -d / 2 + 0.03, w, 0.04, 0.04, { col: false, lod: 'detail' });
    l.box(m, 0, 0.55, d / 2 - 0.03, w, 0.04, 0.04, { col: false, lod: 'detail' });
    l.box(M().mattress, 0, hy - 0.02, 0.02, w - 0.08, 0.16, d - 0.1, { col: false, rx: (r() - 0.5) * 0.02 });
    if (r() < 0.7) l.box(M().fabric, (r() - 0.5) * 0.2, hy + 0.14, d * 0.15, w - 0.02, 0.04, d * 0.6, { col: false, tint: [0.4 + r() * 0.3, 0.35 + r() * 0.25, 0.3 + r() * 0.2], rz: (r() - 0.5) * 0.1, yaw: (r() - 0.5) * 0.2, lod: 'detail' });
    if (r() < 0.6) l.box(M().fabric, 0, hy + 0.14, -d / 2 + 0.28, w * 0.6, 0.12, 0.35, { col: false, tint: 0xb8b0a0, lod: 'clutter' });
    l.col(0, hy - 0.1, 0, w, 0.32, d, 'furn');
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => { const p = l.p(i * (w / 2 - 0.03), j * (d / 2 - 0.03)); b.colCyl(p.x, p.z, 0.04, l.y0, l.y0 + 0.9, 'furn'); });
    return { clear: hy - 0.1 };
  };
  P.bunk = function (b, x, z, yaw, o) {
    o = o || {}; const w = 0.95, d = 2.0, l = L(b, x, z, yaw), m = M().iron, r = b.r;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => l.box(m, i * (w / 2 - 0.03), 0, j * (d / 2 - 0.03), 0.05, 1.9, 0.05, { col: false }));
    [0.38, 1.38].forEach((hy, k) => { l.box(m, 0, hy - 0.06, 0, w, 0.05, d, { col: false }); l.box(M().mattress, 0, hy - 0.01, 0, w - 0.06, 0.14, d - 0.08, { col: false });
      if (r() < 0.6) l.box(M().fabric, 0, hy + 0.13, 0.2, w - 0.04, 0.03, d * 0.55, { col: false, tint: [0.3 + r() * 0.4, 0.3 + r() * 0.3, 0.3 + r() * 0.2], lod: 'detail' }); });
    for (let k = 0; k < 4; k++) l.box(m, w / 2 - 0.03, 0.55 + k * 0.28, d / 2 - 0.1, 0.03, 0.03, 0.3, { col: false, lod: 'detail' });
    l.col(0, 0.25, 0, w, 1.65, d, 'furn');
    return { clear: 0.27 };
  };
  P.nightstand = function (b, x, z, yaw, o) {
    o = o || {}; const l = L(b, x, z, yaw), m = M().woodDark;
    l.box(m, 0, 0, 0, 0.45, 0.6, 0.4, { col: false }); l.col(0, 0, 0, 0.45, 0.6, 0.4, 'furn');
    if (o.item !== undefined || o.drawer) { const p = l.p(0, 0.02); new OE.Drawer({ x: p.x, y: 0.42, z: p.z, yaw, w: 0.38, h: 0.12, d: 0.34, item: o.item, mat: m, name: 'gaveta do criado-mudo' }); }
    if (b.r() < 0.6) { const p = l.p(0.1, -0.05); b.cyl(M().iron, p.x, 0.6, p.z, 0.05, 0.07, 0.03, 8, { lod: 'clutter' }); b.cyl(M().paint, p.x, 0.63, p.z, 0.01, 0.01, 0.25, 4, { lod: 'clutter', tint: 0x444444 }); b.cyl(M().fabric, p.x, 0.83, p.z, 0.06, 0.11, 0.14, 8, { lod: 'clutter', tint: 0x9a7a50, open: true }); }
  };
  P.suitcase = function (b, x, z, yaw, o) { o = o || {}; const l = L(b, x, z, yaw, OY(o)), r = b.r, t = [0.25 + r() * 0.35, 0.18 + r() * 0.2, 0.12 + r() * 0.15];
    if (o.open) { l.box(M().paint, 0, 0, 0, 0.7, 0.1, 0.45, { col: false, tint: t, lod: 'detail' }); l.box(M().paint, 0, 0.05, -0.3, 0.7, 0.45, 0.06, { col: false, tint: t, rx: -0.4, lod: 'detail' }); l.box(M().fabric, 0, 0.08, 0, 0.6, 0.06, 0.38, { col: false, tint: [r(), r() * 0.8, r() * 0.6], lod: 'clutter' }); return; }
    l.box(M().paint, 0, 0, 0, 0.7, 0.22, 0.45, { col: false, tint: t, lod: 'detail' }); l.box(M().iron, 0, 0.22, 0, 0.2, 0.03, 0.03, { col: false, lod: 'clutter' }); };
  P.clothes = function (b, x, z, n, o) { const r = b.r; for (let i = 0; i < n; i++) b.box(M().fabric, x + (r() - 0.5) * 0.8, OY(o) + i * 0.02, z + (r() - 0.5) * 0.8, 0.3 + r() * 0.4, 0.025, 0.3 + r() * 0.5, { yaw: r() * 6, col: false, lod: 'clutter', tint: [0.2 + r() * 0.6, 0.15 + r() * 0.5, 0.15 + r() * 0.5] }); };
  P.rug = (b, x, z, yaw, w, d, tint) => b.box(M().fabric, x, 0.003, z, w, 0.012, d, { yaw, col: false, tint: tint || 0x6a3028, lod: 'detail', grime: false });
  P.papers = function (b, x, z, n, y) { const r = b.r; if (y === undefined) y = PY(); for (let i = 0; i < n; i++) b.box(M().paint, x + (r() - 0.5) * 1.6, (y || 0) + 0.004 + i * 0.001, z + (r() - 0.5) * 1.6, 0.21, 0.004, 0.29, { yaw: r() * 6, col: false, lod: 'clutter', tint: [0.75, 0.72, 0.62] }); };
  P.bottles = function (b, x, z, y, trap) {
    const r = b.r; for (let i = 0; i < 6; i++) { const fallen = r() < 0.5, px = x + (r() - 0.5) * 0.7, pz = z + (r() - 0.5) * 0.7;
      b.cyl(M().glass, px, (y || 0) + (fallen ? 0.035 : 0), pz, 0.035, 0.035, 0.24, 6, { lod: 'clutter', rz: fallen ? Math.PI / 2 : 0, yaw: r() * 6 });
      if (r() < 0.5) b.cyl(M().rust, px + 0.2, (y || 0), pz - 0.1, 0.033, 0.033, 0.12, 8, { lod: 'clutter', rz: r() < 0.5 ? Math.PI / 2 : 0 }); }
    if (trap !== false) new OE.NoiseTrap({ x, z, y: y || 0, sound: 'can' });
  };
  P.planks = function (b, x, z, n, o) { const r = b.r; for (let i = 0; i < n; i++) b.box(M().wood, x + (r() - 0.5) * 2, 0.02 + i * 0.03, z + (r() - 0.5) * 2, 0.15, 0.03, 1.2 + r() * 1.5, { yaw: r() * 6, rx: (r() - 0.5) * 0.15, col: false, lod: 'detail' }); };
  P.debris = function (b, x, z, r0) { const r = b.r; for (let i = 0; i < 8; i++) { const s = 0.06 + r() * 0.18; b.box(r() < 0.5 ? M().concrete : M().brick, x + (r() - 0.5) * r0, 0, z + (r() - 0.5) * r0, s * 1.4, s, s, { yaw: r() * 6, rx: r(), col: false, lod: 'clutter' }); } };
  P.poster = function (b, x, y, z, yaw, idx, s) { s = s || 1; const i = idx % 8; OE.quad(b, M().poster, x, y, z, 0.7 * s, 0.7 * s, yaw, [(i % 4) / 4, 1 - (Math.floor(i / 4) + 1) / 2, 0.25, 0.5], { rz: (b.r() - 0.5) * 0.12, lod: 'detail' }); };
  P.sign = function (b, x, y, z, yaw, idx, w) { w = w || 2.4; OE.quad(b, M().sign, x, y, z, w, w / 8 * 0.9, yaw, [0, 1 - (idx + 1) / 8, 1, 1 / 8], { lod: 'detail' }); };
  // ---------------- Camarim ----------------
  P.vanity = function (b, x, z, yaw, o) {
    o = o || {}; const w = o.w || 1.3, l = L(b, x, z, yaw), r = b.r;
    l.box(M().woodCream, 0, 0.72, 0, w, 0.05, 0.5, { col: false }); l.box(M().woodCream, -w / 2 + 0.25, 0, 0, 0.45, 0.72, 0.48, { col: false }); l.box(M().woodCream, w / 2 - 0.04, 0, 0, 0.04, 0.72, 0.48, { col: false });
    l.col(0, 0.7, 0, w, 0.07, 0.5, 'furn'); l.col(-w / 2 + 0.25, 0, 0, 0.45, 0.72, 0.48, 'furn');
    l.box(M().mirror, 0, 1.02, -0.22, w - 0.2, 0.85, 0.02, { col: false, grime: false });
    { const q = l.p(0, -0.209); OE.Mirrors.add({ x: q.x, y: l.y0 + 1.445, z: q.z, w: w - 0.2, h: 0.85, yaw }); }
    l.box(M().woodDark, 0, 0.95, -0.24, w, 0.06, 0.04, { col: false, lod: 'detail' }); l.box(M().woodDark, 0, 1.9, -0.24, w, 0.06, 0.04, { col: false, lod: 'detail' });
    [-1, 1].forEach(k => l.box(M().woodDark, k * (w / 2 - 0.03), 0.95, -0.24, 0.06, 1.0, 0.04, { col: false, lod: 'detail' }));
    // lâmpadas em volta do espelho: a maioria queimada, algumas piscando
    const bulbs = []; for (let i = 0; i < 6; i++) bulbs.push([-w / 2 + 0.03, 1.05 + i * 0.15], [w / 2 - 0.03, 1.05 + i * 0.15]); for (let i = 1; i < 6; i++) bulbs.push([-w / 2 + i * w / 6, 1.93]);
    bulbs.forEach(([bx, by], i) => { const p = l.p(bx, -0.2); const live = o.lit && i % 4 === 1; OE.Lights.add({ x: p.x, y: by, z: p.z, size: 0.035, color: 0xffe2b0, intensity: live ? 0.9 : 0, range: 5, mode: live ? (o.mode || 'flicker') : 'off', noLight: !live || i % 8 !== 1, group: o.group }); });
    // maquiagem, potes, perucas
    for (let i = 0; i < 7; i++) { const p = l.p((r() - 0.5) * (w - 0.3), 0.05 + (r() - 0.5) * 0.2); b.cyl(r() < 0.5 ? M().glass : M().paint, p.x, 0.77, p.z, 0.02 + r() * 0.03, 0.025 + r() * 0.03, 0.04 + r() * 0.12, 6, { lod: 'clutter', tint: [r(), r() * 0.5, r() * 0.5] }); }
    if (r() < 0.6) { const p = l.p(w / 4, 0.05); b.geo(M().fabric, OE.G.sphere(0.13, 8, 6), p.x, 0.86, p.z, { scale: [1, 0.8, 1], tint: r() < 0.5 ? 0x8a2a10 : 0x2a4a8a, lod: 'clutter' }); }
    if (o.drawerItem !== undefined) { const p = l.p(-w / 2 + 0.25, 0.04); new OE.Drawer({ x: p.x, y: 0.5, z: p.z, yaw, w: 0.38, h: 0.15, d: 0.4, item: o.drawerItem, mat: M().woodCream, name: 'gaveta da penteadeira' }); }
    P.chair(b, ...Object.values(l.p(0.15, 0.55)), yaw + Math.PI + (r() - 0.5) * 0.5, { fallen: o.chairFallen });
  };
  P.clothesRack = function (b, x, z, yaw, o) {
    o = o || {}; const w = o.w || 1.6, l = L(b, x, z, yaw), r = b.r;
    [-1, 1].forEach(k => { l.box(M().chrome, k * w / 2, 0, 0, 0.04, 1.7, 0.04, { col: false }); l.box(M().chrome, k * w / 2, 0, 0, 0.04, 0.04, 0.5, { col: false }); });
    l.bar(M().chrome, [-w / 2, 1.7, 0], [w / 2, 1.7, 0], 0.03, { round: true });
    for (let q = -w / 2 + 0.1; q < w / 2 - 0.05; q += 0.09 + r() * 0.08) {
      if (r() < 0.15) continue; const len = 0.8 + r() * 0.6, t = r() < 0.3 ? [0.6, 0.12, 0.1] : r() < 0.5 ? [0.85, 0.75, 0.3] : [0.15 + r() * 0.5, 0.15 + r() * 0.4, 0.2 + r() * 0.5];
      l.box(M().fabric, q, 1.68 - len, 0, 0.025, len, 0.42 + r() * 0.15, { col: false, tint: t, rz: (r() - 0.5) * 0.08, lod: 'detail' });
    }
    l.col(0, 0, 0, w, 1.75, 0.55, 'furn');
  };
  P.mannequin = function (b, x, z, yaw, o) {
    o = o || {}; const l = L(b, x, z, yaw), r = b.r;
    l.cyl(M().iron, 0, 0, 0, 0.18, 0.2, 0.04, 10); l.cyl(M().iron, 0, 0.04, 0, 0.02, 0.02, 0.95, 5);
    l.geo(M().fabric, OE.G.cyl(0.16, 0.12, 0.62, 10), 0, 1.25, 0, { tint: o.tint || [0.8, 0.75, 0.65] }); l.geo(M().fabric, OE.G.sphere(0.17, 10, 8), 0, 1.0, 0, { scale: [1, 0.55, 0.8], tint: o.tint || [0.8, 0.75, 0.65] });
    if (!o.headless) { l.geo(M().ceramic, OE.G.sphere(0.1, 10, 8), 0, 1.72, 0, { scale: [0.85, 1.15, 0.9] }); l.cyl(M().ceramic, 0, 1.56, 0, 0.04, 0.05, 0.08, 6); }
    if (o.ruff) l.geo(M().fabric, OE.G.torus(0.11, 0.035, 5, 14), 0, 1.58, 0, { rx: Math.PI / 2, tint: 0xd8d0c0 });
    b.colCyl(l.p(0, 0).x, l.p(0, 0).z, 0.2, l.y0, l.y0 + 1.8, 'prop');
  };
  // ---------------- Banheiro / cozinha / escritório ----------------
  P.sink = function (b, x, z, yaw) { const l = L(b, x, z, yaw); l.box(M().ceramic, 0, 0.78, 0, 0.55, 0.12, 0.42, { col: false }); l.cyl(M().ceramic, 0, 0, 0.02, 0.07, 0.09, 0.78, 8); l.box(M().chrome, 0, 0.9, -0.15, 0.05, 0.12, 0.05, { col: false, lod: 'clutter' }); l.box(M().chrome, 0, 1.0, -0.08, 0.03, 0.03, 0.16, { col: false, lod: 'clutter' }); l.box(M().mirror, 0, 1.2, -0.2, 0.5, 0.6, 0.015, { col: false, grime: false }); { const q = l.p(0, -0.192); OE.Mirrors.add({ x: q.x, y: l.y0 + 1.5, z: q.z, w: 0.5, h: 0.6, yaw }); } l.col(0, 0, 0, 0.55, 0.9, 0.42, 'furn'); };
  P.shower = function (b, x, z, yaw) { const l = L(b, x, z, yaw); l.cyl(M().chrome, 0, 0, -0.45, 0.015, 0.015, 2.1, 5); l.bar(M().chrome, [0, 2.1, -0.45], [0, 2.1, -0.2], 0.03); l.cyl(M().chrome, 0, 2.0, -0.2, 0.08, 0.04, 0.08, 8, { lod: 'clutter' }); l.box(M().tiles, 0, 0, 0, 0.9, 0.05, 0.9, { col: false, tint: 0x8a8a80 }); [-1, 1].forEach(k => l.box(M().tiles, k * 0.47, 0, 0, 0.06, 1.9, 0.95)); };
  P.counter = function (b, x, z, yaw, w, o) {
    o = o || {}; const l = L(b, x, z, yaw), r = b.r;
    l.box(M().woodCream, 0, 0, 0, w, 0.88, 0.6, { col: false }); l.box(M().tilesFloor, 0, 0.88, 0, w + 0.04, 0.04, 0.64, { col: false, tint: 0xa0a090 }); l.col(0, 0, 0, w, 0.92, 0.6, 'furn');
    for (let q = -w / 2 + 0.3; q < w / 2; q += 0.6) l.box(M().woodCream, q, 0.08, 0.305, 0.56, 0.72, 0.02, { col: false, lod: 'detail', yaw: r() < 0.15 ? 0.4 : 0 });
    for (let i = 0; i < 5; i++) { const p = l.p((r() - 0.5) * w, (r() - 0.5) * 0.3); b.cyl(r() < 0.5 ? M().rust : M().ceramic, p.x, 0.92, p.z, 0.05 + r() * 0.08, 0.05 + r() * 0.08, 0.05 + r() * 0.15, 8, { lod: 'clutter' }); }
    if (o.upper) { l.box(M().woodCream, 0, 1.5, -0.12, w, 0.7, 0.35, { col: false }); }
  };
  P.stove = function (b, x, z, yaw) { const l = L(b, x, z, yaw); l.box(M().metalGray, 0, 0, 0, 0.75, 0.9, 0.65); l.box(M().iron, 0, 0.9, 0, 0.73, 0.03, 0.63, { col: false }); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => l.cyl(M().iron, i * 0.18, 0.93, j * 0.16, 0.09, 0.09, 0.02, 10, { lod: 'clutter' })); l.box(M().iron, 0, 0.2, 0.33, 0.6, 0.5, 0.02, { col: false, lod: 'detail' }); l.cyl(M().rust, 0.15, 0.95, -0.12, 0.13, 0.11, 0.18, 10, { lod: 'clutter' }); };
  P.fridge = function (b, x, z, yaw) { const l = L(b, x, z, yaw); l.box(M().paint, 0, 0, 0, 0.75, 1.75, 0.7, { tint: 0xc8c4b4 }); l.box(M().paint, 0, 1.2, 0.36, 0.73, 0.01, 0.01, { col: false, tint: 0x555555 }); l.box(M().chrome, 0.3, 0.7, 0.37, 0.03, 0.4, 0.03, { col: false, lod: 'clutter' }); };
  P.desk = function (b, x, z, yaw, o) {
    o = o || {}; const l = L(b, x, z, yaw), r = b.r;
    P.table(b, x, z, yaw, { w: 1.5, d: 0.75, mat: M().woodDark, y: l.y0 });
    l.box(M().woodDark, 0.5, 0, 0, 0.45, 0.72, 0.7, { col: false }); l.col(0.5, 0, 0, 0.45, 0.72, 0.7, 'furn');
    if (o.item !== undefined || o.drawer) { const p = l.p(0.5, 0.03); new OE.Drawer({ x: p.x, y: l.y0 + 0.52, z: p.z, yaw, w: 0.38, h: 0.13, d: 0.55, item: o.item, mat: M().woodDark, name: 'gaveta da escrivaninha' }); }
    P.papers(b, l.p(-0.2, 0).x, l.p(-0.2, 0).z, 5, l.y0 + 0.76);
    const p = l.p(-0.4, -0.2); b.box(M().metalGray, p.x, l.y0 + 0.76, p.z, 0.3, 0.12, 0.22, { yaw, col: false, lod: 'clutter' }); // máquina de escrever
    if (r() < 0.7) P.chair(b, ...Object.values(l.p(-0.2, 0.7)), yaw + Math.PI + (r() - 0.5) * 0.7, { y: l.y0 });
  };
  P.fileCabinet = function (b, x, z, yaw) { const l = L(b, x, z, yaw); l.box(M().metalGray, 0, 0, 0, 0.48, 1.32, 0.62); for (let i = 0; i < 4; i++) l.box(M().chrome, 0, 0.2 + i * 0.32, 0.315, 0.12, 0.02, 0.02, { col: false, lod: 'clutter' }); if (b.r() < 0.4) l.box(M().metalGray, 0, 0.98, 0.45, 0.46, 0.28, 0.3, { col: false, lod: 'detail' }); };
  // ---------------- Iluminação ----------------
  P.ceilingLamp = function (b, x, y, z, o) { o = o || {}; b.cyl(M().iron, x, y - 0.5, z, 0.008, 0.008, 0.5, 4, { lod: 'detail' }); b.cyl(o.shade || M().metalGreen, x, y - 0.68, z, 0.06, 0.24, 0.18, 10, { open: true, lod: 'detail' });
    return OE.Lights.add(Object.assign({ x, y: y - 0.68, z, size: 0.05, color: 0xffd0a0, intensity: 1.3, range: 8 }, o)); };
  P.fluorescent = function (b, x, y, z, yaw, o) { o = o || {}; const l = L(b, x, z, yaw, y); l.box(M().metalGray, 0, -0.08, 0, 1.25, 0.06, 0.16, { col: false, lod: 'detail' });
    return OE.Lights.add(Object.assign({ x, y: y - 0.1, z, size: 0.03, stretch: 1, color: 0xd8f0ff, intensity: 1.1, range: 9, mode: 'flicker' }, o)); };
  P.wallLamp = function (b, x, y, z, yaw, o) { o = o || {}; const l = L(b, x, z, yaw, y); l.box(M().iron, 0, -0.05, 0.04, 0.1, 0.12, 0.08, { col: false, lod: 'detail' }); l.cyl(M().glass, 0, -0.06, 0.14, 0.06, 0.06, 0.12, 8, { lod: 'detail', open: true });
    const p = l.p(0, 0.14); return OE.Lights.add(Object.assign({ x: p.x, y: y, z: p.z, size: 0.045, color: 0xffc890, intensity: 1.0, range: 7 }, o)); };
  P.emergency = function (b, x, y, z, yaw, o) { const l = L(b, x, z, yaw, y); l.box(M().metalGray, 0, -0.06, 0.03, 0.2, 0.12, 0.06, { col: false, lod: 'detail' }); const p = l.p(0, 0.08);
    return OE.Lights.add(Object.assign({ x: p.x, y, z: p.z, size: 0.04, color: 0xff2010, intensity: 1.4, range: 7, mode: 'pulse', halo: 0.5 }, o)); };
  P.lampPost = function (b, x, z, o) {
    o = o || {}; const h = o.h || 4.5, r = b.r, lean = o.lean || 0;
    b.cyl(M().metalGreen, x, 0, z, 0.07, 0.11, h, 8, { col: true, rz: lean }); b.cyl(M().metalGreen, x, 0, z, 0.16, 0.18, 0.5, 8, { lod: 'detail', rz: lean });
    const ax = x + Math.sin(lean) * -h; b.bar(M().metalGreen, [ax, h, z], [ax + 0.6, h + 0.15, z], 0.05, { round: true, lod: 'detail' });
    b.cyl(M().metalGreen, ax + 0.6, h - 0.15, z, 0.08, 0.25, 0.25, 8, { open: true, lod: 'detail' });
    if (o.broken) { P.debris(b, x + 1, z + 0.5, 1); return null; }
    return OE.Lights.add({ x: ax + 0.6, y: h - 0.18, z, size: 0.08, color: o.color || 0xffb870, intensity: o.intensity || 1.6, range: o.range || 14, mode: o.mode || 'steady', halo: 1.4, group: o.group, needsPower: o.needsPower });
  };
  P.bulbString = function (b, a, c, sag, n, o) {
    o = o || {}; const pts = []; for (let i = 0; i <= n; i++) { const k = i / n; pts.push([OE.lerp(a[0], c[0], k), OE.lerp(a[1], c[1], k) - Math.sin(k * Math.PI) * sag, OE.lerp(a[2], c[2], k)]); }
    for (let i = 0; i < n; i++) b.bar(M().rubber, pts[i], pts[i + 1], 0.012, { lod: 'detail' });
    pts.forEach((p, i) => { if (i === 0 || i === n) return; const live = o.live && b.r() < o.live; OE.Lights.add({ x: p[0], y: p[1] - 0.06, z: p[2], size: 0.045, color: [0xff4040, 0xffd040, 0x40a0ff, 0x60ff60, 0xffffff][i % 5], intensity: live ? 0.5 : 0, range: 4, mode: live ? (o.mode || 'flicker') : 'off', noLight: !live || i % 4 !== 0, group: o.group, needsPower: o.needsPower }); });
  };
  // ---------------- Lixo / caçamba / contêiner (esconderijos improvisados) ----------------
  P.trashBin = function (b, x, z, yaw, o) {
    o = o || {}; const l = L(b, x, z, yaw), big = o.big;
    if (!big) { b.cyl(M().metalGray, x, 0, z, 0.27, 0.23, 0.85, 10, { col: true, tag: 'prop' }); b.cyl(M().iron, x, 0.85, z, 0.29, 0.29, 0.04, 10, { lod: 'detail' }); if (b.r() < 0.5) P.papers(b, x + 0.5, z, 3); return null; }
    // lixeira grande de rodinhas (cabe uma pessoa agachada)
    const W = 1.25, Dd = 1.05, Hh = 1.2, m = M().metalGreen;
    l.box(m, 0, 0.1, -Dd / 2, W, Hh, 0.04, { col: false }); l.box(m, 0, 0.1, Dd / 2, W, Hh, 0.04, { col: false }); [-1, 1].forEach(k => l.box(m, k * W / 2, 0.1, 0, 0.04, Hh, Dd, { col: false })); l.box(m, 0, 0.1, 0, W, 0.04, Dd, { col: false });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => l.cyl(M().rubber, i * 0.5, 0, j * 0.4, 0.06, 0.06, 0.1, 8, { lod: 'detail' }));
    const col = l.col(0, 0, 0, W, Hh + 0.12, Dd, 'hide');
    const back = l.p(0, -Dd / 2), lid = new THREE.Group(); lid.position.set(back.x, Hh + 0.1, back.z); lid.rotation.y = yaw; OE.addDyn(lid);
    const leaf = OE.partMesh(bb => bb.box(m, 0, 0, Dd / 2, W + 0.04, 0.04, Dd + 0.04)); lid.add(leaf); lid.updateMatrixWorld(true);
    return OE.Hiding.inside('trash', x, z, yaw, 0, { depth: Dd / 2, camY: 0.95, lid: leaf, exposure: 0.2, lidFn: k => { leaf.rotation.x = -k * 1.2; leaf.updateMatrix(); lid.updateMatrixWorld(true); } }) && (OE.Hiding.spots[OE.Hiding.spots.length - 1].colliders = [col]);
  };
  P.dumpster = function (b, x, z, yaw) {
    const l = L(b, x, z, yaw), W = 2.0, Dd = 1.3, Hh = 1.35, m = M().metalBlue;
    l.box(m, 0, 0.12, -Dd / 2, W, Hh, 0.05, { col: false }); l.box(m, 0, 0.12, Dd / 2, W, Hh * 0.9, 0.05, { col: false, rx: 0.08 }); [-1, 1].forEach(k => l.box(m, k * W / 2, 0.12, 0, 0.05, Hh, Dd, { col: false })); l.box(m, 0, 0.12, 0, W, 0.05, Dd, { col: false });
    [-1, 1].forEach(k => l.box(M().iron, k * (W / 2 + 0.05), 0.5, 0, 0.08, 0.15, Dd * 0.9, { col: false, lod: 'detail' }));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => l.cyl(M().rubber, i * 0.8, 0, j * 0.5, 0.07, 0.07, 0.12, 8, { lod: 'detail' }));
    const col = l.col(0, 0, 0, W, Hh + 0.12, Dd, 'hide');
    const back = l.p(0, -Dd / 2), lid = new THREE.Group(); lid.position.set(back.x, Hh + 0.12, back.z); lid.rotation.y = yaw; OE.addDyn(lid);
    const leaf = OE.partMesh(bb => bb.box(M().rubber, 0, 0, Dd / 2, W, 0.05, Dd + 0.05)); lid.add(leaf); lid.updateMatrixWorld(true);
    const s = OE.Hiding.inside('dumpster', x, z, yaw, 0, { depth: Dd / 2, camY: 1.05, lid: leaf, exposure: 0.18, lidFn: k => { leaf.rotation.x = -k * 1.1; leaf.updateMatrix(); lid.updateMatrixWorld(true); } });
    s.colliders = [col]; return s;
  };
  P.container = function (b, x, z, yaw, o) {
    // contêiner de carga com uma porta aberta: dentro dá para se esconder no fundo, atrás de caixas
    o = o || {}; const l = L(b, x, z, yaw), W = 2.44, Lg = 6.06, Hh = 2.6, m = o.mat || M().metalRed, t = 0.06;
    l.box(m, 0, 0, -W / 2 + t / 2, Lg, Hh, t, { col: true }); l.box(m, 0, 0, W / 2 - t / 2, Lg, Hh, t, { col: true }); l.box(m, -Lg / 2 + t / 2, 0, 0, t, Hh, W, { col: true });
    l.box(m, 0, Hh - t, 0, Lg, t, W, { col: true }); l.box(M().wood, 0, 0, 0, Lg, 0.12, W - 0.1, { col: true, tag: 'wood' });
    for (let i = -Lg / 2 + 0.3; i < Lg / 2; i += 0.3) [-1, 1].forEach(k => l.box(m, i, 0.1, k * (W / 2 + 0.01), 0.1, Hh - 0.2, 0.03, { col: false, lod: 'detail' }));
    // portas: uma fechada, outra aberta a 100°
    l.box(m, Lg / 2, 0, -W / 4, t, Hh, W / 2, { col: true });
    const p = l.p(Lg / 2 + W / 4 * 0.2, W / 2 + W / 4 * 0.98); b.box(m, p.x, 0, p.z, W / 2, Hh, t, { yaw: yaw + 0.2, col: true });
    P.crateStack(b, ...Object.values(l.p(-Lg / 2 + 0.7, -0.5)), yaw, 2); P.cardboardPile(b, ...Object.values(l.p(1.0, -0.7)), 2);
    const s = OE.Hiding.behind('container', ...Object.values(l.p(-Lg / 2 + 0.6, 0.55)), yaw + Math.PI / 2, 0.12, { crouch: true, side: 0.0, cat: 'improvisado', exposure: 0.25 });
    s.entry = l.p(-Lg / 2 + 1.6, 0.6); s.pos.set(s.entry.x, 1, s.entry.z); s.cam.yaw = yaw - Math.PI / 2; s.cam.x = l.p(-Lg / 2 + 0.55, 0.65).x; s.cam.z = l.p(-Lg / 2 + 0.55, 0.65).z;
    return s;
  };
  P.tarpCovered = function (b, x, z, yaw, w, h, d, o) {
    // lona caída sobre um objeto: caixa subdividida deformada por ruído e "escorrida" para baixo
    o = o || {}; const key = 'tarp' + w + h + d + (o.seed || 0);
    const g = OE.G.custom(key, () => {
      const gg = new THREE.BoxGeometry(w, h, d, 8, 5, 8), p = gg.attributes.position, n = OE.makeNoise(o.seed || 3, 16);
      for (let i = 0; i < p.count; i++) { let px = p.getX(i), py = p.getY(i), pz = p.getZ(i); const top = (py + h / 2) / h;
        const k = 0.12 * (n(px * 3 + 9, pz * 3 + 5) - 0.5); px *= 1 + 0.08 * (1 - top); pz *= 1 + 0.08 * (1 - top); py += k * h; if (py > h / 2 - 0.05) py -= Math.abs(px * pz) * 0.08;
        p.setXYZ(i, px, Math.max(-h / 2, py), pz); }
      gg.computeVertexNormals(); return gg;
    });
    b.geo(o.mat || M().tarp, g, x, h / 2 + OY(o), z, { yaw, tint: o.tint || 0x5a6066, uvScale: 2 });
    b.colBox(x, OY(o), z, w, h, d, yaw, 'prop');
  };
  // ---------------- Veículos ----------------
  P.car = function (b, x, z, yaw, o) {
    o = o || {}; const l = L(b, x, z, yaw), m = o.mat || M().metalBlue, r = b.r;
    // perfil lateral de um sedã antigo (frente em +x)
    const prof = [[-2.3, 0.35], [2.25, 0.35], [2.35, 0.75], [1.4, 0.95], [0.8, 1.45], [-0.9, 1.5], [-1.6, 1.0], [-2.35, 0.9]];
    l.geo(m, OE.G.extrude('car', prof, 1.7, 0.05), 0, 0, 0, { uvScale: 0.5, tint: o.tint });
    // janelas escuras (parte do vidro quebrado)
    const win = [[0.72, 1.0], [1.3, 0.97], [0.78, 1.4], [-0.86, 1.45], [-1.5, 1.02]];
    [-1, 1].forEach(k => l.geo(M().glass, OE.G.extrude('carwin', win, 0.02), 0, 0, k * 0.87, { grime: false }));
    [[1.5, -1], [1.5, 1], [-1.5, -1], [-1.5, 1]].forEach(([wx, wz], i) => { const flat = r() < 0.4; l.cyl(M().rubber, wx, 0.36, wz * 0.82, 0.36, 0.36, 0.24, 14, { rx: Math.PI / 2, scale: flat ? [1, 1, 0.85] : undefined }); l.cyl(M().chrome, wx, 0.36, wz * 0.95, 0.18, 0.18, 0.03, 10, { rx: Math.PI / 2, lod: 'detail' }); });
    l.box(M().chrome, 2.35, 0.4, 0, 0.08, 0.15, 1.75, { col: false, lod: 'detail' }); l.box(M().chrome, -2.38, 0.4, 0, 0.08, 0.15, 1.75, { col: false, lod: 'detail' });
    [-0.6, 0.6].forEach(k => { l.cyl(M().glass, 2.33, 0.62, k, 0.09, 0.09, 0.05, 10, { rz: Math.PI / 2, lod: 'detail' }); });
    l.col(0, 0, 0, 4.7, 1.45, 1.75, 'prop');
    if (o.vines) for (let i = 0; i < 12; i++) l.box(M().leaves, (r() - 0.5) * 4, 0.1 + r() * 0.8, (r() - 0.5) * 1.8, 0.5, 0.5, 0.02, { yaw: r() * 3, col: false, lod: 'clutter', grime: false });
  };
  P.truck = function (b, x, z, yaw, o) {
    o = o || {}; const l = L(b, x, z, yaw), m = o.mat || M().metalRed;
    const cab = [[2.0, 0.6], [4.4, 0.6], [4.5, 1.4], [3.9, 1.6], [3.6, 2.5], [2.0, 2.5]];
    l.geo(m, OE.G.extrude('truckcab', cab, 2.2, 0.04), 0, 0, 0, { uvScale: 0.5 });
    l.geo(M().glass, OE.G.extrude('truckwin', [[3.65, 1.75], [3.85, 1.65], [3.62, 2.4], [3.0, 2.4], [3.0, 1.75]], 2.22), 0, 0, 0, { grime: false });
    // baú do caminhão de circo, pintado
    l.box(o.box || M().woodRed, -1.3, 0.8, 0, 6.4, 2.6, 2.4, { col: false }); l.box(M().woodCream, -1.3, 3.35, 0, 6.5, 0.1, 2.5, { col: false, lod: 'detail' });
    l.box(M().iron, 0.5, 0.45, 0, 8.0, 0.25, 1.4, { col: false });
    [[3.5, -1], [3.5, 1], [-2.5, -1], [-2.5, 1], [-3.6, -1], [-3.6, 1]].forEach(([wx, wz]) => l.cyl(M().rubber, wx, 0.5, wz * 1.0, 0.5, 0.5, 0.35, 14, { rx: Math.PI / 2 }));
    [-1, 1].forEach(k => P.poster(b, ...Object.values(l.p(-1.3, k * 1.22)), 2.0, yaw + (k > 0 ? 0 : Math.PI), (b.r() * 8) | 0, 2.4));
    l.col(0.2, 0, 0, 9.0, 3.4, 2.5, 'prop');
  };
  // ---------------- Jaulas ----------------
  P.cage = function (b, x, z, yaw, w, d, h, o) {
    o = o || {}; const l = L(b, x, z, yaw, OY(o)), sp = 0.16, r = b.r;
    const side = (ax, az, bx, bz, gap) => { const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / sp);
      for (let i = 0; i <= n; i++) { const k = i / n; if (gap && k > gap[0] && k < gap[1]) continue; const bent = r() < 0.04 ? 0.25 : 0; l.cyl(M().rust, OE.lerp(ax, bx, k), 0, OE.lerp(az, bz, k), 0.016, 0.016, h, 5, { lod: 'detail', rz: bent }); }
      const yawS = Math.atan2(-(bz - az), bx - ax);
      [0.05, h * 0.5, h - 0.05].forEach(yy => l.box(M().iron, (ax + bx) / 2, yy, (az + bz) / 2, len, 0.05, 0.05, { yaw: yawS - yaw, col: false }));
      if (!gap) { const p = l.p((ax + bx) / 2, (az + bz) / 2); b.colBox(p.x, l.y0, p.z, len, h, 0.1, yawS, 'cage').see = true; }
      else { const k0 = gap[0], k1 = gap[1]; [[0, k0], [k1, 1]].forEach(([u, v]) => { const mx = OE.lerp(ax, bx, (u + v) / 2), mz = OE.lerp(az, bz, (u + v) / 2), p = l.p(mx, mz); b.colBox(p.x, l.y0, p.z, len * (v - u), h, 0.1, yawS, 'cage').see = true; }); }
    };
    const hw = w / 2, hd = d / 2;
    side(-hw, -hd, hw, -hd); side(-hw, hd, hw, hd, o.door); side(-hw, -hd, -hw, hd); side(hw, -hd, hw, hd);
    if (o.roof !== false) { l.box(M().rust, 0, h, 0, w + 0.1, 0.05, d + 0.1, { col: false }); }
    if (o.floor) l.box(M().wood, 0, 0, 0, w, 0.1, d, { col: true, tag: 'wood' });
    if (o.straw) for (let i = 0; i < 10; i++) l.box(M().hay, (r() - 0.5) * w * 0.8, 0.1, (r() - 0.5) * d * 0.8, 0.6, 0.06, 0.4, { yaw: r() * 3, col: false, lod: 'clutter' });
  };
  P.cageWagon = function (b, x, z, yaw, o) {
    o = o || {}; const l = L(b, x, z, yaw), m = o.mat || M().woodRed, r = b.r;
    l.box(m, 0, 0.75, 0, 4.2, 0.25, 2.1, { col: false }); l.box(M().woodCream, 0, 3.15, 0, 4.4, 0.18, 2.3, { col: false }); l.box(m, 0, 3.33, 0, 4.0, 0.25, 2.0, { col: false, lod: 'detail' });
    [-1, 1].forEach(k => { l.box(m, k * 2.05, 1.0, 0, 0.12, 2.15, 2.1, { col: false }); });
    for (let i = -1.9; i <= 1.9; i += 0.18) [-1, 1].forEach(k => { if (o.open && k > 0 && i > -0.5 && i < 0.6) return; l.cyl(M().iron, i, 1.0, k * 1.0, 0.018, 0.018, 2.15, 5, { lod: 'detail' }); });
    [[1.4, -1], [1.4, 1], [-1.4, -1], [-1.4, 1]].forEach(([wx, wz]) => { l.cyl(M().woodDark, wx, 0.6, wz * 1.15, 0.6, 0.6, 0.1, 16, { rx: Math.PI / 2 }); for (let s = 0; s < 6; s++) l.bar(M().woodDark, [wx, 0.6, wz * 1.15], [wx + Math.cos(s) * 0.55, 0.6 + Math.sin(s) * 0.55, wz * 1.15], 0.04, { lod: 'clutter' }); });
    l.box(M().wood, 0, 1.0, 0, 3.9, 0.06, 1.9, { col: false }); if (o.straw !== false) for (let i = 0; i < 6; i++) l.box(M().hay, (r() - 0.5) * 3.4, 1.06, (r() - 0.5) * 1.5, 0.6, 0.05, 0.4, { yaw: r() * 3, col: false, lod: 'clutter' });
    l.col(0, 0, 0, 4.4, 3.4, 2.3, 'prop');
  };
  // ---------------- Equipamentos ----------------
  P.speaker = function (b, x, z, yaw, o) { o = o || {}; const l = L(b, x, z, yaw, OY(o)), h = o.h || 1.3; l.box(M().woodDark, 0, 0, 0, 0.7, h, 0.55, { tint: 0x444444 }); [0.35, 0.85].forEach(yy => { if (yy > h - 0.2) return; l.cyl(M().rubber, 0, yy, 0.28, 0.2, 0.16, 0.04, 14, { rx: Math.PI / 2, lod: 'detail' }); }); l.box(M().fabric, 0, h - 0.3, 0.28, 0.6, 0.2, 0.01, { col: false, tint: 0x222222, lod: 'detail' }); };
  P.spotFixture = function (b, x, y, z, yaw, pitch) { const l = L(b, x, z, yaw, y); l.box(M().iron, 0, 0, 0, 0.5, 0.06, 0.08, { col: false }); l.cyl(M().iron, 0, 0.05, 0, 0.17, 0.2, 0.55, 10, { rx: pitch || 0.9, lod: 'detail' }); l.cyl(M().glass, 0, 0.05, 0, 0.16, 0.16, 0.57, 10, { rx: pitch || 0.9, lod: 'clutter' }); };
  P.generatorProp = function (b, x, z, yaw) {
    const l = L(b, x, z, yaw);
    l.box(M().metalYellow, 0, 0.15, 0, 2.2, 1.3, 1.1); l.box(M().iron, 0, 0, 0, 2.5, 0.15, 1.3, { col: false }); l.cyl(M().iron, -0.6, 1.45, 0, 0.12, 0.12, 1.2, 8, { lod: 'detail' });
    l.cyl(M().rust, 0.7, 0.4, 0, 0.35, 0.35, 0.9, 12, { rz: Math.PI / 2, lod: 'detail' }); for (let i = 0; i < 6; i++) l.box(M().iron, -0.2 + i * 0.12, 0.5, 0.56, 0.06, 0.8, 0.02, { col: false, lod: 'clutter' });
    l.box(M().metalGray, 0.9, 1.0, 0.56, 0.4, 0.35, 0.05, { col: false, lod: 'detail' }); l.bar(M().rust, [-0.6, 2.6, 0], [-0.6, 2.9, -1.5], 0.16, { round: true, seg: 8 });
  };
  P.panel = function (b, x, y, z, yaw, o) { const l = L(b, x, z, yaw, y), r = b.r; l.box(M().metalGray, 0, 0, 0.1, 0.8, 1.2, 0.2, { col: false }); for (let i = 0; i < 8; i++) l.box(M().rubber, -0.28 + (i % 4) * 0.18, 0.25 + Math.floor(i / 4) * 0.35, 0.21, 0.06, 0.1, 0.03, { col: false, lod: 'clutter' }); if (r() < 0.5) l.box(M().metalGray, 0.6, 0, 0.35, 0.8, 1.2, 0.03, { col: false, yaw: -1.2, lod: 'detail' }); };
  P.pipes = function (b, pts, rad, o) { o = o || {}; for (let i = 0; i < pts.length - 1; i++) { b.bar(o.mat || M().rust, pts[i], pts[i + 1], rad * 2, { round: true, seg: 8, lod: o.lod || 'detail' }); if (i) b.geo(o.mat || M().rust, OE.G.sphere(rad * 1.25, 8, 6), pts[i][0], pts[i][1], pts[i][2], { lod: 'clutter' }); } };
  P.cables = function (b, pts) { for (let i = 0; i < pts.length - 1; i++) b.bar(M().rubber, pts[i], pts[i + 1], 0.025, { round: true, lod: 'clutter' }); };
  P.hay = function (b, x, z, yaw, o) { o = o || {}; const l = L(b, x, z, yaw, OY(o)); l.box(M().hay, 0, 0, 0, 1.0, 0.5, 0.5, { tag: 'prop' }); for (let i = 0; i < 2; i++) l.box(M().fabric, 0, -0.005 + 0, (i - 0.5) * 0.25, 1.02, 0.51, 0.015, { col: false, tint: 0x6a5a30, lod: 'clutter' }); };

  /* ---------------- Vegetação instanciada (grama alta, árvores) ---------------- */
  const V = {}; OE.Veg = V;
  V.grassGeo = () => OE.G.custom('grassX', () => { const a = new THREE.PlaneGeometry(1, 0.9); a.translate(0, 0.45, 0); const b2 = a.clone(); b2.rotateY(Math.PI / 2); const c = a.clone(); c.rotateY(Math.PI / 4);
    const g = new THREE.BufferGeometry(); ['position', 'normal', 'uv'].forEach(k => { const arrs = [a, b2, c].map(q => q.attributes[k].array); const out = new Float32Array(arrs.reduce((s, x) => s + x.length, 0)); let o = 0; arrs.forEach(x => { out.set(x, o); o += x.length; }); g.setAttribute(k, new THREE.BufferAttribute(out, k === 'uv' ? 2 : 3)); });
    const idx = []; [a, b2, c].forEach((q, i) => q.index.array.forEach(v => idx.push(v + i * 4))); g.setIndex(idx);
    // normais para cima: grama iluminada por igual
    const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(n.count * 3).fill(1), 3)); return g; });
  // Espalha tufos em retângulos; um InstancedMesh por célula de 24 m (culling e distância por pedaço)
  V.grass = function (def, rects, density, avoid, lodDist) {
    const r = OE.rng(def.name.length * 101 + rects.length), cells = new Map(), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P3 = new THREE.Vector3();
    rects.forEach(rc => { const n = Math.round((rc[2] - rc[0]) * (rc[3] - rc[1]) * density * OE.Q.grass);
      for (let i = 0; i < n; i++) { const x = OE.lerp(rc[0], rc[2], r()), z = OE.lerp(rc[1], rc[3], r()); if (avoid && avoid(x, z)) continue;
        const k = Math.floor(x / 24) + ',' + Math.floor(z / 24); if (!cells.has(k)) cells.set(k, []); cells.get(k).push([x, z, r()]); } });
    const meshes = [];
    for (const [k, list] of cells) {
      const geo = V.grassGeo().clone(), m = new THREE.InstancedMesh(geo, OE.MAT.grassBlades, list.length);
      let cx = 0, cz = 0; list.forEach(([x, z]) => { cx += x; cz += z; }); cx /= list.length; cz /= list.length; let rad = 0;
      const col = new THREE.Color();
      list.forEach(([x, z, s], i) => { const sc = 0.6 + s * 0.9; Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s * 31); S.set(sc * (0.8 + s * 0.4), sc, sc); P3.set(x, 0, z); M4.compose(P3, Q, S); m.setMatrixAt(i, M4); rad = Math.max(rad, Math.hypot(x - cx, z - cz));
        m.setColorAt(i, col.setRGB(0.75 + s * 0.35, 0.8 + s * 0.2, 0.7)); });
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, 0.5, cz), rad + 1.5);
      m.instanceMatrix.needsUpdate = true; m.userData = { lod: 'grass', lodDist: lodDist || OE.Q.grassDist, center: new THREE.Vector3(cx, 0.5, cz), radius: rad + 1 }; def.group.add(m); def.meshes.push(m); meshes.push(m);
    }
    return meshes;
  };
  // Árvore seca/viva: geometria montada uma vez, instanciada em todas as posições
  V.treeGeo = function (variant) {
    return OE.G.custom('tree' + variant, () => {
      const b = new OE.Builder('tree', null, OE.rng(variant * 13 + 5)), r = b.r, bark = { name: 'bark', userData: { tile: 1 } };
      const branch = (x, y, z, ang, tilt, len, rad, depth) => {
        const ex = x + Math.sin(tilt) * Math.cos(ang) * len, ey = y + Math.cos(tilt) * len, ez = z + Math.sin(tilt) * Math.sin(ang) * len;
        b.bar(bark, [x, y, z], [ex, ey, ez], rad * 2, { round: true, seg: depth < 2 ? 6 : 4 });
        if (depth < 3) { const n = depth === 0 ? 4 : 2 + (r() < 0.5 ? 1 : 0); for (let i = 0; i < n; i++) branch(ex, ey, ez, ang + (r() - 0.5) * 2.4 + i * 2, Math.min(1.3, tilt + 0.3 + r() * 0.5), len * (0.55 + r() * 0.2), rad * 0.6, depth + 1); }
      };
      branch(0, 0, 0, 0, 0.05 + r() * 0.1, 3.5 + variant * 0.8, 0.22, 0);
      const g = new THREE.Group(); b.finalize(g); return g.children[0].geometry;
    });
  };
  V.trees = function (def, list, opts) {
    opts = opts || {};
    [0, 1, 2].forEach(v => {
      const items = list.filter((t, i) => i % 3 === v); if (!items.length) return;
      const m = new THREE.InstancedMesh(V.treeGeo(v), OE.MAT.woodDark, items.length), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P3 = new THREE.Vector3();
      let cx = 0, cz = 0; items.forEach(t => { cx += t[0]; cz += t[1]; }); cx /= items.length; cz /= items.length; let rad = 0;
      items.forEach((t, i) => { const s = t[2] || 1; Q.setFromEuler(new THREE.Euler((t[3] || 0) * 0.1, i * 2.3, (t[3] || 0) * 0.08)); S.set(s, s, s); P3.set(t[0], 0, t[1]); M4.compose(P3, Q, S); m.setMatrixAt(i, M4); rad = Math.max(rad, Math.hypot(t[0] - cx, t[1] - cz));
        OE.world.cyl(t[0], t[1], 0.28 * s, 0, 3 * s, 'tree'); });
      m.geometry = m.geometry.clone(); m.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, 4, cz), rad + 9);
      m.userData = { lod: 'struct', lodDist: 1e9, center: new THREE.Vector3(cx, 4, cz), radius: rad + 9 }; def.group.add(m); def.meshes.push(m);
      // folhagem rala nas árvores vivas
      if (opts.leaves) {
        const leafItems = items.filter((t, i) => i % 2 === 0); if (!leafItems.length) return;
        const lg = OE.G.custom('leafClump', () => { const g = new THREE.IcosahedronGeometry(1.6, 1); const p = g.attributes.position, n = OE.makeNoise(5, 8); for (let i = 0; i < p.count; i++) { const k = 0.7 + 0.6 * n(p.getX(i) * 2 + 4, p.getZ(i) * 2 + p.getY(i)); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k); } g.computeVertexNormals(); g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(p.count * 3).fill(0.8), 3)); return g; });
        const lm = new THREE.InstancedMesh(lg, OE.MAT.leaves, leafItems.length * 3); let k = 0;
        leafItems.forEach((t, i) => { for (let j = 0; j < 3; j++) { const s = (t[2] || 1); P3.set(t[0] + Math.cos(j * 2.1 + i) * 1.4 * s, (4.2 + j * 0.8) * s, t[1] + Math.sin(j * 2.1 + i) * 1.4 * s); Q.setFromEuler(new THREE.Euler(0, j + i, 0)); S.set(s, s, s); M4.compose(P3, Q, S); lm.setMatrixAt(k++, M4); } });
        lm.geometry = lg.clone(); lm.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, 5, cz), rad + 10); lm.userData = { lod: 'detail', lodDist: 90, center: new THREE.Vector3(cx, 5, cz), radius: rad + 10 }; def.group.add(lm); def.meshes.push(lm);
      }
    });
  };
})(window.OE);

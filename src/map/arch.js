'use strict';
/* Arquitetura.
   plan(): compila uma planta (cômodos retangulares numa grade de 0,5 m) em paredes REAIS com
   espessura — cada face com o acabamento do seu cômodo (reboco, papel de parede, azulejo...),
   o lado de fora com o acabamento externo — vãos de porta com batente e porta funcional,
   janelas com peitoril, verga, caixilho e vidro (às vezes quebrado), pisos e tetos.
   Também: escadas com corrimão, guarda-corpos, telhados, cercas, colunas, treliças e o terreno
   (com buracos onde há escadas para o subsolo). */
(function (OE) {
  const A = {}; OE.Arch = A;
  const G = 0.5;
  const M = () => OE.MAT;

  A.plan = function (b, sp) {
    const y = sp.y || 0, H = sp.h || 3.2, T = sp.t || 0.22, rooms = sp.rooms;
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
    rooms.forEach(r => { x0 = Math.min(x0, r.r[0]); z0 = Math.min(z0, r.r[1]); x1 = Math.max(x1, r.r[2]); z1 = Math.max(z1, r.r[3]); });
    x0 -= G; z0 -= G; x1 += G; z1 += G;
    const nx = Math.round((x1 - x0) / G), nz = Math.round((z1 - z0) / G), cell = new Int16Array(nx * nz);
    rooms.forEach((r, i) => {
      for (let ix = Math.round((r.r[0] - x0) / G); ix < Math.round((r.r[2] - x0) / G); ix++)
        for (let iz = Math.round((r.r[1] - z0) / G); iz < Math.round((r.r[3] - z0) / G); iz++) cell[ix * nz + iz] = i + 1;
    });
    const C = (ix, iz) => (ix < 0 || iz < 0 || ix >= nx || iz >= nz ? 0 : cell[ix * nz + iz]);
    const room = id => (id ? rooms[id - 1] : null);
    const wallMat = id => { const r = room(id); return r ? (r.wall || sp.wall || M().plaster) : (sp.ext || M().plaster); };
    const wallTint = id => { const r = room(id); return r ? r.tint : sp.extTint; };
    const hOf = id => { const r = room(id); return r && r.h ? r.h : H; };
    const openings = (sp.doors || []).map(d => Object.assign({ type: 'door', w: 0.95, h: 2.1 }, d))
      .concat((sp.windows || []).map(w => Object.assign({ type: 'win', w: 1.2, h: 1.1, sill: 0.95 }, w)))
      .concat((sp.open || []).map(o => Object.assign({ type: 'open', w: 2, h: 2.6 }, o)));
    const segs = [];
    // linhas verticais (x constante): parede corre em z
    for (let ix = 0; ix <= nx; ix++) {
      let start = null, pair = null;
      for (let iz = 0; iz <= nz; iz++) {
        const a = C(ix - 1, iz), c = C(ix, iz), p = iz < nz && a !== c ? a + ',' + c : null;
        if (p !== pair) { if (pair) segs.push({ ax: 'z', at: x0 + ix * G, s: z0 + start * G, e: z0 + iz * G, a: +pair.split(',')[0], b: +pair.split(',')[1] }); pair = p; start = iz; }
      }
    }
    for (let iz = 0; iz <= nz; iz++) {
      let start = null, pair = null;
      for (let ix = 0; ix <= nx; ix++) {
        const a = C(ix, iz - 1), c = C(ix, iz), p = ix < nx && a !== c ? a + ',' + c : null;
        if (p !== pair) { if (pair) segs.push({ ax: 'x', at: z0 + iz * G, s: x0 + start * G, e: x0 + ix * G, a: +pair.split(',')[0], b: +pair.split(',')[1] }); pair = p; start = ix; }
      }
    }
    const made = { doors: [] };
    for (const s of segs) {
      if (s.a && s.b && (sp.noWallBetween || []).some(p => (p[0] === room(s.a).id && p[1] === room(s.b).id) || (p[1] === room(s.a).id && p[0] === room(s.b).id))) continue;
      const wh = Math.max(hOf(s.a), hOf(s.b));
      const ops = openings.filter(o => (s.ax === 'z' ? Math.abs(o.x - s.at) < 0.3 && o.z > s.s && o.z < s.e : Math.abs(o.z - s.at) < 0.3 && o.x > s.s && o.x < s.e))
        .map(o => Object.assign({ c: s.ax === 'z' ? o.z : o.x }, o)).sort((p, q) => p.c - q.c);
      let cur = s.s - T / 2;
      const end = s.e + T / 2;
      const piece = (from, to, yb, yt) => { if (to - from < 0.01 || yt - yb < 0.01) return; wallPiece(b, s, from, to, y + yb, yt - yb, T, wallMat(s.a), wallMat(s.b), wallTint(s.a), wallTint(s.b), sp); };
      for (const o of ops) {
        const oa = o.c - o.w / 2, ob = o.c + o.w / 2;
        piece(cur, oa, 0, wh);
        const top = o.type === 'win' ? o.sill + o.h : o.h;
        piece(oa, ob, top, wh);                                            // verga
        if (o.type === 'win') { piece(oa, ob, 0, o.sill); win(b, s, o, y, T, sp); }
        else { frame(b, s, o, y, T, sp); if (o.type === 'door' && o.door !== false) made.doors.push(door(s, o, y, sp));
          if (sp.nav !== false && !o.noNav) [-1, 1].forEach(k => { const q = along(s, o.c, k * 0.9); OE.Map.cand(q.x, y, q.z, { crawl: o.crawl }); }); }
        cur = ob;
      }
      piece(cur, end, 0, wh);
    }
    // pontos de navegação no meio dos cômodos (grade nos grandes)
    if (sp.nav !== false) rooms.forEach(r => { if (r.nav === false) return; const w = r.r[2] - r.r[0], d = r.r[3] - r.r[1], nx = Math.max(1, Math.round(w / 5)), nz = Math.max(1, Math.round(d / 5));
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) OE.Map.cand(r.r[0] + (i + 0.5) * w / nx, y, r.r[1] + (j + 0.5) * d / nz, { crawl: r.crawl }); });
    // pisos e tetos
    rooms.forEach(r => {
      const w = r.r[2] - r.r[0], d = r.r[3] - r.r[1], cx = (r.r[0] + r.r[2]) / 2, cz = (r.r[1] + r.r[3]) / 2;
      const fm = r.floor === undefined ? sp.floor : r.floor;
      if (fm) b.box(fm, cx, y - (sp.floorCol ? 0.3 : 0.01), cz, w, sp.floorCol ? 0.315 : 0.022, d, { col: !!sp.floorCol, grime: false, tag: r.floorTag || sp.floorTag });
      const cm = r.ceil === undefined ? sp.ceil : r.ceil;
      if (cm) b.box(cm, cx, y + (r.h || H), cz, w, 0.14, d, { grime: false, tint: 0x9a9488, skip: [] });
    });
    return made;
  };
  // meia parede para cada lado da linha (acabamentos diferentes)
  function wallPiece(b, s, from, to, yb, h, T, ma, mb, ta, tb, sp) {
    const len = to - from, mid = (from + to) / 2, q = T / 4;
    if (s.ax === 'z') {
      b.box(ma, s.at - q, yb, mid, T / 2, h, len, { tint: ta, col: false });
      b.box(mb, s.at + q, yb, mid, T / 2, h, len, { tint: tb, col: false });
      b.colBox(s.at, yb, mid, T, h, len, 0, sp.wallTag || 'wall');
    } else {
      b.box(ma, mid, yb, s.at - q, len, h, T / 2, { tint: ta, col: false });
      b.box(mb, mid, yb, s.at + q, len, h, T / 2, { tint: tb, col: false });
      b.colBox(mid, yb, s.at, len, h, T, 0, sp.wallTag || 'wall');
    }
    // rodapé de cimento do lado de fora
    if (sp.plinth !== false && yb < (sp.y || 0) + 0.05 && (!s.a || !s.b)) {
      const out = !s.a ? -1 : 1, off = out * (T / 2 + 0.02);
      if (s.ax === 'z') b.box(M().concreteDark, s.at + off, yb, mid, 0.04, 0.35, len, { col: false, lod: 'detail' });
      else b.box(M().concreteDark, mid, yb, s.at + off, len, 0.35, 0.04, { col: false, lod: 'detail' });
    }
  }
  function along(s, c, off) { return s.ax === 'z' ? { x: s.at + (off || 0), z: c } : { x: c, z: s.at + (off || 0) }; }
  function frame(b, s, o, y, T, sp) {
    const fm = o.frameMat || sp.frameMat || M().woodDark, t = 0.07, d = T + 0.06, yaw = s.ax === 'z' ? Math.PI / 2 : 0;
    [-1, 1].forEach(k => { const p = along(s, o.c + k * (o.w / 2 + t / 2 - 0.02)); b.box(fm, p.x, y, p.z, t, o.h, d, { yaw, col: false, lod: 'detail' }); });
    const p = along(s, o.c); b.box(fm, p.x, y + o.h, p.z, o.w + 0.1, t, d, { yaw, col: false, lod: 'detail' });
    if (o.sign !== undefined) { const q = along(s, o.c, (o.signSide || 1) * (T / 2 + 0.02)); OE.quad(b, M().sign, q.x, y + o.h + 0.3, q.z, 1.6, 0.2, yaw + (o.signSide === -1 ? Math.PI : 0), [0, 1 - (o.sign + 1) / 8, 1, 1 / 8]); }
  }
  function door(s, o, y, sp) {
    const yaw = s.ax === 'z' ? Math.PI / 2 : 0, d = o.door || {};
    return new OE.Door(Object.assign({ x: s.ax === 'z' ? s.at : o.c, z: s.ax === 'z' ? o.c : s.at, y, w: o.w, h: o.h - 0.02, yaw, hinge: d.hinge || -1,
      mat: d.mat || sp.doorMat, kind: d.kind || sp.doorKind || 'wood', name: d.name || 'porta' }, d));
  }
  function win(b, s, o, y, T, sp) {
    const yaw = s.ax === 'z' ? Math.PI / 2 : 0, fm = sp.frameMat || M().woodDark, yb = y + o.sill, r = b.r;
    const p = along(s, o.c);
    // caixilho
    [-1, 1].forEach(k => { const q = along(s, o.c + k * (o.w / 2 - 0.03)); b.box(fm, q.x, yb, q.z, 0.06, o.h, 0.12, { yaw, col: false, lod: 'detail' }); });
    b.box(fm, p.x, yb, p.z, o.w, 0.06, T + 0.1, { yaw, col: false, lod: 'detail' }); b.box(fm, p.x, yb + o.h - 0.06, p.z, o.w, 0.06, 0.12, { yaw, col: false, lod: 'detail' });
    b.box(fm, p.x, yb + o.h / 2, p.z, o.w, 0.04, 0.06, { yaw, col: false, lod: 'detail' }); b.box(fm, p.x, yb, p.z, 0.04, o.h, 0.06, { yaw, col: false, lod: 'detail' });
    // vidros: alguns quebrados (cacos pontiagudos) ou ausentes
    const panes = [[-1, 0], [1, 0], [-1, 1], [1, 1]];
    panes.forEach(([sx, sy]) => {
      const br = r(); const pw = o.w / 2 - 0.05, ph = o.h / 2 - 0.05, q = along(s, o.c + sx * o.w / 4);
      if (br < (o.broken || 0) * 0.5) return;                                                // sem vidro
      if (br < (o.broken || 0)) {                                                            // caco
        const g = OE.G.custom('shard' + (r() * 4 | 0), () => { const sh = new THREE.Shape(); sh.moveTo(-0.5, -0.5); sh.lineTo(0.5, -0.5); sh.lineTo(0.5, -0.1); sh.lineTo(0.1, 0.15); sh.lineTo(-0.2, -0.2); sh.lineTo(-0.5, 0.3); return new THREE.ShapeGeometry(sh); });
        b.geo(M().glass, g, q.x, yb + 0.03 + sy * o.h / 2 + ph / 2, q.z, { yaw, scale: [pw, ph, 1], lod: 'detail', grime: false }); return;
      }
      OE.quad(b, M().glass, q.x, yb + 0.03 + sy * o.h / 2 + ph / 2, q.z, pw, ph, yaw, null, { lod: 'detail' });
    });
    if (o.bars) for (let i = 1; i < 6; i++) { const q = along(s, o.c - o.w / 2 + i * o.w / 6, (o.bars) * (T / 2 + 0.05)); b.cyl(M().rust, q.x, yb, q.z, 0.012, 0.012, o.h, 5, { lod: 'detail' }); }
    // colisor do vão (não se atravessa janela), transparente para a visão
    const c = s.ax === 'z' ? b.colBox(s.at, yb, o.c, T, o.h, o.w, 0, 'glass') : b.colBox(o.c, yb, s.at, o.w, o.h, T, 0, 'glass'); c.see = true;
    // peitoril
    b.box(M().concreteDark, p.x, yb - 0.04, p.z, o.w + 0.15, 0.05, T + 0.12, { yaw, col: false, lod: 'detail' });
  }

  // ---------- Escada: degraus sólidos, rise <= 0,33 m. dir = [dx,dz] eixo da subida ----------
  A.stairs = function (b, o) {
    const n = Math.max(2, Math.ceil(Math.abs(o.y1 - o.y0) / 0.31)), rise = (o.y1 - o.y0) / n, run = o.run || 0.3, w = o.w || 1.2, mat = o.mat || M().concrete;
    const dx = o.dir[0], dz = o.dir[1], yaw = dx ? Math.PI / 2 : 0, low = Math.min(o.y0, o.y1) - 0.05;
    for (let i = 0; i < n; i++) {
      const cx = o.x + dx * (i + 0.5) * run, cz = o.z + dz * (i + 0.5) * run, top = o.y0 + rise * (i + 1);
      const bottom = o.solid === false ? top - 0.12 : low;
      b.box(mat, cx, bottom, cz, w, top - bottom, run + 0.01, { yaw, tag: o.tag || '', grime: false });
      if (o.nosing) b.box(M().iron, cx + dx * run * 0.45, top - 0.02, cz + dz * run * 0.45, w, 0.03, 0.04, { yaw, col: false, lod: 'clutter' });
    }
    const len = n * run, ex = o.x + dx * len, ez = o.z + dz * len;
    if (o.rails) o.rails.forEach(side => {
      const px = -dz * side * (w / 2 - 0.04), pz = dx * side * (w / 2 - 0.04);
      const a = [o.x + px, o.y0 + rise + 0.95, o.z + pz], c = [ex + px, o.y1 + 0.95, ez + pz];
      b.bar(o.railMat || M().iron, a, c, 0.045, { round: true, lod: 'detail' });
      for (let i = 0; i <= n; i += 3) { const k = i / n; b.cyl(o.railMat || M().iron, o.x + px + dx * len * k, o.y0 + rise * Math.max(1, i), o.z + pz + dz * len * k, 0.02, 0.02, 0.95, 5, { lod: 'detail' }); }
      // colisor inclinado aproximado por caixas
      for (let i = 0; i < n; i += 2) { const k = (i + 1) / n; b.colBox(o.x + px + dx * len * k, o.y0 + rise * (i + 1), o.z + pz + dz * len * k, dx ? run * 2 : 0.08, 1.0, dz ? run * 2 : 0.08, 0, 'rail').see = true; }
    });
    return { len, end: [ex, ez], n, rise };
  };
  // ---------- Guarda-corpo reto ----------
  A.railing = function (b, a, c, y, o) {
    o = o || {}; const mat = o.mat || M().iron, h = o.h || 1.0, len = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.round(len / (o.post || 1.5)));
    b.bar(mat, [a[0], y + h, a[1]], [c[0], y + h, c[1]], 0.05, { round: true, lod: o.lod || 'detail' });
    b.bar(mat, [a[0], y + h * 0.5, a[1]], [c[0], y + h * 0.5, c[1]], 0.03, { round: true, lod: 'detail' });
    for (let i = 0; i <= n; i++) { const k = i / n; if (o.broken && b.r() < o.broken && i > 0 && i < n) continue; b.cyl(mat, OE.lerp(a[0], c[0], k), y, OE.lerp(a[1], c[1], k), 0.025, 0.025, h, 5, { lod: o.lod || 'detail' }); }
    const yaw = Math.atan2(-(c[1] - a[1]), c[0] - a[0]);
    b.colBox((a[0] + c[0]) / 2, y, (a[1] + c[1]) / 2, len, h, 0.1, yaw, 'rail').see = true;
  };
  // ---------- Telhado de duas águas (cumeeira ao longo do eixo maior) ----------
  A.roofGable = function (b, x0, z0, x1, z1, y, rise, mat, o) {
    o = o || {}; const ov = o.over || 0.5, alongX = (x1 - x0) >= (z1 - z0) ? !o.flip : !!o.flip;
    const L = alongX ? x1 - x0 : z1 - z0, W = alongX ? z1 - z0 : x1 - x0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const half = W / 2 + ov, slope = Math.atan2(rise, W / 2), len = Math.hypot(half, rise * half / (W / 2));
    [-1, 1].forEach(sd => {
      const off = sd * half / 2, yy = y + rise / 2 - 0.1;
      if (alongX) b.box(mat, cx, yy - (ov * rise / W), cz + off, L + ov * 2, 0.12, len, { rx: sd * slope, col: false, tint: o.tint });
      else b.box(mat, cx + off, yy - (ov * rise / W), cz, len, 0.12, L + ov * 2, { rz: -sd * slope, col: false, tint: o.tint });
    });
    // empenas (triângulos)
    const tri = OE.G.extrude('gable' + W + ',' + rise, [[-W / 2, 0], [W / 2, 0], [0, rise]], 0.2);
    [-1, 1].forEach(sd => { if (alongX) b.geo(o.gableMat || o.wallMat || M().woodCream, tri, cx + sd * (L / 2 - 0.1), y, cz, { yaw: Math.PI / 2, uvScale: 0.4, tint: o.gableTint }); else b.geo(o.gableMat || o.wallMat || M().woodCream, tri, cx, y, cz + sd * (L / 2 - 0.1), { uvScale: 0.4, tint: o.gableTint }); });
    // cumeeira
    if (alongX) b.box(M().rust, cx, y + rise - 0.05, cz, L + ov * 2, 0.15, 0.3, { col: false }); else b.box(M().rust, cx, y + rise - 0.05, cz, 0.3, 0.15, L + ov * 2, { col: false });
  };
  A.roofFlat = function (b, x0, z0, x1, z1, y, mat, o) {
    o = o || {}; b.box(mat || M().concreteDark, (x0 + x1) / 2, y, (z0 + z1) / 2, x1 - x0 + 0.6, 0.25, z1 - z0 + 0.6, { col: false, tint: o.tint });
    b.box(M().concreteDark, (x0 + x1) / 2, y + 0.25, z0 - 0.2, x1 - x0 + 0.6, 0.4, 0.2, { col: false, lod: 'detail' }); b.box(M().concreteDark, (x0 + x1) / 2, y + 0.25, z1 + 0.2, x1 - x0 + 0.6, 0.4, 0.2, { col: false, lod: 'detail' });
  };
  // ---------- Cercas ----------
  A.chainFence = function (b, a, c, o) {
    o = o || {}; const h = o.h || 2.6, len = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.round(len / 3)), yaw = Math.atan2(-(c[1] - a[1]), c[0] - a[0]);
    for (let i = 0; i <= n; i++) { const k = i / n, x = OE.lerp(a[0], c[0], k), z = OE.lerp(a[1], c[1], k); b.cyl(M().rust, x, 0, z, 0.04, 0.045, h + 0.25, 6, { col: true, lod: 'detail' });
      if (o.barbed !== false) b.bar(M().rust, [x, h + 0.2, z], [x - Math.sin(yaw) * 0.35, h + 0.5, z - Math.cos(yaw) * 0.35], 0.03, { lod: 'clutter' }); }
    // tela (um plano por vão, com leve ondulação/inclinação)
    for (let i = 0; i < n; i++) {
      const k0 = i / n, k1 = (i + 1) / n, mx = OE.lerp(a[0], c[0], (k0 + k1) / 2), mz = OE.lerp(a[1], c[1], (k0 + k1) / 2), sl = len / n;
      if (o.gaps && o.gaps.indexOf(i) >= 0) continue;
      const lean = (b.r() - 0.5) * 0.08 + (o.lean || 0);
      b.box(M().chainlink, mx, 0.05, mz, sl, h - 0.05, 0.01, { yaw, rx: lean, col: false, lod: 'detail', grime: false });
    }
    b.bar(M().rust, [a[0], h, a[1]], [c[0], h, c[1]], 0.035, { round: true, lod: 'detail' });
    // colisor contínuo (menos os buracos)
    for (let i = 0; i < n; i++) { if (o.gaps && o.gaps.indexOf(i) >= 0) continue; const k0 = i / n, k1 = (i + 1) / n; b.colBox(OE.lerp(a[0], c[0], (k0 + k1) / 2), 0, OE.lerp(a[1], c[1], (k0 + k1) / 2), len / n, h, 0.12, yaw, 'fence').see = true; }
  };
  A.woodFence = function (b, a, c, o) {
    o = o || {}; const h = o.h || 1.3, len = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.round(len / 2.4)), yaw = Math.atan2(-(c[1] - a[1]), c[0] - a[0]), mat = o.mat || M().wood;
    for (let i = 0; i <= n; i++) { const k = i / n; b.box(mat, OE.lerp(a[0], c[0], k), 0, OE.lerp(a[1], c[1], k), 0.14, h + 0.1, 0.14, { yaw, lod: 'detail' }); }
    for (let i = 0; i < n; i++) {
      if (o.gaps && o.gaps.indexOf(i) >= 0) continue;
      const k = (i + 0.5) / n, mx = OE.lerp(a[0], c[0], k), mz = OE.lerp(a[1], c[1], k);
      [0.35, 0.8, h - 0.1].forEach((yy, j) => { if (b.r() < (o.broken || 0.08)) return; b.box(mat, mx, yy, mz, len / n + 0.1, 0.12, 0.04, { yaw, rz: (b.r() - 0.5) * 0.06, col: false, lod: 'detail' }); });
      b.colBox(mx, 0, mz, len / n, h, 0.12, yaw, 'fence').see = true;
    }
  };
  A.ironFence = function (b, a, c, o) {
    o = o || {}; const h = o.h || 2.2, len = Math.hypot(c[0] - a[0], c[1] - a[1]), yaw = Math.atan2(-(c[1] - a[1]), c[0] - a[0]), n = Math.round(len / 0.14);
    for (let i = 0; i <= n; i++) { const k = i / n; if (o.gaps && o.gaps.some(g => k >= g[0] && k <= g[1])) continue; b.cyl(M().iron, OE.lerp(a[0], c[0], k), 0, OE.lerp(a[1], c[1], k), 0.014, 0.014, h + (i % 2) * 0.12, 4, { lod: 'detail' }); }
    [0.15, h - 0.2].forEach(yy => b.bar(M().iron, [a[0], yy, a[1]], [c[0], yy, c[1]], 0.04, { lod: 'detail' }));
    b.colBox((a[0] + c[0]) / 2, 0, (a[1] + c[1]) / 2, len, h, 0.1, yaw, 'fence').see = true;
  };
  // ---------- Elementos estruturais ----------
  A.column = (b, x, z, y, h, o) => { o = o || {}; b.box(o.mat || M().concrete, x, y, z, o.w || 0.35, h, o.w || 0.35, { tag: o.tag }); };
  A.truss = function (b, a, c, y, depth, mat, o) {
    o = o || {}; const len = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(2, Math.round(len / 1.2));
    b.bar(mat, [a[0], y, a[1]], [c[0], y, c[1]], 0.09, { lod: o.lod || 'struct' }); b.bar(mat, [a[0], y + depth, a[1]], [c[0], y + depth, c[1]], 0.09, { lod: o.lod || 'struct' });
    for (let i = 0; i < n; i++) { const k0 = i / n, k1 = (i + 1) / n, p0 = [OE.lerp(a[0], c[0], k0), OE.lerp(a[1], c[1], k0)], p1 = [OE.lerp(a[0], c[0], k1), OE.lerp(a[1], c[1], k1)];
      b.bar(mat, [p0[0], y, p0[1]], [p1[0], y + depth, p1[1]], 0.05, { lod: 'detail' }); b.bar(mat, [p1[0], y, p1[1]], [p1[0], y + depth, p1[1]], 0.05, { lod: 'detail' }); }
  };
  // ---------- Terreno com buracos ----------
  A.subtract = function (r, holes) {
    const xs = new Set([r[0], r[2]]); holes.forEach(h => { if (h[0] > r[0] && h[0] < r[2]) xs.add(h[0]); if (h[2] > r[0] && h[2] < r[2]) xs.add(h[2]); });
    const X = [...xs].sort((a, b) => a - b), out = [];
    for (let i = 0; i < X.length - 1; i++) {
      const xa = X[i], xb = X[i + 1], blocks = holes.filter(h => h[0] < xb && h[2] > xa).map(h => [Math.max(h[1], r[1]), Math.min(h[3], r[3])]).sort((p, q) => p[0] - q[0]);
      let z = r[1]; blocks.forEach(bk => { if (bk[0] > z) out.push([xa, z, xb, bk[0]]); z = Math.max(z, bk[1]); }); if (z < r[3]) out.push([xa, z, xb, r[3]]);
    }
    return out;
  };
  A.ground = function (b, r, holes, mat) {
    A.subtract(r, holes || []).forEach(q => {
      b.box(mat, (q[0] + q[2]) / 2, -0.4, (q[1] + q[3]) / 2, q[2] - q[0], 0.4, q[3] - q[1], { skip: [0, 1, 3, 4, 5], grime: false, tag: 'floor', uvLock: true });
    });
  };
  // Faixa de caminho (terra, cascalho, asfalto) seguindo uma polilinha
  A.path = function (b, pts, w, mat, o) {
    o = o || {};
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], c = pts[i + 1], len = Math.hypot(c[0] - a[0], c[1] - a[1]), yaw = Math.atan2(-(c[1] - a[1]), c[0] - a[0]);
      b.box(mat, (a[0] + c[0]) / 2, 0.004 + i * 0.0005, (a[1] + c[1]) / 2, len + w * 0.6, 0.012, w, { yaw, col: false, grime: false, skip: [0, 1, 3, 4, 5], tint: o.tint });
    }
  };
})(window.OE);

'use strict';
/* SETOR B — Grande Tenda (o coração do mapa).
   Lona listrada rasgada sobre 4 mastros reais (22 m), 12 mastros intermediários e 36 de parede,
   cabos de sustentação, picadeiro com guarda vermelha e branca, quatro blocos de arquibancada de
   8 fileiras (dá para subir pelos degraus, andar pelos corredores e se enfiar EMBAIXO delas pelo
   corredor de trás), portal dos artistas com cortinas de veludo e coreto em cima, passarelas
   técnicas a 9,5 m (anel + pontes + plataforma central de trapézio) com duas escadas de acesso,
   refletores antigos que acendem e apagam sozinhos, caixas de som, mesa de luz, canhão humano.
   Entradas: sul (principal), norte (artistas → bastidores), leste, oeste e um rasgo na lona (oeste-sul). */
(function (OE) {
  const R = 30, WALL_H = 6, KING_R = 7.6, TOP = 22;
  const OPEN = [[90, 5.5], [270, 5.5], [0, 3.6], [180, 3.6], [148, 1.5]];   // [ângulo°, largura m]
  const isOpen = (deg, r) => OPEN.some(([a, w]) => { let d = Math.abs(((deg - a) % 360 + 540) % 360 - 180); return d * OE.DEG * r < w / 2; });
  // caixa num arco: centro no raio médio, largura tangencial, profundidade radial
  function arcBox(b, mat, r0, r1, th, dth, y, h, o) {
    const rm = (r0 + r1) / 2, w = 2 * rm * Math.tan(dth / 2) + 0.04, x = Math.cos(th) * rm, z = Math.sin(th) * rm;
    b.box(mat, x, y, z, w, h, r1 - r0, Object.assign({ yaw: -th - Math.PI / 2 }, o));
  }
  OE.Map.MainCircusTent = function () {
    OE.Sectors.define({
      name: 'Tenda', label: 'Setor B · grande tenda', bounds: [-36, -38, 36, 36],
      build(b, def) {
        const M = OE.MAT, P = OE.Props, A = OE.Arch, Map = OE.Map, r = b.r, H = OE.Hiding, D = OE.DEG;
        // ---------------- chão: serragem + picadeiro ----------------
        b.geo(M.sawdust, OE.G.custom('tentFloor', () => new THREE.CircleGeometry(R - 0.1, 64).rotateX(-Math.PI / 2)), 0, 0.006, 0, { uvScale: R / 3 * 2, grime: false, tint: 0x8a8070 });
        b.geo(M.sawdust, OE.G.custom('ringFloor', () => new THREE.CircleGeometry(6.4, 40).rotateX(-Math.PI / 2)), 0, 0.012, 0, { uvScale: 4, grime: false, tint: 0xc0a880 });
        for (let i = 0; i < 40; i++) { const th = i / 40 * Math.PI * 2; arcBox(b, i % 2 ? M.woodRed : M.woodCream, 6.4, 6.8, th, Math.PI * 2 / 40, 0, 0.4, { tag: 'wood' }); }
        // ---------------- mastros ----------------
        for (let k = 0; k < 4; k++) { const th = (45 + k * 90) * D, x = Math.cos(th) * KING_R, z = Math.sin(th) * KING_R;
          b.cyl(M.metalRed, x, 0, z, 0.2, 0.28, TOP + 2, 10, { col: true, tag: 'metal' }); b.cyl(M.iron, x, 0, z, 0.45, 0.5, 0.3, 10, { lod: 'detail' });
          for (let h = 2; h < TOP; h += 3) b.cyl(M.iron, x, h, z, 0.3, 0.3, 0.08, 10, { lod: 'detail' }); }
        const QR = 18.5;
        for (let k = 0; k < 12; k++) { const th = (k * 30 + 15) * D; b.cyl(M.woodCream, Math.cos(th) * QR, 0, Math.sin(th) * QR, 0.11, 0.14, 15.5, 8, { col: true }); }
        for (let k = 0; k < 36; k++) { const th = k * 10 * D; if (isOpen(k * 10, R) && k % 9 !== 0) continue; const x = Math.cos(th) * (R - 0.15), z = Math.sin(th) * (R - 0.15);
          b.cyl(M.woodCream, x, 0, z, 0.08, 0.1, WALL_H + 0.3, 6, { col: true });
          // cabo até a estaca do lado de fora
          b.bar(M.rubber, [x, WALL_H + 0.2, z], [Math.cos(th) * (R + 4.5), 0.25, Math.sin(th) * (R + 4.5)], 0.03, { round: true, lod: 'detail' });
          b.cyl(M.wood, Math.cos(th) * (R + 4.5), 0, Math.sin(th) * (R + 4.5), 0.05, 0.06, 0.45, 5, { lod: 'detail', rz: 0.3 }); }
        // ---------------- lona: parede e cobertura ----------------
        const segs = 72;
        for (let i = 0; i < segs; i++) {
          const th = (i + 0.5) / segs * Math.PI * 2, deg = th / D; if (isOpen(deg, R)) continue;
          arcBox(b, M.canvasTorn, R - 0.04, R + 0.04, th, Math.PI * 2 / segs, 0, WALL_H, { col: false, tint: [1, 0.95, 0.9] });
          arcBox(b, M.canvas, R - 0.2, R + 0.2, th, Math.PI * 2 / segs, 0, WALL_H, { col: false, skip: [0, 1, 2, 3, 4, 5] });
          const rm = R, w = 2 * rm * Math.tan(Math.PI / segs) + 0.05; b.colBox(Math.cos(th) * rm, 0, Math.sin(th) * rm, w, WALL_H, 0.25, -th - Math.PI / 2, 'canvas');
        }
        // faixa de reforço no pé da lona e abas das entradas enroladas
        OPEN.forEach(([a, w], i) => { if (i === 4) return; const th = a * D; [-1, 1].forEach(k => { const t2 = th + k * (w / 2 + 0.3) / R; b.cyl(M.canvas, Math.cos(t2) * (R - 0.2), 0, Math.sin(t2) * (R - 0.2), 0.32, 0.25, WALL_H - 0.3, 10, { tint: 0xc0b0a0, col: true }); }); });
        // cobertura: perfil côncavo, cede entre os mastros intermediários
        b.geo(M.canvasTorn, OE.G.custom('tentRoof', () => {
          const nt = 120, nr = 18, pos = [], uv = [], idx = [];
          for (let j = 0; j <= nr; j++) { const t = j / nr, rr = R + 0.3 - (R + 0.3 - KING_R) * t, base = WALL_H + (TOP - WALL_H) * (0.5 * t + 0.5 * t * t);
            for (let i = 0; i <= nt; i++) { const th = i / nt * Math.PI * 2, sag = 0.9 * Math.pow(Math.sin(th * 6), 2) * Math.sin(Math.PI * t) + 0.5 * Math.pow(Math.sin(th * 18), 2) * (1 - t) * (t < 0.06 ? 0 : 1);
              pos.push(Math.cos(th) * rr, base - sag, Math.sin(th) * rr); uv.push(i / nt * 12, t * 5); } }
          for (let j = 0; j < nr; j++) for (let i = 0; i < nt; i++) { const a = j * (nt + 1) + i, c = a + nt + 1; idx.push(a, c, a + 1, a + 1, c, c + 1); }
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
        }), 0, 0, 0, { grime: false, tint: [0.95, 0.9, 0.85] });
        // cúpula e mastro da bandeira
        b.geo(M.canvas, OE.G.custom('tentCap', () => new THREE.ConeGeometry(KING_R + 0.4, 2.4, 32, 1, true)), 0, TOP + 1.1, 0, { uvScale: 3, grime: false });
        b.cyl(M.iron, 0, TOP + 2, 0, 0.04, 0.05, 4, 6, { lod: 'detail' }); b.box(M.fabric, 0.6, TOP + 4.8, 0, 1.2, 0.6, 0.02, { tint: 0x5a1010, rz: -0.3, col: false, lod: 'detail' });
        // babado (franja recortada) na borda da cobertura
        b.geo(M.canvas, OE.G.custom('valance', () => {
          const n = 360, pos = [], uv = [], idx = [];
          for (let i = 0; i <= n; i++) { const th = i / n * Math.PI * 2, rr = R + 0.32, bottom = WALL_H - 0.7 + 0.35 * Math.abs(Math.sin(th * 36));
            pos.push(Math.cos(th) * rr, WALL_H + 0.1, Math.sin(th) * rr, Math.cos(th) * rr, bottom, Math.sin(th) * rr); uv.push(i / n * 36, 1, i / n * 36, 0); }
          for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 2, i * 2 + 1, i * 2 + 3);
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
        }), 0, 0, 0, { grime: false });
        // ---------------- arquibancadas ----------------
        const ROWS = 8, R0 = 10.5, DEP = 1.75, RISE = 0.42, GAP = 12;
        const quads = [[GAP, 90 - GAP], [90 + GAP, 180 - GAP], [180 + GAP, 270 - GAP], [270 + GAP, 360 - GAP]];
        def.bleacherQuads = quads;
        quads.forEach(([a0, a1], qi) => {
          const n = Math.round((a1 - a0) / 6), dth = (a1 - a0) / n * D;
          for (let i = 0; i < ROWS; i++) {
            const r0 = R0 + i * DEP, top = RISE * (i + 1);
            for (let s = 0; s < n; s++) {
              const th = a0 * D + (s + 0.5) * dth;
              // piso da fileira (pisável) + tábua de assento na frente
              arcBox(b, M.wood, r0, r0 + DEP, th, dth, top - 0.08, 0.08, { tag: 'wood' });
              arcBox(b, M.woodDark, r0 + 0.05, r0 + 0.5, th, dth * 0.98, top, 0.05, { col: false, lod: 'detail' });
              // espelho (frente vertical) com frestas — bloqueia quem está em pé embaixo
              if (!(i > 3 && r() < 0.15)) arcBox(b, M.woodRed, r0, r0 + 0.04, th, dth, top - RISE, RISE - 0.08, { col: true, tint: [0.75, 0.7, 0.7] });
              // estrutura embaixo
              if (s % 2 === 0) { const rr = r0 + DEP - 0.1, x = Math.cos(th) * rr, z = Math.sin(th) * rr;
                b.cyl(M.iron, x, 0, z, 0.04, 0.04, top - 0.08, 5, { col: i > 3, lod: 'detail' });
                if (i > 2) b.bar(M.iron, [x, 0.15, z], [Math.cos(th) * (rr - DEP), top - RISE - 0.1, Math.sin(th) * (rr - DEP)], 0.04, { lod: 'clutter' }); }
            }
          }
          // guarda-corpo atrás da última fileira
          for (let s = 0; s < n; s++) { const th = a0 * D + (s + 0.5) * dth, rr = R0 + ROWS * DEP;
            arcBox(b, M.iron, rr - 0.05, rr + 0.03, th, dth, RISE * ROWS, 0.05, { col: false, lod: 'detail' }); arcBox(b, M.iron, rr - 0.05, rr + 0.03, th, dth, RISE * ROWS + 0.95, 0.05, { col: false, lod: 'detail' });
            b.cyl(M.iron, Math.cos(th - dth / 2) * rr, RISE * ROWS, Math.sin(th - dth / 2) * rr, 0.025, 0.025, 1, 5, { lod: 'detail' });
            const w = 2 * rr * Math.tan(dth / 2) + 0.04; b.colBox(Math.cos(th) * rr, RISE * ROWS, Math.sin(th) * rr, w, 1.0, 0.1, -th - Math.PI / 2, 'rail').see = true; }
          // laterais dos blocos (guarda-corpo nos corredores)
          [a0, a1].forEach(ae => { const th = ae * D; for (let i = 0; i < ROWS; i++) { const rr = R0 + (i + 0.5) * DEP; b.cyl(M.iron, Math.cos(th) * rr, RISE * (i + 1), Math.sin(th) * rr, 0.025, 0.025, 0.9, 5, { lod: 'detail' }); }
            b.bar(M.iron, [Math.cos(th) * R0, RISE + 0.9, Math.sin(th) * R0], [Math.cos(th) * (R0 + ROWS * DEP), RISE * ROWS + 0.9, Math.sin(th) * (R0 + ROWS * DEP)], 0.04, { round: true, lod: 'detail' }); });
        });
        // esconderijos debaixo das arquibancadas (entra pelo corredor de trás, agachado)
        [[52, 'a'], [128, 'b'], [218, 'c'], [322, 'd']].forEach(([deg]) => { const th = deg * D, rr = R0 + 5.3 * DEP, x = Math.cos(th) * rr, z = Math.sin(th) * rr;
          const s = H.under('bleacher', x, z, -th + Math.PI / 2, 0, 1.2, { depth: 3.4, cat: 'improvisado', exposure: 0.22, camOff: 0.3 });
          s.cam.y = 0.7; s.cam.yaw = -th + Math.PI / 2 + Math.PI; s.cam.yawR = 0.9;
          // olha para o picadeiro pelas frestas
          s.cam.yaw = Math.atan2(-(0 - x), -(0 - z)); });
        // ---------------- portal dos artistas + coreto ----------------
        const PZ = -24.6;
        [-1, 1].forEach(k => { b.box(M.woodRed, k * 4.2, 0, PZ - 1.6, 0.6, 4.6, 3.6); b.box(M.woodCream, k * 4.2, 4.6, PZ - 1.6, 0.8, 0.25, 3.8, { col: false, lod: 'detail' });
          for (let h = 0.6; h < 4.4; h += 1.2) b.geo(M.woodCream, OE.G.sphere(0.12, 8, 6), k * 4.52, h, PZ + 0.2, { lod: 'clutter' });
          P.speaker(b, k * 5.4, PZ - 0.2, 0.3 * -k, { h: 1.3 }); P.speaker(b, k * 5.4, PZ - 0.2, 0.3 * -k, { y: 1.3, h: 0.9 });
          b.colBox(k * 5.4, 0, PZ - 0.2, 0.75, 2.2, 0.6, 0.3 * -k, 'prop'); });
        // coreto (plataforma da banda) acima do portal
        b.box(M.wood, 0, 4.45, PZ - 2.0, 9.0, 0.25, 4.4, { tag: 'wood' });
        b.box(M.woodRed, 0, 3.6, PZ + 0.18, 9.0, 0.85, 0.08, { col: false });
        for (let i = 0; i < 11; i++) OE.Lights.add({ x: -4 + i * 0.8, y: 3.95, z: PZ + 0.25, size: 0.05, color: [0xff5050, 0xffd050, 0x50a0ff][i % 3], intensity: i === 4 ? 0.6 : 0, mode: i === 4 ? 'dying' : 'off', range: 5, noLight: i !== 4, group: 'tenda', needsPower: true });
        A.railing(b, [-4.4, PZ + 0.1], [4.4, PZ + 0.1], 4.7, { h: 1.0 }); A.railing(b, [-4.4, PZ - 4.1], [-4.4, PZ - 1.65], 4.7, { h: 1.0 });
        // cadeiras e estantes de partitura da banda, um bumbo
        for (let i = 0; i < 6; i++) P.chair(b, -3 + i * 1.2, PZ - 3.75, Math.PI + (r() - 0.5) * 0.6, { y: 4.7, fallen: i === 2 });
        b.cyl(M.woodRed, 2.6, 4.7 + 0.45, PZ - 3.7, 0.45, 0.45, 0.4, 14, { rx: Math.PI / 2, lod: 'detail' });
        // cortinas de veludo (fresta no meio)
        const curtain = (x0, x1) => { const n = 7, w = (x1 - x0) / n; for (let i = 0; i < n; i++) b.box(M.velvet, x0 + (i + 0.5) * w, 0.05, PZ + 0.05 + (i % 2) * 0.12, w + 0.12, 4.35, 0.05, { col: false, rz: (r() - 0.5) * 0.02, tint: [0.9 + r() * 0.2, 0.8, 0.8] }); };
        curtain(-3.9, -0.75); curtain(0.75, 3.9);
        b.box(M.velvet, 0, 4.0, PZ + 0.2, 8.0, 0.4, 0.06, { col: false });
        H.behind('curtain', -2.6, PZ - 0.45, Math.PI, 0, { side: -1.4, exposure: 0.4, peek: 0 }).entry = { x: -1.0, z: PZ - 1.3 };
        H.behind('curtain', 2.6, PZ - 0.45, Math.PI, 0, { side: 1.4, exposure: 0.4 }).entry = { x: 1.0, z: PZ - 1.3 };
        H.spots.slice(-2).forEach(s => s.pos.set(s.entry.x, 1, s.entry.z));
        // escada 1: do chão (atrás do portal) até o coreto
        const st1 = A.stairs(b, { x: 9.3, z: PZ - 2.4, y0: 0, y1: 4.7, dir: [-1, 0], w: 1.1, run: 0.3, mat: M.wood, rails: [1], tag: 'wood' });
        b.box(M.wood, 4.55, 4.45, PZ - 2.4, 0.4, 0.25, 1.1, { tag: 'wood' });
        // escada 2: do coreto até a passarela (9,5 m)
        const ST2X = -4.5, CW = 9.5;
        A.stairs(b, { x: ST2X, z: PZ - 1.0, y0: 4.7, y1: CW, dir: [-1, 0], w: 1.0, run: 0.28, mat: M.metalGray, rails: [1, -1], tag: 'metal', solid: false });
        const top2x = ST2X - 16 * 0.28;
        b.box(M.metalGray, top2x - 0.7, CW - 0.12, PZ - 1.0, 1.6, 0.12, 1.6, { tag: 'metal' });
        // ---------------- passarelas técnicas ----------------
        const CR0 = 15.4, CR1 = 16.6, cseg = 48, broken = [6, 7];
        // ângulos onde as pontes encostam no anel: guarda-corpo aberto ali
        const thB0 = Math.atan2(PZ - 1.0, top2x - 0.7), thC0 = Math.atan2(25.5, 12.1);
        const angD = (a, b2) => Math.abs(((a - b2) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
        const gapAt = (th, rr) => rr > 16 ? (angD(th, thB0) < 0.07 || angD(th, thC0) < 0.07) : (angD(th, Math.PI / 2) < 0.07 || angD(th, -Math.PI / 2) < 0.07);
        for (let i = 0; i < cseg; i++) {
          const th = (i + 0.5) / cseg * Math.PI * 2, dth = Math.PI * 2 / cseg;
          if (broken.indexOf(i) >= 0) { if (i === 6) arcBox(b, M.metalGray, CR0, CR1, th, dth, CW - 1.3, 0.1, { col: false, rx: 0.5, lod: 'detail' }); continue; }
          arcBox(b, M.metalGray, CR0, CR1, th, dth, CW - 0.1, 0.1, { tag: 'metal' });
          [CR0, CR1].forEach(rr => { if (gapAt(th, rr)) return; arcBox(b, M.iron, rr - 0.03, rr + 0.03, th, dth, CW + 1.0, 0.05, { col: false, lod: 'detail' });
            const w = 2 * rr * Math.tan(dth / 2) + 0.04; b.colBox(Math.cos(th) * rr, CW, Math.sin(th) * rr, w, 1.05, 0.08, -th - Math.PI / 2, 'rail').see = true;
            b.cyl(M.iron, Math.cos(th - dth / 2) * rr, CW, Math.sin(th - dth / 2) * rr, 0.02, 0.02, 1.05, 4, { lod: 'detail' }); });
          // tirantes até a lona
          if (i % 4 === 0) b.bar(M.iron, [Math.cos(th) * CR0, CW + 1, Math.sin(th) * CR0], [Math.cos(th) * (CR0 - 2), 15.6, Math.sin(th) * (CR0 - 2)], 0.025, { lod: 'detail' });
          // refletores velhos presos no guarda-corpo
          if (i % 6 === 3) P.spotFixture(b, Math.cos(th) * (CR0 + 0.1), CW + 1.05, Math.sin(th) * (CR0 + 0.1), -th + Math.PI / 2, 0.9);
        }
        // pontes radiais: do topo da escada 2 até o anel, e do anel à plataforma central (N e S)
        const bridge = (th, r0, r1, y) => { const rm = (r0 + r1) / 2, x = Math.cos(th) * rm, z = Math.sin(th) * rm, yaw = -th; // eixo local x = radial
          b.box(M.metalGray, x, y - 0.1, z, r1 - r0, 0.1, 1.0, { yaw, tag: 'metal' });
          [-1, 1].forEach(k => { const ox = -Math.sin(th) * k * 0.5, oz = Math.cos(th) * k * 0.5; A.railing(b, [Math.cos(th) * r0 + ox, Math.sin(th) * r0 + oz], [Math.cos(th) * r1 + ox, Math.sin(th) * r1 + oz], y, { h: 1.05, post: 1.5 }); }); };
        const thB = Math.atan2(PZ - 1.0, top2x - 0.7), rB = Math.hypot(top2x - 0.7, PZ - 1.0);
        bridge(thB, CR1 - 0.05, rB - 0.75, CW);
        bridge(Math.PI / 2, 8.6, CR0 + 0.05, CW); bridge(-Math.PI / 2, 8.6, CR0 + 0.05, CW);
        // plataforma central (anel em volta dos mastros), com trapézios pendurados
        for (let i = 0; i < 24; i++) { const th = (i + 0.5) / 24 * Math.PI * 2, dth = Math.PI * 2 / 24; arcBox(b, M.metalGray, 6.6, 8.6, th, dth, CW - 0.1, 0.1, { tag: 'metal' });
          [6.6, 8.6].forEach(rr => { const w = 2 * rr * Math.tan(dth / 2) + 0.04; if (rr > 8 && (Math.abs(((th / D) - 90 + 540) % 360 - 180) < 8 || Math.abs(((th / D) - 270 + 540) % 360 - 180) < 8)) return;
            b.colBox(Math.cos(th) * rr, CW, Math.sin(th) * rr, w, 1.05, 0.08, -th - Math.PI / 2, 'rail').see = true; arcBox(b, M.iron, rr - 0.03, rr + 0.03, th, dth, CW + 1.0, 0.05, { col: false, lod: 'detail' }); }); }
        // escada 3 (sudeste): dois lances com patamar, do corredor externo até a passarela
        A.stairs(b, { x: 10.9, z: 26.6, y0: 0, y1: CW / 2, dir: [-1, 0], w: 1.0, run: 0.3, mat: M.metalGray, rails: [-1], tag: 'metal', solid: false });
        b.box(M.metalGray, 5.1, CW / 2 - 0.12, 26.05, 2.0, 0.12, 2.1, { tag: 'metal' });
        A.stairs(b, { x: 6.1, z: 25.5, y0: CW / 2, y1: CW, dir: [1, 0], w: 1.0, run: 0.3, mat: M.metalGray, rails: [1], tag: 'metal', solid: false });
        b.box(M.metalGray, 11.75, CW - 0.12, 25.5, 1.3, 0.12, 1.4, { tag: 'metal' });
        for (let k = 0; k < 3; k++) b.cyl(M.iron, 5 + k * 2.8, 0, 27.15, 0.05, 0.05, CW, 5, { col: true, lod: 'detail' });
        const thC = Math.atan2(25.5, 12.1), rC = Math.hypot(12.1, 25.5);
        bridge(thC, CR1 - 0.05, rC - 0.6, CW);
        // trapézios e rede rasgada
        [[0, 3], [0, -3], [3, 0]].forEach(([x, z], i) => { const bar = new THREE.Group(); bar.position.set(x, CW - 0.2, z); OE.addDyn(bar);
          const m = OE.partMesh(bb => { bb.box(M.iron, 0, -4.4, 0, 0.9, 0.05, 0.05); [-1, 1].forEach(k => bb.bar(M.rubber, [k * 0.44, -4.4, 0], [k * 0.44, 0, 0], 0.02)); }); bar.add(m);
          OE.Map.updater(dt => { bar.rotation.x = Math.sin(OE.state.time * 0.7 + i * 2) * 0.12; bar.updateMatrixWorld(true); }); });
        b.box(M.chainlink, 0, 3.0, 0, 9, 0.02, 7, { col: false, rx: 0.12, rz: -0.08, tint: 0xa09080, grime: false });
        for (let k = 0; k < 4; k++) { const th = (45 + k * 90) * D; b.bar(M.rubber, [Math.cos(th) * 4.6, 3.2, Math.sin(th) * 3.6], [Math.cos(th) * KING_R, 3.4, Math.sin(th) * KING_R], 0.03, { lod: 'detail' }); }
        // ---------------- objetos no picadeiro ----------------
        [[-3.5, 1.5], [3.2, 2.4], [0.5, -3.6]].forEach(([x, z], i) => { b.cyl(i % 2 ? M.metalBlue : M.metalRed, x, 0, z, 0.55, 0.65, 0.7, 14, { col: true }); b.cyl(M.metalYellow, x, 0.7, z, 0.58, 0.58, 0.05, 14, { lod: 'detail' }); });
        b.cyl(M.metalRed, -3.6, 0.7, 1.5, 0.4, 0.4, 0.05, 14, { rx: 0.4, lod: 'detail' });
        // cadeira solitária com a caixinha de música, virada para a cortina
        P.chair(b, 0, 0.5, Math.PI); new OE.MusicBox({ x: 0, y: 0.48, z: 0.5 }); b.box(M.woodRed, 0, 0.48, 0.5, 0.18, 0.12, 0.14, { col: false, lod: 'clutter' });
        // canhão humano tombado
        { const l = P.L(b, 4.2, -1.6, 0.6); l.cyl(M.metalRed, 0, 0.9, 0, 0.45, 0.55, 3.4, 14, { rz: 1.2 }); l.cyl(M.metalYellow, 1.55, 1.55, 0, 0.5, 0.5, 0.15, 14, { rz: 1.2, lod: 'detail' });
          [-1, 1].forEach(k => l.cyl(M.woodDark, -0.3, 0.6, k * 0.65, 0.6, 0.6, 0.1, 16, { rx: Math.PI / 2 })); l.col(0, 0, 0, 3.2, 1.6, 1.4, 'prop'); }
        // carrinho de palhaço destruído na borda do picadeiro
        { const l = P.L(b, -5.5, -3.2, 2.2, 0); l.geo(M.metalYellow, OE.G.extrude('clowncar', [[-1.1, 0.2], [1.1, 0.2], [1.2, 0.55], [0.4, 0.7], [0.1, 1.2], [-0.8, 1.2], [-1.15, 0.6]], 1.0, 0.04), 0, 0, 0, { rz: 0.15 });
          [[0.7, -0.5], [-0.7, 0.5]].forEach(([wx, wz]) => l.cyl(M.rubber, wx, 0.22, wz, 0.22, 0.22, 0.14, 12, { rx: Math.PI / 2 })); l.col(0, 0, 0, 2.3, 1.1, 1.1, 'prop'); }
        // fileira de cadeiras VIP junto ao picadeiro (algumas caídas)
        for (let i = 0; i < 22; i++) { const deg = 100 + i * 8; if (deg > 168 && deg < 192) continue; const th = deg * D; P.chair(b, Math.cos(th) * 8.9, Math.sin(th) * 8.9, -th - Math.PI / 2 + (r() - 0.5) * 0.3, { fallen: r() < 0.18 }); }
        // mesa de luz/som no corredor sul, embaixo dá para se esconder
        P.table(b, 9.5, 26.1, -0.35, { w: 2.2, d: 0.9, h: 0.95, mat: M.woodDark });
        { const l = P.L(b, 9.5, 26.1, -0.35); for (let i = 0; i < 14; i++) l.box(M.rubber, -0.9 + i * 0.13, 0.95, 0.1, 0.03, 0.04, 0.02, { col: false, lod: 'clutter' }); l.box(M.metalGray, 0, 0.95, -0.2, 1.8, 0.12, 0.35, { col: false, lod: 'detail' }); }
        H.under('table', 9.5, 26.1, -0.35 + Math.PI, 0, 0.9, { depth: 0.45, exposure: 0.4 });
        // baú de figurino no corredor de trás do portal (fechado)
        H.trunk(b, -6.4, -26.5, Math.PI / 2 - 0.2);
        // caixote de transporte (case) aberto: improvisado
        { const l = P.L(b, 2.2, -28.6, 0); l.box(M.rubber, 0, 0, -0.55, 1.6, 1.3, 0.06, { col: false }); [-1, 1].forEach(k => l.box(M.rubber, k * 0.8, 0, 0, 0.06, 1.3, 1.1, { col: false })); l.box(M.rubber, 0, 1.25, 0, 1.6, 0.06, 1.1, { col: false }); l.box(M.chrome, 0, 0, 0, 1.62, 0.06, 1.12, { col: false, lod: 'detail' });
          const c = l.col(0, 0, 0, 1.6, 1.3, 1.1, 'hide'); const s = H.inside('crate', 2.2, -28.6, Math.PI, 0, { depth: 0.55, camY: 0.7, exposure: 0.25, overlay: 'low' }); s.colliders = [c]; }
        // garrafas e latas no corredor (barulho)
        P.bottles(b, -14, 22, 0); P.bottles(b, 25, -6, 0); P.bottles(b, -3, -27.5, 0);
        // pôsteres e placas dentro
        P.sign(b, 0, 2.6, 29.6, Math.PI, 7, 1.4); OE.Lights.add({ x: 0, y: 2.75, z: 29.5, size: 0.12, color: 0x30ff70, intensity: 0.5, range: 3, mode: 'pulse', noLight: true, stretch: 0.4 });
        // ---------------- portal de entrada sul (lado de fora) ----------------
        [-1, 1].forEach(k => { b.box(M.woodRed, k * 3.6, 0, 31.2, 0.7, 5.0, 0.7); b.geo(M.metalYellow, OE.G.sphere(0.35, 10, 8), k * 3.6, 5.3, 31.2, { lod: 'detail' }); P.poster(b, k * 3.6, 2.2, 31.56, 0, k > 0 ? 1 : 3, 0.9); });
        b.box(M.woodRed, 0, 4.2, 31.2, 7.9, 1.2, 0.2, { col: false }); P.sign(b, 0, 4.8, 31.32, 0, 0, 7.2);
        P.bulbString(b, [-3.6, 5.0, 31.4], [3.6, 5.0, 31.4], 0.6, 14, { live: 0.25, group: 'tenda', needsPower: true });
        P.bulbString(b, [3.6, 5.2, 31.3], [14, 0.3, 40], 1.2, 16, { live: 0 }); P.bulbString(b, [-3.6, 5.2, 31.3], [-14, 0.3, 40], 1.2, 16, { live: 0 });
        // ---------------- passagem coberta até os bastidores ----------------
        for (let z = -30.5; z >= -37.5; z -= 2.33) [-1, 1].forEach(k => b.cyl(M.woodCream, k * 2.2, 0, z, 0.06, 0.07, 3.1, 6, { col: true }));
        b.box(M.canvasPlain, -1.2, 3.0, -34, 2.6, 0.04, 8.2, { rz: 0.25, col: false }); b.box(M.canvasPlain, 1.2, 3.0, -34, 2.6, 0.04, 8.2, { rz: -0.25, col: false });
        b.box(M.canvasTorn, -2.25, 0.4, -34, 0.03, 2.4, 8, { col: true, tag: 'canvas' }); b.box(M.canvasTorn, 2.25, 0.4, -34, 0.03, 2.4, 6.5, { col: true, tag: 'canvas' });
        P.ceilingLamp(b, 0, 3.4, -34, { mode: 'flicker', intensity: 1.0, range: 7 });
        // ---------------- luzes ----------------
        P.ceilingLamp(b, 0, 9.2, 22, { mode: 'dying', intensity: 1.2, range: 12 });
        P.ceilingLamp(b, -20, 6.2, -14, { mode: 'off' }); P.ceilingLamp(b, 21, 6.2, 12, { mode: 'flicker', intensity: 0.9 });
        P.emergency(b, 0, 2.2, -29.6, 0, {}); P.emergency(b, 29.6, 2.2, 0, -Math.PI / 2, { mode: 'dying' });
        new OE.Switch({ x: 5.1, y: 1.4, z: PZ - 3.3, yaw: -Math.PI / 2, lights: 'tenda', needsPower: true, name: 'luzes do picadeiro' });
        def.spots = [[-CR0 + 0.2, CW + 1.3, 3], [CR0 - 0.2, CW + 1.3, -3]];
        // ---------------- navegação ----------------
        for (let a = 0; a < 24; a++) { const th = a / 24 * Math.PI * 2; Map.cand(Math.cos(th) * 27.3, 0, Math.sin(th) * 27.3); }
        [0, 90, 180, 270].forEach(deg => { const th = deg * D; for (let rr = 7.6; rr <= 26; rr += 3) Map.cand(Math.cos(th) * rr, 0, Math.sin(th) * rr); });
        for (let a = 0; a < 8; a++) { const th = a / 8 * Math.PI * 2; Map.cand(Math.cos(th) * 4.5, 0, Math.sin(th) * 4.5); }
        Map.cand(0, 0, -32); Map.cand(0, 0, -36); Map.cand(0, 0, 32.5); Map.cand(0, 0, PZ - 1.4); Map.cand(-6, 0, PZ - 2.6); Map.cand(7.5, 0, PZ - 2.4);
        // escadas e passarelas (cadeias fixas)
        Map.stairNav([[10.2, 0, PZ - 2.4], [9.3 - 4.8, 4.7, PZ - 2.4], [2, 4.7, PZ - 2.2], [-3.6, 4.7, PZ - 2.6]]);
        Map.stairNav([[-3.8, 4.7, PZ - 1.0], [top2x - 0.6, CW, PZ - 1.0], [Math.cos(thB) * (CR1 + 0.4), CW, Math.sin(thB) * (CR1 + 0.4)]], { tag: 'cat' });
        const ring = []; for (let i = 0; i < cseg; i += 2) { if (broken.indexOf(i) >= 0 || broken.indexOf(i + 1) >= 0) { ring.push(null); continue; } const th = (i + 1) / cseg * Math.PI * 2; ring.push([Math.cos(th) * 16, CW, Math.sin(th) * 16]); }
        // anel da passarela: cadeia que para no trecho quebrado
        const seq = []; const start = ring.findIndex(p => p === null) + 1; for (let k = 0; k < ring.length; k++) { const p = ring[(start + k) % ring.length]; if (p) seq.push(p); }
        Map.stairNav(seq, { tag: 'cat' });
        Map.stairNav([[11.9, 0, 26.6], [6.0, CW / 2, 26.6], [5.0, CW / 2, 25.5], [11.6, CW, 25.5], [Math.cos(thC) * (CR1 + 0.4), CW, Math.sin(thC) * (CR1 + 0.4)]]);
        Map.stairNav([[0, CW, 16.0], [0, CW, 11.5], [0, CW, 7.6], [5.4, CW, 5.4], [7.6, CW, 0], [5.4, CW, -5.4], [0, CW, -7.6], [0, CW, -11.5], [0, CW, -16.0]], { tag: 'cat' });
        Map.cp('Grande tenda', 0, 0, 24, 0, 4);
      },
      after(def) {
        // refletores reais (2 SpotLights fixos no pool, acendem e apagam sozinhos) + cone de luz visível
        if (!OE.Q.spots) return;   // nível Suave: sem refletores reais na tenda
        const mk = (p, tgt, period, off) => {
          const sl = new THREE.SpotLight(0xfff0d0, 0, 40, 0.22, 0.4, 1.2); sl.position.set(p[0], p[1], p[2]); sl.target.position.set(tgt[0], 0, tgt[1]);
          OE.scene.add(sl); OE.scene.add(sl.target);
          const len = Math.hypot(p[0] - tgt[0], p[1], p[2] - tgt[1]);
          const cone = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(0.22) * len, len, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true }));
          cone.position.set((p[0] + tgt[0]) / 2, p[1] / 2, (p[2] + tgt[1]) / 2); cone.lookAt(tgt[0], 0, tgt[1]); cone.rotateX(-Math.PI / 2); def.dyn.add(cone);
          const em = OE.Lights.add({ x: p[0], y: p[1], z: p[2], size: 0.18, color: 0xfff0d0, intensity: 3.2, range: 0, mode: 'cycle', period, onFor: 9, seed: off, noLight: true, halo: 2.2 });
          OE.Map.updater(dt => { const P = OE.game.player.pos, near = Math.hypot(P.x, P.z) < 40 && P.y > -1; const k = near ? em.cur : 0; sl.intensity = 3.2 * k; cone.material.opacity = 0.05 * k; cone.visible = k > 0.01; });
        };
        mk(def.spots[0], [-1.5, 1.0], 47, 5); mk(def.spots[1], [2, -0.5], 61, 31);
      }
    });
  };
})(window.OE);

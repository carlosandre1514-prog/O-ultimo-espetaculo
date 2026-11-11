'use strict';
/* SETOR G — Parque externo abandonado.
   Roda-gigante de 27 m (duas gôndolas caíram), carrossel com cavalos recortados e cobertura
   listrada, fileira de barracas de jogos e comida, pavilhão do carrinho de bate-bate, o "Trem
   Fantasma" (prédio com corredores escuros por dentro), árvores secas, mato alto, bancos, lixeiras,
   postes, trailer e carro abandonados. Caminhos de terra ligam tudo à praça e aos alojamentos. */
(function (OE) {
  const HORSE = [[-0.75, 0.0], [-0.55, 0.05], [-0.45, 0.35], [0.3, 0.35], [0.45, 0.05], [0.6, 0.0], [0.62, 0.1], [0.5, 0.45], [0.55, 0.7], [0.75, 0.95], [0.85, 0.85], [0.95, 0.9], [0.8, 1.1], [0.6, 1.05], [0.35, 0.7], [-0.45, 0.72], [-0.7, 0.85], [-0.8, 0.6], [-0.62, 0.45]];
  OE.Map.AbandonedPark = function () {
    OE.Sectors.define({
      name: 'Parque', label: 'Setor G · parque abandonado', bounds: [-125, -45, -30, 98], priority: 0,
      build(b, def) {
        const M = OE.MAT, A = OE.Arch, P = OE.Props, H = OE.Hiding, Map = OE.Map, r = b.r, D = OE.DEG;
        // ---------------- roda-gigante ----------------
        const WX = -96, WZ = 34, HUB = 15, WR = 12;
        [-1, 1].forEach(k => { const x = WX + k * 1.6;
          [-1, 1].forEach(j => { b.bar(M.metalRed, [x + k * 0.6, 0, WZ + j * 6.5], [x, HUB, WZ], 0.32, {}); b.colCyl(x + k * 0.6 - k * 0.05, WZ + j * 6.4, 0.3, 0, 2.5, 'metal');
            for (let h = 3; h < HUB - 1; h += 3) { const t = h / HUB; b.bar(M.iron, [x + k * 0.6 * (1 - t), h, WZ + j * 6.5 * (1 - t)], [x + k * 0.6 * (1 - t), h, WZ - j * 6.5 * (1 - t) * 0.0], 0.06, { lod: 'detail' }); } });
          b.geo(M.metalYellow, OE.G.torus(WR, 0.16, 6, 64), x * 0 + WX + k * 1.2, HUB, WZ, { yaw: Math.PI / 2 });
          b.geo(M.metalYellow, OE.G.torus(WR * 0.55, 0.08, 5, 40), WX + k * 1.2, HUB, WZ, { yaw: Math.PI / 2, lod: 'detail' });
          for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; b.bar(M.metalYellow, [WX + k * 1.2, HUB, WZ], [WX + k * 1.2, HUB + Math.sin(a) * WR, WZ + Math.cos(a) * WR], 0.07, { lod: 'detail' }); } });
        b.cyl(M.iron, WX, HUB, WZ, 0.5, 0.5, 3.8, 14, { rz: Math.PI / 2 });
        for (let i = 0; i < 16; i++) {
          const a = i / 16 * Math.PI * 2 + 0.1, py = HUB + Math.sin(a) * WR, pz = WZ + Math.cos(a) * WR;
          b.bar(M.iron, [WX - 1.2, py, pz], [WX + 1.2, py, pz], 0.08, { round: true, lod: 'detail' });
          if (i === 11 || i === 13) continue;                                       // caíram
          const l = P.L(b, WX, pz, 0, py - 2.0); const sw = (r() - 0.5) * 0.2;
          l.box(i % 2 ? M.metalRed : M.metalBlue, 0, 0, 0, 1.8, 0.9, 1.4, { col: false, rz: sw }); l.box(M.metalYellow, 0, 1.6, 0, 1.9, 0.12, 1.5, { col: false, rz: sw });
          [-1, 1].forEach(k => l.bar(M.iron, [k * 0.85, 0.9, 0], [0, 2.0, 0], 0.04, { lod: 'detail' }));
        }
        // gôndolas caídas (uma serve de esconderijo)
        { const l = P.L(b, WX + 5, WZ - 6, 0.7); l.box(M.metalBlue, 0, 0, 0, 1.8, 0.9, 1.4, { col: false, rz: 0.25 }); l.box(M.metalYellow, 0.4, 0.05, 1.0, 1.9, 0.12, 1.5, { col: false, rx: 1.2 }); l.col(0, 0, 0, 1.8, 1.0, 1.4, 'hide');
          const s = H.inside('gondola', WX + 5, WZ - 6, 0.7, 0, { depth: 0.7, camY: 0.6, exposure: 0.3, overlay: 'low' }); s.name = 'gôndola caída'; }
        { const l = P.L(b, WX + 7, WZ + 9, -0.4); l.box(M.metalRed, 0, 0.6, 0, 1.8, 0.9, 1.4, { rx: 1.4, rz: 0.2 }); }
        // plataforma de embarque com degraus e cabine de comando
        b.box(M.wood, WX + 3.5, 0, WZ, 3.0, 1.2, 6, { tag: 'wood' }); A.stairs(b, { x: WX + 6.6, z: WZ, y0: 0, y1: 1.2, dir: [-1, 0], w: 2, run: 0.3, mat: M.wood, tag: 'wood' });
        A.railing(b, [WX + 2.1, WZ - 3], [WX + 5, WZ - 3], 1.2, {}); A.railing(b, [WX + 2.1, WZ + 3], [WX + 5, WZ + 3], 1.2, {});
        { const k = A.plan(b, { h: 2.4, ext: M.woodGreen, wall: M.wood, floor: M.wood, ceil: M.wood, rooms: [{ id: 'cab', r: [WX + 5, WZ + 4, WX + 7.5, WZ + 6.5] }], doors: [{ x: WX + 6.25, z: WZ + 6.5, w: 0.8 }], windows: [{ x: WX + 5, z: WZ + 5.25, w: 1.2, broken: 0.7 }] });
          A.roofFlat(b, WX + 5, WZ + 4, WX + 7.5, WZ + 6.5, 2.4); new OE.Switch({ x: WX + 7.3, y: 1.2, z: WZ + 5.25, yaw: -Math.PI / 2, kind: 'lever', name: 'alavanca da roda-gigante', needsPower: true, lights: 'roda' }); }
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; OE.Lights.add({ x: WX + 1.3, y: HUB + Math.sin(a) * WR, z: WZ + Math.cos(a) * WR, size: 0.08, color: [0xff4040, 0xffe060, 0x60c0ff][i % 3], intensity: 1.0, range: 8, mode: 'flicker', on: false, group: 'roda', needsPower: true, noLight: i % 4 !== 0, halo: 0.6 }); }
        // ---------------- carrossel ----------------
        const CX = -62, CZ = 8, CR = 7.5;
        b.cyl(M.woodRed, CX, 0, CZ, CR, CR + 0.1, 0.45, 40, { col: true, tag: 'wood' }); b.geo(M.wood, OE.G.custom('carFloor', () => new THREE.CircleGeometry(CR - 0.05, 40).rotateX(-Math.PI / 2)), CX, 0.46, CZ, { uvScale: 4, grime: false });
        b.cyl(M.woodCream, CX, 0.45, CZ, 1.6, 1.6, 4.3, 16, { col: true }); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; b.box(M.mirror, CX + Math.cos(a) * 1.62, 1.6, CZ + Math.sin(a) * 1.62, 0.7, 1.4, 0.02, { yaw: -a + Math.PI / 2, col: false, grime: false }); }
        b.geo(M.canvas, OE.G.custom('carRoof', () => new THREE.ConeGeometry(CR + 0.6, 2.6, 32, 1, true)), CX, 4.75 + 1.3, CZ, { uvScale: 2 });
        b.geo(M.canvas, OE.G.custom('carVal', () => { const n = 160, pos = [], uv = [], idx = []; for (let i = 0; i <= n; i++) { const th = i / n * Math.PI * 2, rr = CR + 0.62, bo = 4.1 + 0.25 * Math.abs(Math.sin(th * 16)); pos.push(Math.cos(th) * rr, 4.8, Math.sin(th) * rr, Math.cos(th) * rr, bo, Math.sin(th) * rr); uv.push(i / n * 16, 1, i / n * 16, 0); } for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 2, i * 2 + 1, i * 2 + 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; }), CX, 0, CZ, { grime: false });
        b.geo(M.metalYellow, OE.G.sphere(0.4, 10, 8), CX, 7.45, CZ, {});
        const horse = OE.G.extrude('horse', HORSE, 0.24, 0.03);
        for (let i = 0; i < 20; i++) {
          const a = i / 20 * Math.PI * 2, rr = i % 2 ? 5.9 : 4.0, x = CX + Math.cos(a) * rr, z = CZ + Math.sin(a) * rr, yaw = -a;
          const fallen = i === 3 || i === 12 || i === 17;
          if (!(i === 7)) b.cyl(M.chrome, x, 0.45, z, 0.03, 0.03, 4.4, 6, { col: true });
          if (fallen) { b.geo(M.woodCream, horse, x + Math.cos(a) * 1.6, 0.12, z + Math.sin(a) * 1.6, { yaw, rx: Math.PI / 2, tint: [0.9, 0.85, 0.8], scale: [1.4, 1.4, 1.2] }); continue; }
          b.geo(M.woodCream, horse, x, 1.0 + (i % 3) * 0.25, z, { yaw, scale: [1.4, 1.4, 1.2], tint: [[1, 0.9, 0.85], [0.6, 0.6, 0.65], [0.9, 0.75, 0.6]][i % 3] });
          b.box(M.woodRed, x, 1.75 + (i % 3) * 0.25, z, 0.35, 0.06, 0.3, { yaw, col: false, lod: 'clutter' });
        }
        P.bulbString(b, [CX + CR + 0.6, 4.3, CZ], [CX, 4.3, CZ + CR + 0.6], 0.3, 8, { live: 1, group: 'carrossel', needsPower: true }); P.bulbString(b, [CX - CR - 0.6, 4.3, CZ], [CX, 4.3, CZ - CR - 0.6], 0.3, 8, { live: 1, group: 'carrossel', needsPower: true });
        H.behind('equipment', CX - 1.95, CZ + 0.1, -Math.PI / 2, 0.45, { crouch: true, side: 0, cat: 'aberto', exposure: 0.4 }).entry = { x: CX - 3.2, z: CZ + 0.8 }; H.spots[H.spots.length - 1].pos.set(CX - 3.2, 1.45, CZ + 0.8);
        // ---------------- barracas ----------------
        const stalls = [[-42, 60, 0.35, 0x8e1f1c, 'TIRO AO ALVO'], [-50, 64, 0.3, 0x28406a, 'ARGOLAS'], [-58, 67, 0.15, 0x3e5a40, 'PIPOCA'], [-74, 71, -0.05, 0x8e1f1c, 'ALGODÃO DOCE'], [-82, 71, -0.1, 0x5a2a6a, 'PESCARIA'], [-90, 70, -0.2, 0x28406a, 'LANCHES']];
        stalls.forEach(([x, z, yaw, col], i) => {
          const l = P.L(b, x, z, yaw);
          l.box(M.woodCream, 0, 0, -1.25, 3.2, 2.5, 0.08); l.box(M.woodCream, -1.6, 0, 0, 0.08, 2.5, 2.5); l.box(M.woodCream, 1.6, 0, 0, 0.08, 2.5, 2.5);
          l.box(M.woodRed, 0, 0, 1.2, 3.2, 1.05, 0.12, { tint: col }); l.box(M.wood, 0, 1.05, 1.25, 3.3, 0.06, 0.4, { col: false });
          l.box(M.canvas, 0, 2.65, 1.0, 3.6, 0.04, 2.6, { col: false, rx: -0.3 }); l.box(M.woodDark, 0, 2.5, -1.2, 3.3, 0.15, 0.2, { col: false });
          [-1, 1].forEach(k => l.box(M.woodDark, k * 1.6, 0, 1.25, 0.1, 2.9, 0.1));
          l.box(M.wood, 0, 1.5, -1.0, 3.0, 0.04, 0.35, { col: false }); for (let q = 0; q < 6; q++) l.geo(M.fabric, OE.G.sphere(0.13, 8, 6), -1.2 + q * 0.48, 1.66, -1.0, { tint: [0.4 + r() * 0.5, 0.3 + r() * 0.4, 0.2 + r() * 0.5], lod: 'clutter' });
          if (i === 0) for (let q = 0; q < 5; q++) l.cyl(M.metalRed, -1.2 + q * 0.6, 1.9, -1.15, 0.12, 0.12, 0.02, 12, { rx: Math.PI / 2, lod: 'detail' });
          const s = OE.Hiding.behind('crates', ...Object.values(l.p(0.3, 0.75)), yaw + Math.PI, 0, { crouch: true, side: 0, exposure: 0.35, cat: 'aberto' });
          s.name = 'balcão da barraca'; s.entry = l.p(0.3, -0.4); s.pos.set(s.entry.x, 1, s.entry.z); s.cam.yaw = yaw;
          OE.Lights.add({ x: l.p(0, 0.9).x, y: 2.4, z: l.p(0, 0.9).z, size: 0.05, color: 0xffd090, intensity: i === 3 ? 0.9 : 0, mode: i === 3 ? 'dying' : 'off', range: 6, noLight: i !== 3 });
        });
        // ---------------- bate-bate ----------------
        const BX = -104, BZ = -8;
        b.box(M.metalGray, BX, 0, BZ, 18, 0.22, 12, { tag: 'metal' });
        for (let i = 0; i < 4; i++) [-1, 1].forEach(k => b.box(M.metalRed, BX - 8 + i * 5.33, 0.22, BZ + k * 5.8, 0.3, 4.5, 0.3));
        b.box(M.chainlink, BX, 4.6, BZ, 18, 0.03, 12, { col: false, tint: 0x6a6a6a }); b.box(M.metalRed, BX, 4.72, BZ, 18.6, 0.5, 12.6, { col: false, skip: [2, 3] });
        b.box(M.rubber, BX, 0.22, BZ - 6, 18, 0.35, 0.18, {}); b.box(M.rubber, BX, 0.22, BZ + 6, 18, 0.35, 0.18, { tint: 0x333333 }); b.box(M.rubber, BX - 9, 0.22, BZ, 0.18, 0.35, 12);
        for (let i = 0; i < 7; i++) { const l = P.L(b, BX - 6 + (i % 4) * 4 + r(), BZ - 3 + Math.floor(i / 4) * 5 + r(), r() * 6, 0.22);
          l.geo(i % 2 ? M.metalBlue : M.metalYellow, OE.G.extrude('bumper', [[-0.9, 0], [0.9, 0], [1.0, 0.4], [0.3, 0.55], [0.2, 0.9], [-0.6, 0.9], [-1.0, 0.45]], 1.2, 0.08), 0, 0, 0, {});
          l.cyl(M.iron, -0.5, 0.9, 0, 0.02, 0.02, 2.5, 4, { lod: 'detail' }); l.col(0, 0, 0, 2.0, 0.9, 1.3, 'prop'); }
        // ---------------- Trem Fantasma (corredores escuros) ----------------
        const TX = -78, TZ = 46;
        A.plan(b, { y: 0, h: 3.6, ext: M.woodGreen, extTint: [0.6, 0.7, 0.6], wall: M.plaster, floor: M.wood, ceil: M.concreteDark, wallTag: 'wall',
          rooms: [{ id: 'ent', r: [TX - 7, TZ + 3, TX + 7, TZ + 6], wall: M.wallpaperRed }, { id: 'c1', r: [TX - 7, TZ - 6, TX - 3, TZ + 3], wall: M.velvet },
            { id: 'c2', r: [TX - 3, TZ - 6, TX + 3, TZ - 2], wall: M.velvet }, { id: 'c3', r: [TX + 3, TZ - 6, TX + 7, TZ + 3], wall: M.velvet }, { id: 'mid', r: [TX - 3, TZ - 2, TX + 3, TZ + 3], wall: M.wallpaperGreen }],
          doors: [{ x: TX - 5, z: TZ + 6, w: 1.8, h: 2.4, door: false }, { x: TX + 5, z: TZ + 6, w: 1.8, h: 2.4, door: false },
            { x: TX - 5, z: TZ + 3, w: 1.6, h: 2.4, door: { kind: 'wood', name: 'porta de vaivém' } }, { x: TX + 5, z: TZ + 3, w: 1.6, h: 2.4, door: { name: 'porta de vaivém' } },
            { x: TX - 3, z: TZ - 4, w: 1.6, h: 2.4, door: false }, { x: TX + 3, z: TZ - 4, w: 1.6, h: 2.4, door: false }, { x: TX, z: TZ - 2, w: 1.0, door: { lock: 'jammed', name: 'porta' } }] });
        A.roofFlat(b, TX - 7, TZ - 6, TX + 7, TZ + 6, 3.6);
        // fachada com o rosto do palhaço
        b.box(M.woodRed, TX, 3.6, TZ + 6.1, 14, 3.0, 0.2, { col: false });
        b.geo(M.paint, OE.G.custom('clownFace', () => new THREE.CircleGeometry(1.4, 24)), TX, 5.1, TZ + 6.22, { tint: 0xe8e0d0, grime: false });
        [-0.5, 0.5].forEach(k => b.geo(M.paint, OE.G.custom('clownEye', () => new THREE.CircleGeometry(0.28, 12)), TX + k, 5.35, TZ + 6.24, { tint: 0x080808, scale: [1, 1.4, 1], grime: false }));
        b.geo(M.paint, OE.G.custom('clownNose', () => new THREE.CircleGeometry(0.2, 12)), TX, 5.0, TZ + 6.25, { tint: 0x9a0a0a, grime: false });
        b.geo(M.paint, OE.G.custom('clownMouth', () => new THREE.RingGeometry(0.55, 0.75, 16, 1, Math.PI * 1.1, Math.PI * 0.8)), TX, 5.0, TZ + 6.25, { tint: 0x8a0a0a, grime: false });
        P.sign(b, TX, 3.9, TZ + 6.24, 0, 6, 4);
        // trilho e carrinhos, bonecos
        A.path(b, [[TX - 5, TZ + 8], [TX - 5, TZ - 4], [TX + 5, TZ - 4], [TX + 5, TZ + 8]], 0.9, M.iron);
        [[TX - 5, TZ + 7.5], [TX + 5, TZ + 1]].forEach(([x, z]) => { const l = P.L(b, x, z, 0); l.geo(M.metalRed, OE.G.extrude('ghostcar', [[-0.8, 0.1], [0.8, 0.1], [0.9, 0.8], [0.4, 0.8], [0.3, 0.5], [-0.7, 0.5], [-0.9, 1.2]], 1.0, 0.05), 0, 0, 0, { yaw: Math.PI / 2 }); l.col(0, 0, 0, 1.0, 1.0, 1.8, 'prop'); });
        OE.Director.addMannequin(TX - 6.2, 0, TZ - 1, 1.2, 0xd0c8b0, true); OE.Story.place('fita2', TX + 2.5, 0.02, TZ - 4.5, 1.1); P.mannequin(b, TX + 6.3, TZ - 5.2, -0.6, { headless: true, tint: 0x3a0a0a }); P.mannequin(b, TX - 1, TZ + 1, 0, { ruff: true });
        H.behind('curtain', TX - 6.3, TZ - 4.5, Math.PI / 2, 0, { side: 0, exposure: 0.35 }).entry = { x: TX - 5, z: TZ - 3 }; H.spots[H.spots.length - 1].pos.set(TX - 5, 1, TZ - 3);
        P.emergency(b, TX, 2.8, TZ - 5.85, 0, { mode: 'strobe' }); P.emergency(b, TX - 6.85, 2.8, TZ + 1, Math.PI / 2, { mode: 'pulse' });
        P.bottles(b, TX + 5, TZ - 2, 0);
        // ---------------- Casa dos Espelhos (labirinto em serpentina, paredes espelhadas) ----------------
        { const y0 = 0, X0 = -110, X1 = -96;
          A.plan(b, { y: 0, h: 3.0, ext: M.woodRed, extTint: [0.8, 0.7, 0.75], wall: M.mirror, floor: M.checker, ceil: M.velvet,
            rooms: [{ id: 'r1', r: [X0, -36, X1, -34] }, { id: 'r2', r: [X0, -38.5, X1, -36] }, { id: 'r3', r: [X0, -41, X1, -38.5] }, { id: 'r4', r: [X0, -44, X1, -41] }],
            open: [{ x: -97.5, z: -36, w: 1.6, h: 2.6 }, { x: -108.5, z: -38.5, w: 1.6, h: 2.6 }, { x: -97.5, z: -41, w: 1.6, h: 2.6 }],
            doors: [{ x: -108.5, z: -34, w: 1.2, door: { name: 'porta da Casa dos Espelhos' }, sign: 0, signSide: 1 }] });
          A.roofFlat(b, X0, -44, X1, -34, 3.0, M.woodRed);
          b.box(M.woodRed, -103, 3.0, -33.75, 9, 1.6, 0.2, { col: false }); P.sign(b, -103, 3.8, -33.62, 0, 0, 6);
          OE.Quad && 0; P.poster(b, -99, 1.6, -33.74, 0, 4, 1.2);
          // espelhos registrados nas paredes longas (um reflexo ativo por vez: o mais próximo)
          [-36, -38.5, -41].forEach(zw => [-1, 1].forEach(s => { for (let x = X0 + 2.5; x < X1 - 1; x += 3.5) OE.Mirrors.add({ x, y: 1.35, z: zw + s * 0.12, w: 3.0, h: 2.4, yaw: s > 0 ? 0 : Math.PI }); }));
          for (let k = 0; k < 6; k++) P.ceilingLamp(b, X0 + 1.5 + k * 2.3, 3.0, -35 - (k % 4) * 2.5, { mode: k % 2 ? 'flicker' : 'off', intensity: 0.7, range: 6, shade: M.metalRed });
          OE.Director.addMannequin(-108.6, 0, -42.6, 0.6, 0x9a2020, true); OE.Director.addMannequin(-97.4, 0, -37.2, -1.2, 0xd0c8b0, true);
          OE.Story.place('foto', -109.2, 0.02, -43.3, 0.4); P.chair(b, -109.3, -42.6, 0.8, {});
          H.behind('curtain', -96.6, -39.8, -Math.PI / 2, 0, { side: 0, exposure: 0.35 });
          A.path(b, [[-103, -33], [-90, -26], [-74, -20], [-60, -12]], 2.4, M.dirt);
          [-35, -37.2, -39.7, -42.5].forEach(z => [-107, -103, -99].forEach(x => Map.cand(x, 0, z)));
        }
        // ---------------- equipamentos urbanos ----------------
        [[-48, 52], [-70, 62], [-88, 60], [-60, 25], [-73, 24], [-46, 22], [-100, 48], [-108, 20], [-52, -14]].forEach(([x, z], i) => P.lampPost(b, x, z, { mode: i % 3 === 0 ? 'flicker' : 'steady', broken: i % 3 === 1, intensity: 1.2, lean: i === 5 ? 0.15 : 0, needsPower: i % 3 === 2, group: 'parque' }));
        [[-45, 46, 2.4], [-66, 60, 0.2], [-84, 52, 1.6], [-56, 22, -0.5], [-74, 0, 0.6]].forEach(([x, z, y]) => P.bench(b, x, z, y, { park: true }));
        OE.Hiding.under('bench', -66, 60, 0.2 + Math.PI, 0, 0.42, { depth: 0.25, exposure: 0.55, camOff: 0 });
        [[-47, 49], [-80, 66], [-58, 30]].forEach(([x, z]) => P.trashBin(b, x, z, 0)); P.trashBin(b, -95, 63, 0.4, { big: true }); P.trashBin(b, -68, 38, -0.2, { big: true });
        P.dumpster(b, -121.5, 48, Math.PI / 2);
        // trailer e carro abandonados
        P.truck(b, -66, -24, 0, { box: M.woodGreen }); P.car(b, -44, -18, 2.1, { mat: M.metalRed, vines: true }); P.car(b, -118, 2, 1.4, { mat: M.metalGray, vines: true });
        // cercas baixas
        A.woodFence(b, [-36, -26], [-36, 30], { gaps: [6, 7], broken: 0.3 }); A.woodFence(b, [-36, 36], [-36, 96], { gaps: [3], broken: 0.3 });
        P.bottles(b, -63, 30, 0); P.bottles(b, -96, 22, 0);
        // vegetação
        // áreas dos brinquedos modelados no MiniBlender (assets/models/brinquedos): sem árvore nem mato dentro
        const RIDES = [[-111, 73, 9, 19], [-48, 86, 8, 5.5], [-80, 86, 8.5, 8.5], [-86, -14, 8, 8], [-116, 16, 5, 5], [-82, 14, 7.5, 7.5], [-64, 42, 4, 9.5]];
        const inRide = (x, z) => RIDES.some(([cx, cz, hx, hz]) => Math.abs(x - cx) < hx && Math.abs(z - cz) < hz);
        def._inRide = inRide;
        def._grass = [[-124, -28, -112, 96], [-110, 80, -40, 96], [-56, -28, -38, -2], [-110, -28, -96, -16], [-86, 14, -74, 30], [-120, 40, -104, 60], [-50, 70, -38, 96], [-70, 30, -56, 44]];
        const trees = []; const tr = OE.rng(77);
        for (let i = 0; i < 46; i++) { const x = -122 + tr() * 84, z = -26 + tr() * 120; if (inRide(x, z) || Math.hypot(x - WX, z - WZ) < 15 || Math.hypot(x - CX, z - CZ) < 11 || (x > -112 && x < -94 && z > -16 && z < 0) || (x > -86 && x < -70 && z > 38 && z < 54) || (z > 56 && z < 75 && x > -96 && x < -38) || (x > -40)) continue; trees.push([x, z, 0.8 + tr() * 0.6, tr() - 0.5]); }
        def._trees = trees;
        Map.cp('Parque', -45, 0, 40, Math.PI / 2, 4);
        for (let a = 0; a < 8; a++) { const th = a / 8 * Math.PI * 2; Map.cand(CX + Math.cos(th) * 9.5, 0, CZ + Math.sin(th) * 9.5); }
        Map.cand(TX - 5, 0, TZ + 4.5); Map.cand(TX - 5, 0, TZ - 4); Map.cand(TX, 0, TZ - 4); Map.cand(TX + 5, 0, TZ - 4); Map.cand(TX + 5, 0, TZ + 4.5);
      },
      after(def) { OE.Veg.grass(def, def._grass, 1.6, def._inRide); OE.Veg.trees(def, def._trees, { leaves: true }); },
      detail(b) { const P = OE.Props, r = b.r; P.papers(b, -60, 50, 10); P.debris(b, -98, 30, 4); P.planks(b, -70, 66, 4); for (let i = 0; i < 40; i++) b.box(OE.MAT.leaves, -120 + r() * 80, 0.01, -25 + r() * 115, 0.7, 0.01, 0.7, { yaw: r() * 6, col: false, lod: 'clutter', grime: false }); }
    });
  };
})(window.OE);

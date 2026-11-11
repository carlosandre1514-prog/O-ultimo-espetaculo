'use strict';
/* SETOR F — Área dos animais.
   Pátio cercado com cerca de madeira (portão a oeste, tábuas quebradas a leste), carroças-jaula
   de circo, jaula grande dos leões, bebedouros, correntes de elefante presas em estacas.
   Estábulo: corredor central com baias (divisórias de madeira, grades em cima, portões de ferro),
   depósito de ração, área de lavagem, sala de equipamentos e selaria.
   Galpão de manutenção com a escada de serviço para o subsolo (a porta lá embaixo tem ferrolho
   do lado do túnel: só abre vindo do subsolo — atalho). */
(function (OE) {
  OE.Map.AnimalArea = function () {
    OE.Sectors.define({
      name: 'Animais', label: 'Setor F · área dos animais', bounds: [44, -25, 103, 46], interiorRange: 9, priority: 1,
      build(b, def) {
        const M = OE.MAT, A = OE.Arch, P = OE.Props, H = OE.Hiding, Map = OE.Map, r = b.r;
        // ---- cerca do pátio ----
        A.woodFence(b, [45, -24], [45, 14.5], { broken: 0.12 }); A.woodFence(b, [45, 19.5], [45, 45], {});
        A.woodFence(b, [45, 45], [102, 45], { gaps: [8] }); A.woodFence(b, [45, -24], [86, -24], { gaps: [3] });
        new OE.Door({ x: 45, z: 17, y: 0, w: 4.6, h: 1.4, yaw: Math.PI / 2, hinge: -1, kind: 'bars', name: 'porteira', maxAngle: 110, startOpen: 0.4 });
        P.sign(b, 44.8, 1.9, 17, -Math.PI / 2, 4, 2.4); b.box(M.wood, 44.8, 0, 14.4, 0.2, 2.2, 0.2); b.box(M.wood, 44.8, 0, 19.6, 0.2, 2.2, 0.2);
        // ---- estábulo ----
        const HG = 5.6;
        A.plan(b, {
          y: 0, h: HG, ext: M.woodRed, extTint: [0.8, 0.75, 0.72], wall: M.wood, floor: M.concreteDark, ceil: null, doorMat: M.woodDark,
          rooms: [{ id: 'est', r: [55, 8, 95, 25] }, { id: 'rac', r: [55, 25, 65, 36], floor: M.wood }, { id: 'lav', r: [65, 25, 75, 36], wall: M.tiles, floor: M.tilesFloor },
            { id: 'equ', r: [75, 25, 85, 36] }, { id: 'sel', r: [85, 25, 95, 36], wall: M.woodDark }],
          open: [{ x: 55, z: 21.5, w: 3.6, h: 3.8 }],
          doors: [{ x: 95, z: 21.5, w: 2.4, h: 3.2, door: { lock: 'jammed', name: 'portão leste' } },
            { x: 60, z: 25, w: 1.2 }, { x: 70, z: 25, w: 1.2 }, { x: 80, z: 25, w: 1.2 }, { x: 90, z: 25, w: 1.2 },
            { x: 70, z: 36, w: 1.1, door: { name: 'porta dos fundos' } }, { x: 75, z: 31, door: { name: 'porta interna' } }, { x: 85, z: 31, door: { name: 'porta interna' } }],
          windows: [62, 72, 82, 90].map(x => ({ x, z: 8, w: 1.6, h: 0.9, sill: 2.6, broken: 0.6, bars: -1 })).concat([{ x: 60, z: 36, w: 1.4, broken: 0.5 }, { x: 80, z: 36, w: 1.4, broken: 0.3 }])
        });
        A.roofGable(b, 55, 8, 95, 36, HG, 3.4, M.rust, { over: 0.6, gableMat: M.woodRed, gableTint: [0.7, 0.6, 0.58] });
        for (let x = 59; x < 95; x += 6) A.truss(b, [x, 8], [x, 36], HG - 0.6, 0.6, M.wood, { lod: 'detail' });
        // porta de correr do lado oeste, entreaberta
        new OE.SlideGate({ x: 55.25, y: 0, z: 21.5 - 1.8, w: 3.6, h: 3.8, yaw: -Math.PI / 2, axis: 'x', amount: -2.6, startOpen: 0.7, name: 'portão do estábulo',
          build: bb => { bb.box(M.woodRed, 0, 0, 0, 3.6, 3.8, 0.08); bb.bar(M.wood, [-1.7, 0.1, 0.06], [1.7, 3.7, 0.06], 0.12); bb.bar(M.wood, [1.7, 0.1, 0.06], [-1.7, 3.7, 0.06], 0.12); }, handle: [0, 0] });
        // baias: divisórias de madeira com grades em cima, portões de ferro
        for (let i = 0; i <= 6; i++) { const x = 55.1 + i * 6; if (i > 0 && i < 6) { b.box(M.wood, x, 0, 13.5, 0.12, 1.6, 11); for (let z = 8.4; z < 19; z += 0.25) b.cyl(M.rust, x, 1.6, z, 0.014, 0.014, 0.9, 4, { lod: 'detail' }); b.box(M.iron, x, 2.5, 13.5, 0.06, 0.06, 11, { col: false }); } }
        for (let i = 0; i < 6; i++) {
          const x0 = 55.2 + i * 6, cx = x0 + 3;
          b.box(M.wood, x0 + 1.2, 0, 19, 2.4, 1.3, 0.12); b.box(M.wood, x0 + 4.8, 0, 19, 2.4, 1.3, 0.12);
          Map.cand(cx, 0, 17.4); Map.cand(cx, 0, 20.6);
          const d = new OE.Door({ x: cx, z: 19, y: 0, w: 1.4, h: 1.9, yaw: 0, hinge: -1, kind: 'cage', name: 'portão da baia', startOpen: i % 3 === 0 ? 0.7 : 0 });
          P.hay(b, x0 + 1.2, 9.2, 0.1); P.hay(b, x0 + 1.2, 9.2, 0.1, { y: 0.5 }); if (i % 2) P.hay(b, x0 + 4.5, 10.5, 1.4);
          for (let k = 0; k < 8; k++) b.box(M.hay, x0 + r() * 5.6, 0.01, 8.5 + r() * 10, 0.7, 0.05, 0.5, { yaw: r() * 3, col: false, lod: 'clutter' });
          b.box(M.rust, x0 + 5.3, 0, 9.0, 0.9, 0.55, 0.5, {}); // cocho
          if (i === 1 || i === 4) { P.hay(b, x0 + 0.9, 17.6, 0.1); P.hay(b, x0 + 0.9, 17.6, 0.1, { y: 0.5 }); P.hay(b, x0 + 2.0, 17.9, Math.PI / 2);
            H.behind('hay', x0 + 0.9, 16.6, Math.PI, 0, { crouch: true, side: 0, cat: 'improvisado', exposure: 0.25 }).entry = { x: x0 + 1.4, z: 15.4 }; H.spots[H.spots.length - 1].pos.set(x0 + 1.4, 1, 15.4); }
        }
        P.cage(b, 89, 14, 0, 3.4, 4.4, 2.6, { door: [0.3, 0.6], straw: true });
        for (let x = 60; x < 95; x += 10) P.ceilingLamp(b, x, HG - 0.3, 22, { mode: x === 70 ? 'dying' : 'off', intensity: 1.0, needsPower: x !== 70, group: 'animais' });
        P.emergency(b, 55.3, 3.0, 24, Math.PI / 2, { mode: 'dying' });
        // depósito de ração
        for (let i = 0; i < 9; i++) { const x = 56 + (i % 3) * 0.9, z = 34.8 - Math.floor(i / 3) * 0.6; b.box(M.canvasPlain, x, Math.floor(i / 5) * 0.3, z, 0.8, 0.3, 0.55, { yaw: (r() - 0.5) * 0.2, rx: 0.05, tint: 0xb0a080 }); }
        { const l = P.L(b, 62.5, 33.5, 0), W = 1.6, Dd = 1.0, Hh = 1.0; l.box(M.woodDark, 0, 0, -Dd / 2, W, Hh, 0.05, { col: false }); l.box(M.woodDark, 0, 0, Dd / 2, W, Hh, 0.05, { col: false });
          [-1, 1].forEach(k => l.box(M.woodDark, k * W / 2, 0, 0, 0.05, Hh, Dd, { col: false })); l.box(M.woodDark, 0, 0, 0, W, 0.05, Dd, { col: false });
          const c = l.col(0, 0, 0, W, Hh + 0.06, Dd, 'hide'); const bk = l.p(0, -Dd / 2), g = new THREE.Group(); g.position.set(bk.x, Hh, bk.z); OE.addDyn(g);
          const leaf = OE.partMesh(bb => bb.box(M.woodDark, 0, 0, Dd / 2, W + 0.04, 0.05, Dd + 0.04)); g.add(leaf); g.updateMatrixWorld(true);
          const s = H.inside('trash', 62.5, 33.5, Math.PI, 0, { depth: Dd / 2, camY: 0.8, lid: leaf, exposure: 0.15, lidFn: k => { leaf.rotation.x = -k * 1.2; leaf.updateMatrix(); g.updateMatrixWorld(true); } });
          s.name = 'cocho de ração'; s.colliders = [c]; s.entry = l.p(0, -Dd / 2 - 0.6); s.pos.set(s.entry.x, 1, s.entry.z); s.cam.yaw = 0; }
        P.barrel(b, 63.8, 26.2, {}); P.barrel(b, 64.3, 26.8, {}); P.shelf(b, 57, 25.6, Math.PI, { w: 3, d: 0.5, mat: M.woodDark });
        // área de lavagem
        for (let i = 0; i < 2; i++) { b.box(M.concrete, 68 + i * 4, 0, 33.5, 2.8, 0.8, 1.2); b.box(M.paint, 68 + i * 4, 0.79, 33.5, 2.6, 0.01, 1.0, { col: false, tint: 0x1a1c18, grime: false }); }
        P.pipes(b, [[66, 2.4, 35.7], [74, 2.4, 35.7]], 0.05); P.pipes(b, [[67, 2.4, 35.7], [67, 1.2, 35.7], [67.5, 1.2, 35.3]], 0.03);
        b.cyl(M.iron, 70, 0.005, 29, 0.25, 0.25, 0.01, 12, { lod: 'detail' }); P.fluorescent(b, 70, HG, 30, 0, { mode: 'flicker', intensity: 0.8 });
        b.geo(M.rubber, OE.G.torus(0.35, 0.04, 6, 14), 74.5, 1.4, 30, { yaw: Math.PI / 2 }); // mangueira enrolada
        // equipamentos: bancos de domador, chicotes, aros de fogo, gaiolas pequenas
        for (let i = 0; i < 4; i++) { b.cyl(i % 2 ? M.metalRed : M.metalBlue, 77 + i * 1.6, 0, 27.4, 0.4, 0.5, 0.6, 12, { col: true }); }
        P.cage(b, 82.5, 33, 0, 1.6, 1.2, 1.2, {}); P.cage(b, 78.5, 33.6, 0.3, 1.2, 1.0, 1.0, {});
        b.geo(M.metalYellow, OE.G.torus(0.7, 0.04, 5, 22), 84.6, 1.2, 28, { yaw: Math.PI / 2 }); P.crateStack(b, 76.2, 34.8, 0, 2);
        H.wardrobe(b, 84.4, 34.9, Math.PI, { w: 1.2, mat: M.woodDark });
        // selaria
        P.table(b, 90, 30.5, 0, { w: 2.2, d: 0.9 }); H.under('table', 90, 30.5, 0, 0, 0.7, { depth: 0.45 });
        for (let i = 0; i < 5; i++) b.box(M.rubber, 86 + i * 1.6, 1.2, 35.75, 0.5, 0.6, 0.15, { col: false, lod: 'detail', rz: 0.1 });
        P.ceilingLamp(b, 90, HG, 30, { mode: 'off' }); new OE.Note({ x: 90.2, y: 0.8, z: 30.5, title: 'Caderno do tratador', text: 'Os animais foram levados em fevereiro. As jaulas ficaram.\nMesmo assim, toda noite, alguma coisa anda pelas baias.\nA escada do galpão desce até o túnel do subsolo. A porta lá embaixo só abre pelo lado do túnel.' });
        // ---- pátio: carroças-jaula, jaula dos leões, bebedouro ----
        [[52, -14, 0.05, M.woodRed], [61, -15, -0.08, M.woodGreen], [70, -14.5, 0.1, M.metalBlue], [79, -15.5, -0.05, M.woodRed]].forEach(([x, z, y, m], i) => P.cageWagon(b, x, z, y, { mat: m, open: i === 2 }));
        // jaula dos leões (grande, porta aberta)
        P.cage(b, 72, -1, 0, 10, 7, 3.4, { door: [0.42, 0.58], floor: true, straw: true }); Map.cand(72, 0, 4.0); Map.cand(72, 0.1, 1.2);
        b.box(M.metalYellow, 72, 0.1, -2, 0.6, 0.6, 0.6, {}); b.cyl(M.metalRed, 69, 0.1, 0.5, 0.45, 0.55, 0.65, 12, { col: true });
        b.box(M.concrete, 52, 0, 4, 3, 0.6, 0.8); b.box(M.paint, 52, 0.58, 4, 2.8, 0.01, 0.6, { col: false, tint: 0x2a2c20, grime: false }); // bebedouro
        // estacas com correntes (elefantes)
        [[86, 2], [90, 2], [94, 2]].forEach(([x, z]) => { b.cyl(M.iron, x, 0, z, 0.12, 0.14, 1.0, 8, { col: true }); for (let k = 0; k < 10; k++) b.geo(M.iron, OE.G.torus(0.06, 0.015, 4, 8), x + 0.15 + k * 0.12, 0.02, z + Math.sin(k) * 0.2, { rx: Math.PI / 2, yaw: k % 2 ? 0 : Math.PI / 2, lod: 'clutter' }); });
        P.lampPost(b, 50, 0, { mode: 'dying', intensity: 1.2 }); P.lampPost(b, 88, -8, { broken: true }); P.lampPost(b, 66, 40, { mode: 'flicker', intensity: 1.2 });
        P.trashBin(b, 49.5, 30, 0.3, { big: true }); P.bottles(b, 58, -5, 0);
        // ---- galpão de manutenção (escada de serviço do subsolo) ----
        A.plan(b, { y: 0, h: 3.2, ext: M.metalGreen, wall: M.concrete, floor: null, ceil: M.concreteDark, doorMat: M.metalGray,
          rooms: [{ id: 'gal', r: [88, -18, 100, -6] }],
          doors: [{ x: 96.5, z: -6, w: 1.1, door: { kind: 'metal', mat: M.metalGray, name: 'porta do galpão' } }],
          windows: [{ x: 100, z: -12, w: 1.2, broken: 0.6 }, { x: 88, z: -9, w: 1.2, broken: 0.4 }] });
        A.subtract([88, -18, 100, -6], [OE.HOLES[1]]).forEach(q => b.box(M.concreteDark, (q[0] + q[2]) / 2, -0.01, (q[1] + q[3]) / 2, q[2] - q[0], 0.022, q[3] - q[1], { col: false, grime: false }));
        A.stairs(b, { x: 92, z: -11.6, y0: 0, y1: -4.5, dir: [0, -1], w: 2.0, run: 0.3, mat: M.concrete, nosing: true });
        A.railing(b, [90.8, -16.4], [90.8, -11.6], 0, {}); A.railing(b, [93.2, -16.4], [93.2, -11.6], 0, {}); A.railing(b, [90.8, -16.45], [93.2, -16.45], 0, {});
        P.generatorProp(b, 97, -15.5, Math.PI / 2); P.shelf(b, 99.4, -9, -Math.PI / 2, { w: 2.2, d: 0.5 }); P.barrel(b, 89, -7, { mat: M.metalRed }); P.barrel(b, 89.6, -7.3, {});
        P.fluorescent(b, 94, 3.2, -12, Math.PI / 2, { mode: 'dying', intensity: 0.8 }); P.emergency(b, 92, 2.5, -17.85, 0, {});
        H.wardrobe(b, 99.4, -16.6, -Math.PI / 2, { kind: 'locker' });
        def._grass = [[46, -23, 101, -18], [46, 38, 101, 44], [96, -5, 102, 44], [46, -10, 54, 8], [86, 37, 101, 44]];
        def._trees = [[98, 40, 1], [47, 42, 0.9], [100, -22, 1.1]];
        Map.stairNav([[92, 0, -10.6], [92, -4.5, -16.9]]);
        Map.cp('Área dos animais', 50, 0, 17, -Math.PI / 2, 3);
      },
      after(def) { OE.Veg.grass(def, def._grass, 2.0); OE.Veg.trees(def, def._trees, {}); },
      detail(b) { const P = OE.Props; P.planks(b, 98, 20, 5); P.debris(b, 60, 0, 3); P.papers(b, 90, 32, 5); }
    });
  };
})(window.OE);

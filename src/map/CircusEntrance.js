'use strict';
/* SETOR A — Entrada principal.
   Portão de ferro acorrentado sob o arco com o letreiro, duas bilheterias que fazem parte da
   cerca (a da esquerda tem porta dos fundos: é uma das entradas alternativas), guarita de segurança
   (com a chave do cadeado: abre o portão por dentro = atalho), estacionamento com carros
   abandonados, outdoor, catracas, postes queimados e mato crescendo pelas bordas.
   Entradas alternativas: bilheteria oeste, buraco na cerca a oeste (x≈-49), buraco a leste (x≈42). */
(function (OE) {
  OE.Map.CircusEntrance = function () {
    OE.Sectors.define({
      name: 'Entrada', label: 'Setor A · entrada principal', bounds: [-45, 60, 45, 135],
      build(b, def) {
        const M = OE.MAT, A = OE.Arch, P = OE.Props, r = b.r, Map = OE.Map;
        // ---- pilares e arco do portão ----
        [-1, 1].forEach(k => {
          b.box(M.brick, k * 5.1, 0, 100, 1.1, 5.6, 1.1); b.box(M.concrete, k * 5.1, 5.6, 100, 1.3, 0.3, 1.3, { lod: 'detail' });
          b.cyl(M.metalRed, k * 5.1, 5.9, 100, 0.25, 0.35, 0.5, 8, { lod: 'detail' }); b.geo(M.metalRed, OE.G.sphere(0.32, 10, 8), k * 5.1, 6.6, 100, { lod: 'detail' });
          P.poster(b, k * 5.1, 2.4, 100.56, 0, k > 0 ? 0 : 1, 1.1);
        });
        // arco de ferro com lâmpadas e o letreiro
        const arc = OE.G.custom('gateArc', () => new THREE.TorusGeometry(5.1, 0.09, 6, 32, Math.PI));
        b.geo(M.rust, arc, 0, 5.9, 100, {}); b.geo(M.rust, OE.G.custom('gateArc2', () => new THREE.TorusGeometry(4.6, 0.06, 6, 32, Math.PI)), 0, 5.9, 100, { lod: 'detail' });
        for (let i = 0; i < 9; i++) { const a = (i + 0.5) / 9 * Math.PI; b.bar(M.rust, [Math.cos(a) * 4.6, 5.9 + Math.sin(a) * 4.6, 100], [Math.cos(a) * 5.1, 5.9 + Math.sin(a) * 5.1, 100], 0.05, { lod: 'detail' }); }
        b.box(M.woodRed, 0, 8.2, 100, 8.6, 1.3, 0.12, { col: false }); P.sign(b, 0, 8.85, 100.08, 0, 0, 8.2); P.sign(b, 0, 8.85, 99.92, Math.PI, 0, 8.2);
        for (let i = 0; i < 22; i++) { const x = -4.1 + i * 8.2 / 21, live = i === 6 || i === 13 || i === 17;
          OE.Lights.add({ x, y: 9.0 + 0.62, z: 100.12, size: 0.05, color: 0xffd080, intensity: live ? 0.7 : 0, mode: live ? 'dying' : 'off', range: 6, noLight: i !== 13 });
          OE.Lights.add({ x, y: 9.0 - 0.6, z: 100.12, size: 0.05, color: 0xffd080, intensity: 0, mode: 'off', noLight: true }); }
        // folhas do portão: esquerda presa com cadeado (chave na guarita), direita emperrada
        const leaf = (x, hinge, lock) => new OE.Door({ x, z: 100, y: 0, w: 4.4, h: 3.0, yaw: 0, hinge, kind: 'bars', lock, name: 'portão', maxAngle: 95 });
        // a história: o portão está ABERTO na chegada (fecha sozinho quando você entra — Story.trap)
        leaf(-2.25, -1, null).startOpen = 0; leaf(2.25, 1, null);
        OE.doors.filter(d => d.name === 'portão').forEach(d => { d.angle = d.target = d.maxAng * 0.92; d.open = true; d._apply(); });
        b.box(M.rust, 0, 0, 100, 0.25, 0.1, 0.25, { lod: 'detail' });
        for (let i = 0; i < 9; i++) b.geo(M.iron, OE.G.torus(0.05, 0.012, 4, 8), -0.1 + Math.sin(i) * 0.05, 1.0 + i * 0.07, 100.1, { yaw: i % 2 ? 1.57 : 0, lod: 'clutter' });
        b.box(M.metalYellow, 0.05, 0.85, 100.15, 0.12, 0.14, 0.05, { lod: 'clutter', col: false });
        // ---- bilheterias (fazem parte da cerca) ----
        const booth = (x0, locked) => {
          const x1 = x0 + 3, made = A.plan(b, { y: 0, h: 2.7, ext: M.woodRed, wall: M.wallpaperRed, floor: M.wood, ceil: M.woodCream, doorMat: M.woodCream,
            rooms: [{ id: 'bil', r: [x0, 98.5, x1, 101.5] }],
            doors: [{ x: x0 + 2.25, z: 101.5, w: 0.9, door: { lock: locked ? 'jammed' : null, name: 'porta da bilheteria' } }, { x: x0 + 1.5, z: 98.5, w: 0.9, door: { lock: locked ? 'jammed' : null, name: 'porta dos fundos' } }],
            windows: [{ x: x0 + 0.95, z: 101.5, w: 1.2, h: 0.9, sill: 1.0, broken: locked ? 0.2 : 0.9 }] });
          A.roofGable(b, x0, 98.5, x1, 101.5, 2.7, 1.1, M.metalRed, { over: 0.35, gableMat: M.woodCream });
          P.sign(b, x0 + 1.5, 3.05, 101.75, 0, 1, 2.6);
          P.table(b, x0 + 0.95, 100.9, 0, { w: 1.6, d: 0.6, h: 0.95, mat: M.woodDark });
          if (!locked) { OE.Hiding.under('table', x0 + 0.95, 100.9, Math.PI, 0, 0.85, { depth: 0.3, exposure: 0.45 }); P.papers(b, x0 + 1.5, 99.5, 6); }
          P.wallLamp(b, x0 + 1.5, 2.2, 98.62, 0, { mode: locked ? 'off' : 'dying', intensity: 0.8 });
          b.box(M.metalGray, x0 + 2.3, 0.95, 101.0, 0.4, 0.25, 0.3, { lod: 'detail', col: false }); // caixa registradora
          // catracas e grades de fila do lado de fora
          for (let i = 0; i < 3; i++) A.railing(b, [x0 + 0.2 + i * 1.3, 102.2], [x0 + 0.2 + i * 1.3, 106], 0, { h: 1.0, post: 1.9 });
          return made;
        };
        booth(-11, false); booth(8, true);
        // muros curtos entre bilheteria e pilares
        b.box(M.brick, -6.3, 0, 100, 1.7, 2.4, 0.3); b.box(M.brick, 6.3, 0, 100, 1.7, 2.4, 0.3);
        // ---- guarita de segurança (dentro) ----
        const g = A.plan(b, { y: 0, h: 2.6, ext: M.concrete, wall: M.plasterGreen, floor: M.concreteDark, ceil: M.concreteDark,
          rooms: [{ id: 'gua', r: [12, 90, 16.5, 95] }],
          doors: [{ x: 12, z: 92.5, w: 0.9, door: { name: 'porta da guarita', kind: 'metal', mat: M.metalGreen } }],
          windows: [{ x: 14.25, z: 95, w: 2.4, h: 1.0, sill: 1.0, broken: 0.6 }, { x: 12, z: 94.1, w: 1.0, h: 0.9, sill: 1.0, broken: 0.5 }, { x: 16.5, z: 92.5, w: 1.6, h: 0.9, sill: 1.1, broken: 0.3 }] });
        A.roofFlat(b, 12, 90, 16.5, 95, 2.6);
        P.desk(b, 14.6, 94.1, Math.PI, { drawer: true });
        OE.Hiding.wardrobe(b, 16.05, 91.0, -Math.PI / 2, { kind: 'locker' });
        P.panel(b, 13, 1.1, 90.2, 0); P.ceilingLamp(b, 14.25, 2.6, 92.5, { mode: 'dying', intensity: 0.9 });
        new OE.Note({ x: 14.2, y: 0.8, z: 93.9, title: 'Livro de ocorrências (última página)', text: '14/03/1987 — 21h40\nAs luzes da lona apagaram. A música continuou. Depois, os gritos.\nQuando a luz voltou, a plateia estava vazia. Ninguém saiu pelo portão. Eu estava aqui.\n\n15/03 — O Mestre de Cerimônias passou pela guarita às 3h. Fez uma reverência para mim.\nEle disse que o espetáculo ainda não terminou.\nEu não volto lá dentro.' });
        OE.Story.place('ingresso', -9.6, 0.96, 100.85, 0.4);
        // ---- fora da cerca: estacionamento, outdoor, carros ----
        P.car(b, -33, 108, 0.3, { mat: M.metalBlue, vines: true }); P.car(b, -24, 112, -0.15, { mat: M.metalRed }); P.car(b, -14, 107.5, 1.65, { mat: M.metalGreen, vines: true });
        P.car(b, 27, 113, Math.PI + 0.4, { mat: M.metalYellow }); P.truck(b, -32, 116.5, 0.05, {});
        b.box(M.wood, -20, 0, 117.5, 0.3, 5, 0.3); b.box(M.wood, -14, 0, 117.5, 0.3, 5, 0.3);
        b.box(M.wood, -17, 3.0, 117.5, 7, 3.4, 0.15, { col: false }); P.poster(b, -18.8, 4.6, 117.6, 0, 0, 3.2); P.poster(b, -15.2, 4.6, 117.6, 0, 7, 3.2);
        // ---- praça interna ----
        P.lampPost(b, 9, 108, { mode: 'flicker' }); P.lampPost(b, -9, 108, { broken: true }); P.lampPost(b, 30, 121, { mode: 'dying' });
        P.lampPost(b, 6, 84, { mode: 'dying', intensity: 1.3 }); P.lampPost(b, -6, 70, { broken: true, lean: 0.12 }); P.lampPost(b, 6, 52, { broken: true }); P.lampPost(b, -6, 40, { mode: 'flicker', intensity: 1.2 });
        P.bench(b, -5, 77, Math.PI / 2, { park: true }); P.bench(b, 5, 62, -Math.PI / 2, { park: true });
        OE.Hiding.under('bench', -5.1, 77, -Math.PI / 2, 0, 0.42, { depth: 0.25, exposure: 0.55, camOff: 0 });
        P.trashBin(b, -6.5, 74.5, 0); P.trashBin(b, 7.5, 70, 0.4, { big: true });
        P.dumpster(b, 18.5, 88, -Math.PI / 2);
        P.truck(b, 22, 70, -1.2, { box: M.woodGreen });
        // carrocinha de pipoca
        { const l = P.L(b, -11, 66, 0.5); l.box(M.woodRed, 0, 0.5, 0, 1.6, 1.0, 0.9); l.box(M.glass, 0, 1.5, 0, 1.5, 0.8, 0.85, { col: false }); l.box(M.woodCream, 0, 2.3, 0, 1.8, 0.12, 1.1, { col: false });
          [-1, 1].forEach(k => l.cyl(M.woodDark, k * 0.7, 0.4, 0.5, 0.4, 0.4, 0.06, 12, { rx: Math.PI / 2 })); P.sign(b, -11 + Math.sin(0.5) * 0.47, 2.05, 66 + Math.cos(0.5) * 0.47, 0.5, 1, 1.4); }
        P.bottles(b, 3, 93, 0); P.bottles(b, -15, 82, 0);
        P.crateStack(b, 23, 84, 0.3, 2); P.crate(b, 24.4, 84.5, 0.1, { s: 0.9 }); OE.Hiding.behind('crates', 23.5, 82.8, 0, 0, { crouch: true, side: 0.9, cat: 'improvisado', exposure: 0.3 });
        // quiosque de souvenires fechado com tábuas
        { const k = A.plan(b, { h: 2.6, ext: M.woodGreen, wall: M.wood, floor: M.wood, ceil: M.wood, rooms: [{ id: 'k', r: [-22, 84, -17, 88] }], doors: [{ x: -17, z: 86, w: 0.9, door: { lock: 'jammed', name: 'quiosque' } }], windows: [{ x: -19.5, z: 84, w: 2.5, h: 1.0, sill: 0.95, broken: 0.4 }] });
          A.roofGable(b, -22, 84, -17, 88, 2.6, 1.0, M.canvas, { over: 0.6, flip: true });
          for (let i = 0; i < 4; i++) b.box(M.wood, -19.5, 1.05 + i * 0.25, 83.85, 2.8, 0.18, 0.04, { rz: (r() - 0.5) * 0.15, col: false, lod: 'detail' }); }
        // postes de cerca de madeira e placas velhas
        P.sign(b, 0, 2.4, 96.5, Math.PI, 6, 2.2); b.box(M.wood, -1.2, 0, 96.5, 0.1, 2.2, 0.1); b.box(M.wood, 1.2, 0, 96.5, 0.1, 2.2, 0.1);
        // mato alto nas bordas do caminho e junto da cerca
        def._grass = [[-40, 101, 40, 106], [-4, 70, -3, 98], [3, 70, 4, 98], [-30, 90, -5, 99], [5, 90, 30, 99], [-44, 60, -14, 80], [14, 46, 40, 66], [-40, 128, 60, 140]];
        def._trees = [[-38, 96, 1.1], [-26, 93, 0.9], [34, 92, 1.2], [38, 80, 1], [-36, 70, 1.05], [-42, 132, 1.2], [-10, 134, 1], [18, 136, 1.3], [44, 131, 0.9], [36, 108, 1]];
        // checkpoints e navegação
        Map.cp('Estrada', 0, 0, 128, 0, 4); Map.cp('Praça de entrada', 0, 0, 62, 0, 5);
        for (let x = -36; x <= 40; x += 6) Map.cand(x, 0, 104); for (let x = -36; x <= 40; x += 8) { Map.cand(x, 0, 114); Map.cand(x, 0, 130); }
        Map.cand(-9.5, 0, 100); Map.cand(14.25, 0, 92.5); Map.cand(0, 0, 97); Map.cand(0, 0, 103);
        def.after = () => { OE.Veg.grass(def, def._grass, 2.2, (x, z) => Math.abs(x) < 4 && z < 120); OE.Veg.trees(def, def._trees, { leaves: true }); };
      },
      detail(b) {
        const P = OE.Props, r = b.r;
        P.papers(b, 2, 88, 10); P.papers(b, -3, 104, 8); P.debris(b, 8, 103, 2); P.planks(b, -14, 92, 4);
        for (let i = 0; i < 18; i++) b.box(OE.MAT.leaves, (r() - 0.5) * 70, 0.01, 60 + r() * 70, 0.6, 0.01, 0.6, { yaw: r() * 6, col: false, lod: 'clutter', grime: false });
      }
    });
  };
})(window.OE);

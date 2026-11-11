'use strict';
/* SETOR E — Depósito e almoxarifado.
   Galpão de 40 x 38 m com pé-direito de 9 m, tesouras de aço, janelas altas quebradas.
   Porta de enrolar ao sul emperrada a 1 m do chão (só se passa agachado; com energia, abre),
   porta oeste com ferrolho por dentro (atalho para os bastidores), porta leste para o pátio.
   Dentro: corredores de porta-paletes, labirinto de caixotes, contêiner aberto, objetos de circo
   cobertos por lonas, barris, carrinhos, bancada de ferramentas, armários industriais e um mezanino
   com escritório (o Fusível do gerador está na gaveta da escrivaninha). */
(function (OE) {
  OE.Map.Warehouse = function () {
    OE.Sectors.define({
      name: 'Deposito', label: 'Setor E · depósito', bounds: [37, -71, 79, -31], interiorRange: 9, priority: 2,
      build(b) {
        const M = OE.MAT, A = OE.Arch, P = OE.Props, H = OE.Hiding, Map = OE.Map, r = b.r;
        const HG = 9, MZ = 3.6;
        A.plan(b, {
          y: 0, h: HG, t: 0.3, ext: M.metalGray, extTint: [0.75, 0.72, 0.7], wall: M.concrete, floor: M.concreteDark, ceil: null,
          rooms: [{ id: 'gal', r: [38, -70, 78, -32] }],
          doors: [{ x: 38, z: -49, w: 1.1, door: { lock: 'bolt', boltSide: 1, kind: 'metal', mat: M.metalGray, name: 'porta oeste' } },
            { x: 78, z: -45, w: 1.1, door: { kind: 'metal', mat: M.metalGray, name: 'porta leste' } },
            { x: 58, z: -70, w: 1.1, door: { lock: 'jammed', kind: 'metal', mat: M.metalGray, name: 'porta norte' } }],
          open: [{ x: 58, z: -32, w: 5, h: 4.6 }],
          windows: [45, 51, 65, 71].map(x => ({ x, z: -70, w: 2.6, h: 1.6, sill: 5.6, broken: 0.6 })).concat([45, 71].map(x => ({ x, z: -32, w: 2.6, h: 1.6, sill: 5.6, broken: 0.7 })))
            .concat([-62, -40].map(z => ({ x: 38, z, w: 2.6, h: 1.6, sill: 5.6, broken: 0.5 }))).concat([-62, -38].map(z => ({ x: 78, z, w: 2.6, h: 1.6, sill: 5.6, broken: 0.8 })))
        });
        P.sign(b, 58, 5.3, -31.8, 0, 3, 3.6);
        A.roofGable(b, 38, -70, 78, -32, HG, 3.2, M.rust, { over: 0.4, gableMat: M.metalGray, flip: true });
        for (let x = 41; x < 78; x += 5) A.truss(b, [x, -70], [x, -32], HG - 1.0, 0.9, M.iron);
        // porta de enrolar (emperrada a ~1 m; sem energia não sobe)
        const roll = new OE.SlideGate({ x: 58, y: 0, z: -32.35, w: 5, h: 4.6, yaw: 0, axis: 'y', amount: 4.4, startOpen: 0.24, closedAt: 0.24, lock: 'power', name: 'porta de enrolar',
          lockLabel: 'Porta de enrolar · emperrada (sem energia)', lockMsg: 'O motor está sem energia. Dá para passar agachado por baixo.',
          build: bb => { for (let y = 0.05; y < 4.6; y += 0.13) bb.box(M.metalGray, 0, y, 0, 5, 0.11, 0.05, { tint: [0.7 + Math.sin(y * 7) * 0.05, 0.68, 0.66] }); bb.box(M.iron, 0, 0, 0.03, 5.02, 0.08, 0.08); } });
        b.box(M.iron, 58, 4.6, -32.5, 5.6, 0.7, 0.5, { col: false }); // caixa do rolo
        OE.on('power', () => { roll.lock = null; });
        // ---- porta-paletes (corredores) ----
        [41.2, 44.7, 48.2, 51.7].forEach((x, i) => P.palletRack(b, x, -53 - (i % 2) * 0.5, Math.PI / 2, i === 2 ? 18 : 24, {}));
        P.palletRack(b, 48.2, -38.2, Math.PI / 2, 5, {});
        // ---- labirinto de caixotes (leste) ----
        const stacks = [[64, -55], [66.5, -55], [69, -55], [72.5, -55], [75.5, -55], [64, -51.5], [69, -51.5], [72, -51.5], [76.5, -50.5], [65.5, -47.5], [68, -47.5], [73.5, -47], [64, -43.5], [70.5, -43.5], [73, -43.5], [76, -42], [67, -39.5], [72, -39]];
        stacks.forEach(([x, z], i) => { const n = 1 + ((i * 7) % 3); P.crateStack(b, x, z, (r() - 0.5) * 0.2, n, { s: 1.2 }); if (r() < 0.5) P.crate(b, x + 1.25, z + (r() - 0.5) * 0.4, r(), { s: 1.0 }); });
        H.behind('crates', 70.2, -51.5, Math.PI / 2, 0, { crouch: true, side: 0, cat: 'improvisado', exposure: 0.3 }).entry = { x: 70.2, z: -49.6 };
        H.behind('crates', 75.2, -46.6, 0, 0, { crouch: true, side: 0, cat: 'improvisado', exposure: 0.28 }).entry = { x: 75.3, z: -45.0 };
        H.spots.slice(-2).forEach(s => s.pos.set(s.entry.x, 1, s.entry.z));
        // caixote gigante aberto (improvisado: entra e fecha a tampa)
        { const l = P.L(b, 66.6, -36.4, 0.15), W = 1.9, Dd = 1.5, Hh = 1.5, m = M.wood;
          l.box(m, 0, 0, -Dd / 2, W, Hh, 0.06, { col: false }); [-1, 1].forEach(k => l.box(m, k * W / 2, 0, 0, 0.06, Hh, Dd, { col: false })); l.box(m, 0, 0, 0, W, 0.06, Dd, { col: false });
          l.box(m, 0, 0, Dd / 2, W, Hh * 0.35, 0.06, { col: false });
          const c = l.col(0, 0, 0, W, Hh, Dd, 'hide');
          const lidG = new THREE.Group(), bk = l.p(0, Dd / 2); lidG.position.set(bk.x, Hh * 0.35, bk.z); lidG.rotation.y = 0.15; OE.addDyn(lidG);
          const leaf = OE.partMesh(bb => bb.box(m, 0, 0, 0, W, Hh * 0.65, 0.06)); lidG.add(leaf); leaf.rotation.x = 1.45; leaf.updateMatrix(); lidG.updateMatrixWorld(true);
          const s = H.inside('crate', 66.6, -36.4, 0.15, 0, { depth: Dd / 2, camY: 0.75, exposure: 0.2, lid: leaf, lidFn: k => { leaf.rotation.x = 1.45 * k; leaf.updateMatrix(); lidG.updateMatrixWorld(true); } });
          s.colliders = [c]; s.anim.fn(1); }
        // ---- área central: contêiner, lonas, barris ----
        P.container(b, 57.2, -66.6, 0, { mat: M.metalBlue });
        P.tarpCovered(b, 57, -45, 0.3, 3.2, 1.6, 2.0, { seed: 1 });             // carro coberto
        P.tarpCovered(b, 59.5, -51.5, -0.2, 1.4, 1.9, 1.2, { seed: 2, tint: 0x8a7060 }); // cavalo de carrossel
        P.tarpCovered(b, 55.5, -40.2, 1.2, 2.2, 1.2, 1.4, { seed: 3 });
        H.behind('equipment', 60.2, -45.2, -Math.PI / 2, 0, { crouch: true, side: 0, exposure: 0.35 }).entry = { x: 61.6, z: -45.6 }; H.spots[H.spots.length - 1].pos.set(61.6, 1, -45.6);
        for (let i = 0; i < 7; i++) P.barrel(b, 55 + (i % 3) * 0.65, -57 + Math.floor(i / 3) * 0.65, { fallen: i === 6 });
        // roda de carroça e peças de circo
        b.cyl(M.woodRed, 60.5, 0.9, -38, 0.9, 0.9, 0.12, 18, { rx: Math.PI / 2, yaw: 0.4, rz: 0.15 }); b.colCyl(60.5, -38, 0.5, 0, 1.8, 'prop');
        b.cyl(M.metalYellow, 53.4, 0, -35, 0.7, 0.7, 0.9, 14, { col: true }); b.cyl(M.metalRed, 53.4, 0.9, -35, 0.6, 0.6, 0.7, 14, {});
        // carrinhos de transporte
        [[54, -61.5, 0.4], [62.5, -40, -0.9]].forEach(([x, z, y]) => { const l = P.L(b, x, z, y); l.box(M.metalGray, 0, 0.18, 0, 1.2, 0.05, 0.75); l.box(M.iron, -0.62, 0.18, 0, 0.04, 1.0, 0.7, { col: false }); [[-0.5, -0.3], [-0.5, 0.3], [0.5, -0.3], [0.5, 0.3]].forEach(([a, c]) => l.cyl(M.rubber, a, 0.09, c, 0.09, 0.09, 0.05, 10, { rx: Math.PI / 2, lod: 'detail' }));
          P.cardboard(b, x, z, y, { y: 0.23, col: false }); l.col(0, 0, 0, 1.25, 0.9, 0.8, 'prop'); });
        // ---- mezanino ----
        b.box(M.wood, 69.75, MZ - 0.25, -63.75, 15.5, 0.25, 11.5, { tag: 'wood' });
        b.box(M.iron, 69.75, MZ - 0.45, -58.1, 15.5, 0.2, 0.2, { col: false });
        [62.2, 66, 70, 74, 77.3].forEach(x => A.column(b, x, -58.2, 0, MZ - 0.25, { mat: M.metalBlue, w: 0.25 }));
        A.stairs(b, { x: 56, z: -59, y0: 0, y1: MZ, dir: [1, 0], w: 1.2, run: 0.5, mat: M.metalGray, rails: [1, -1], tag: 'metal', solid: false });
        A.railing(b, [62.1, -58.05], [77.6, -58.05], MZ, { h: 1.05 }); A.railing(b, [62.05, -69.6], [62.05, -59.7], MZ, { h: 1.05 });
        const off = A.plan(b, { y: MZ, h: 2.9, ext: M.woodCream, wall: M.wallpaperGreen, floor: M.wood, ceil: M.plaster, floorCol: true, floorTag: 'wood',
          rooms: [{ id: 'esc', r: [66, -69.5, 77.5, -62] }],
          doors: [{ x: 71.5, z: -62, door: { name: 'porta do escritório', lock: 'key:chave_deposito' } }],
          windows: [{ x: 66, z: -66, w: 2.2, broken: 0.6 }, { x: 74.5, z: -62, w: 1.8, broken: 0.3 }] });
        // escritório do almoxarife
        b.layer = 'interior';
        P.desk(b, 72, -68.6, Math.PI, { item: 'fusivel' }); P.fileCabinet(b, 67.2, -63.5, Math.PI / 2); P.fileCabinet(b, 67.2, -64.2, Math.PI / 2);
        P.shelf(b, 76.9, -66, -Math.PI / 2, { w: 2.4, d: 0.4, mat: M.woodDark }); H.wardrobe(b, 69.0, -69.0, 0, { w: 1.1 });
        H.under('table', 72, -68.6, 0, MZ, 0.7, { depth: 0.35, exposure: 0.35 });
        P.fluorescent(b, 71.5, MZ + 2.9, -65.5, 0, { mode: 'flicker', intensity: 0.9, needsPower: true, group: 'deposito' }); P.wallLamp(b, 72, MZ + 1.6, -69.3, 0, { mode: 'dying', intensity: 0.7 });
        new OE.Note({ x: 71.7, y: MZ + 0.8, z: -68.3, title: 'Lista de material', text: 'Gerador do subsolo: queimou o fusível de novo.\nGuardei o fusível novo na gaveta da minha mesa.\nA chave do escritório fica pendurada perto da bancada lá embaixo.\n— Almoxarife' });
        // a chave do escritório: na bancada embaixo do mezanino
        new OE.Pickup({ x: 70.5, y: 0.95, z: -60.4, item: 'chave_deposito' });
        // embaixo do mezanino: bancada, armários industriais (esconderijo), ferramentas
        P.table(b, 70.5, -60.4, 0, { w: 2.6, d: 0.8, h: 0.92, mat: M.woodDark }); H.under('table', 70.5, -60.4, 0, 0, 0.85, { depth: 0.4, exposure: 0.4 });
        b.box(M.woodDark, 70.5, 1.2, -60.85, 2.4, 1.2, 0.04, { col: false }); for (let i = 0; i < 8; i++) b.box(M.iron, 69.5 + i * 0.28, 1.4 + (i % 3) * 0.2, -60.8, 0.04, 0.3, 0.03, { col: false, lod: 'clutter' });
        for (let i = 0; i < 5; i++) { const z = -62 - i * 0.62; if (i === 1 || i === 3) H.wardrobe(b, 77.3, z, -Math.PI / 2, { kind: 'locker', mat: M.metalBlue }); else P.L(b, 77.3, z, -Math.PI / 2).box(M.metalBlue, 0, 0, 0, 0.6, 1.95, 0.55); }
        P.shelf(b, 64, -69.3, 0, { w: 3, d: 0.5 }); P.cardboardPile(b, 63.5, -66, 3); P.barrel(b, 74, -66, {}); P.barrel(b, 74.6, -66.5, {});
        // luzes industriais (com energia) + emergência
        [[45, -45], [45, -60], [58, -50], [70, -45], [58, -38]].forEach(([x, z], i) => P.ceilingLamp(b, x, HG - 1.2, z, { mode: i === 2 ? 'dying' : 'steady', intensity: 1.6, range: 14, needsPower: i !== 2, group: 'deposito', shade: M.metalGray }));
        P.emergency(b, 38.2, 2.4, -49, Math.PI / 2, {}); P.emergency(b, 58, 2.4, -69.8, 0, { mode: 'dying' });
        new OE.Switch({ x: 77.75, y: 1.4, z: -46.3, yaw: -Math.PI / 2, lights: 'deposito', needsPower: true, name: 'luzes do depósito', on: false });
        P.bottles(b, 46.4, -44, 0); P.bottles(b, 62.5, -53.5, 0);
        // caçamba do lado de fora e paletes
        P.dumpster(b, 82, -34, Math.PI); for (let i = 0; i < 4; i++) b.box(M.wood, 34.5, i * 0.15, -36 - i * 0.05, 1.2, 0.14, 1.0, { yaw: i * 0.1 });
        // navegação do mezanino
        Map.stairNav([[55.3, 0, -59], [62.6, MZ, -59], [64, MZ, -60.2]]);
        [[66, -60], [70, -60], [74, -60], [76.5, -60]].forEach(([x, z]) => Map.cand(x, MZ, z));
        Map.cp('Depósito', 58, 0, -36, Math.PI, 3);
      },
      detail(b) { const P = OE.Props; P.papers(b, 72, -65, 8, 3.6); P.planks(b, 46, -36, 4); P.debris(b, 76, -68, 2); P.cardboardPile(b, 43, -35, 2); P.papers(b, 58, -55, 6); }
    });
  };
})(window.OE);

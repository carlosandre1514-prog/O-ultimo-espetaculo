'use strict';
/* SETOR H — Subsolo e áreas restritas (y = -4,5 m).
   Concreto nu, tubulações, cabos, luzes fluorescentes mortas (voltam com o gerador) e luzes de
   emergência vermelhas. Desce-se pela escada dos bastidores (porta trancada) ou pela escada de serviço
   do galpão dos animais (porta com ferrolho do lado do túnel = atalho de volta).
   Salas: patamar, corredor oeste, casa do gerador (fusível), sala elétrica, depósito, duto técnico
   (só agachado: o inimigo não passa), túnel leste com porta corta-fogo, sala de ventilação com
   exaustores, casa de bombas, depósito 2 — e uma SALA SECRETA atrás de uma estante empurrável. */
(function (OE) {
  const Y = -4.5, HG = 4.1;
  OE.Map.Underground = function () {
    OE.Sectors.define({
      name: 'Subsolo', label: 'Setor H · subsolo', bounds: [-25, -67, 95, -11], underground: true, floorY: Y, priority: 3,
      build(b) {
        const M = OE.MAT, A = OE.Arch, P = OE.Props, H = OE.Hiding, Map = OE.Map, r = b.r;
        A.plan(b, {
          y: Y, h: HG, t: 0.3, ext: M.concreteDark, wall: M.concrete, floor: M.concreteDark, ceil: M.concreteDark, floorCol: true, plinth: false, doorKind: 'metal', doorMat: M.metalGray, frameMat: M.iron,
          rooms: [
            { id: 'pocoA', r: [18, -47, 21, -42], ceil: null, nav: false },
            { id: 'pat', r: [16, -42, 23, -35.5] },
            { id: 't0', r: [-24, -41, 16, -38] },
            { id: 'ger', r: [0, -54, 14, -41], wall: M.brick },
            { id: 'ele', r: [-12, -50, 0, -41], wall: M.plasterBlue },
            { id: 'duto', r: [-12, -53.5, 0, -52], h: 1.2, nav: false, crawl: true },
            { id: 'dep', r: [-24, -54, -12, -41] },
            { id: 'pas', r: [-20, -56, -18, -54], nav: false, wall: M.brick },
            { id: 'sec', r: [-24, -66, -14, -56], wall: M.wallpaperRed, floor: M.wood, nav: false },
            { id: 't1a', r: [23, -38.5, 55, -35.5] }, { id: 't1b', r: [55, -38.5, 94, -35.5] },
            { id: 'vent', r: [40, -46, 50, -38.5] }, { id: 'bom', r: [60, -35.5, 70, -28] }, { id: 'dep2', r: [75, -46, 85, -38.5] },
            { id: 't2', r: [90, -35.5, 94, -17] }, { id: 'pocoB', r: [90.5, -17, 93.5, -11.5], ceil: null, nav: false }],
          open: [{ x: 16, z: -39.5, w: 2.5, h: 3.0 }, { x: 19.5, z: -42, w: 2.6, h: 3.4 }, { x: 23, z: -37, w: 2.8, h: 3.0 }, { x: 92, z: -35.5, w: 3.6, h: 3.0 },
            { x: -12, z: -52.75, w: 1.2, h: 1.1, crawl: true, noNav: true }, { x: 0, z: -52.75, w: 1.2, h: 1.1, crawl: true, noNav: true },
            { x: -19, z: -54, w: 1.2, h: 2.1, noNav: true }, { x: -19, z: -56, w: 1.4, h: 2.1, noNav: true }],
          doors: [{ x: 55, z: -37, w: 1.2, door: { name: 'porta corta-fogo' } }, { x: 45, z: -38.5 }, { x: 65, z: -35.5 }, { x: 80, z: -38.5 },
            { x: 92, z: -17, w: 1.2, door: { lock: 'bolt', boltSide: -1, name: 'porta da escada de serviço' } },
            { x: 7, z: -41, w: 1.2, door: { name: 'casa do gerador' } }, { x: -6, z: -41, door: { name: 'sala elétrica' } }, { x: -18, z: -41, door: { name: 'depósito' } }]
        });
        P.sign(b, 7, -2.2, -40.82, 0, 6, 1.6); P.sign(b, 55.17, -2.0, -37, Math.PI / 2, 6, 1.4);
        // ---- tubulações e cabos ao longo dos túneis ----
        P.pipes(b, [[-23.5, -1.0, -38.4], [15.5, -1.0, -38.4], [22.6, -1.0, -36.0], [93.5, -1.0, -36.0], [93.5, -1.0, -17.5]], 0.12);
        P.pipes(b, [[-23.5, -1.35, -38.45], [16, -1.35, -38.45]], 0.07, { mat: M.metalGreen }); P.pipes(b, [[23, -1.35, -35.9], [93.3, -1.35, -35.9]], 0.07, { mat: M.metalGreen });
        P.pipes(b, [[-23.5, -0.85, -40.6], [15.5, -0.85, -40.6]], 0.05, { mat: M.iron });
        for (let x = -22; x < 92; x += 4) { if (x > 15 && x < 24) continue; const z = x < 16 ? -40.65 : -38.2; b.box(M.iron, x, -0.75, z, 0.05, 0.3, 0.3, { col: false, lod: 'clutter' }); }
        P.cables(b, [[23, -0.7, -38.3], [55, -0.9, -38.3], [94, -0.7, -38.3]]);
        // luzes: fluorescentes (energia) e emergência (bateria)
        [[-18, -39.5], [-6, -39.5], [6, -39.5], [19.5, -38.5], [30, -37], [42, -37], [62, -37], [75, -37], [87, -37], [92, -30], [92, -22]].forEach(([x, z], i) => P.fluorescent(b, x, Y + HG, z, z > -38 && x > 23 ? 0 : 0, { mode: i % 4 === 1 ? 'flicker' : 'steady', intensity: 1.1, needsPower: true, group: 'sub' }));
        [[-23.8, -39.5, Math.PI / 2], [15.8, -36.5, -Math.PI / 2], [35, -38.35, 0], [55.2, -36.2, Math.PI / 2], [80, -35.65, Math.PI], [93.8, -26, -Math.PI / 2]].forEach(([x, z, y], i) => P.emergency(b, x, Y + 2.6, z, y, { mode: i % 2 ? 'dying' : 'pulse' }));
        // poças d'água (reflexivas)
        [[5, -39.5, 3], [33, -37, 2.2], [70, -36.8, 3], [92, -25, 2]].forEach(([x, z, s]) => b.geo(M.mirror, OE.G.custom('puddle', () => new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2)), x, Y + 0.008, z, { scale: [s, 1, s * 0.5], tint: 0x303436, grime: false, lod: 'detail' }));
        // ---- casa do gerador ----
        P.generatorProp(b, 7, -48.5, 0); new OE.Generator({ x: 7, y: Y, z: -46.8 });
        b.box(M.concrete, 7, Y, -48.5, 3.2, 0.15, 1.8, { col: false });
        P.table(b, 2, -43, Math.PI / 2, { w: 1.6, d: 0.8, y: Y, mat: M.metalGray }); H.under('table', 2, -43, Math.PI / 2, Y, 0.7, { depth: 0.42 });
        P.barrel(b, 12.6, -42.5, { y: Y, mat: M.metalRed }); P.barrel(b, 13, -43.3, { y: Y, mat: M.metalRed }); P.barrel(b, 12.5, -52.6, { y: Y, fallen: true });
        P.shelf(b, 13.6, -47, -Math.PI / 2, { w: 2.2, d: 0.45 }); P.pipes(b, [[7, Y + 2.8, -50], [7, Y + 3.9, -50], [7, Y + 3.9, -53.8]], 0.12);
        P.panel(b, 0.25, Y + 1.0, -47, Math.PI / 2);
        // ---- sala elétrica ----
        for (let i = 0; i < 4; i++) P.panel(b, -11.7, Y + 0.9, -42.5 - i * 1.6, Math.PI / 2);
        new OE.Switch({ x: -11.6, y: Y + 1.5, z: -48.8, yaw: Math.PI / 2, kind: 'lever', lights: 'sub', needsPower: true, name: 'disjuntor geral do subsolo', on: true });
        new OE.Switch({ x: -11.6, y: Y + 1.5, z: -47.6, yaw: Math.PI / 2, kind: 'lever', lights: 'tenda', needsPower: true, name: 'disjuntor da tenda', on: true });
        new OE.Switch({ x: -11.6, y: Y + 1.5, z: -46.4, yaw: Math.PI / 2, kind: 'lever', lights: 'parque', needsPower: true, name: 'disjuntor do parque', on: true });
        H.wardrobe(b, -0.6, -48.5, -Math.PI / 2, { y: Y, kind: 'locker', mat: M.metalGray });
        P.cables(b, [[-11.5, Y + 3.8, -42], [-6, Y + 3.9, -45], [-0.5, Y + 3.8, -45]]); P.desk(b, -5.5, -49.2, 0, {});
        new OE.Note({ x: -5.7, y: Y + 0.8, z: -49.0, title: 'Esquema elétrico', text: 'Gerador → quadro geral → tenda / parque / subsolo.\nSem fusível o gerador não parte.\nO duto técnico liga esta sala ao depósito (passa só agachado).' });
        P.fluorescent(b, -6, Y + HG, -45.5, 0, { needsPower: true, group: 'sub', mode: 'flicker' });
        // ---- duto técnico (agachado) ----
        P.pipes(b, [[-12, Y + 1.05, -52.2], [0, Y + 1.05, -52.2]], 0.06); P.cables(b, [[-12, Y + 0.95, -53.3], [0, Y + 0.95, -53.3]]);
        Map.stairNav([[-13.2, Y, -52.75], [-6, Y, -52.75], [1.2, Y, -52.75]], { crawl: true });
        // ---- depósito e a estante que esconde a passagem ----
        P.shelf(b, -23.5, -45, Math.PI / 2, { w: 3, d: 0.5 }); P.shelf(b, -23.5, -49, Math.PI / 2, { w: 3, d: 0.5 }); P.crateStack(b, -14, -43, 0.1, 2); P.crate(b, -15.3, -42.6, 0.3, { s: 0.8 });
        P.cardboardPile(b, -21, -42, 3); P.tarpCovered(b, -15, -50.5, 0.4, 2.0, 1.3, 1.5, { seed: 7, y: Y });
        H.wardrobe(b, -12.6, -46, -Math.PI / 2, { y: Y, w: 1.1 }); H.behind('crates', -14, -44.6, 0, Y, { crouch: true, side: 0.8, cat: 'improvisado' });
        new OE.Pushable({ x: -19, y: Y, z: -53.6, w: 2.0, h: 2.1, d: 0.45, yaw: 0, dir: [1, 0], dist: 1.9, steps: 1, name: 'estante (está meio solta)',
          build: bb => { const m = M.metalGray; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => bb.box(m, i * 0.97, 0, j * 0.2, 0.04, 2.1, 0.04)); for (let k = 0; k < 4; k++) { bb.box(m, 0, 0.12 + k * 0.62, 0, 2.0, 0.025, 0.45); bb.box(M.cardboard, -0.5 + (k % 2) * 0.6, 0.15 + k * 0.62, 0, 0.5, 0.3, 0.35); } },
          onMoved: () => OE.UI.msg('Atrás da estante há uma passagem na parede...', 3) });
        // ---- sala secreta ----
        for (let i = 0; i < 18; i++) P.poster(b, -23.85, Y + 0.8 + (i % 3) * 0.7, -64.5 + Math.floor(i / 3) * 1.5, Math.PI / 2, (i * 5) % 8, 0.55);
        for (let i = 0; i < 10; i++) P.poster(b, -22.5 + i * 0.9, Y + 1.0 + (i % 2) * 0.8, -65.85, 0, (i * 3 + 6) % 8, 0.5);
        for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; P.chair(b, -19 + Math.cos(a) * 2.6, -61 + Math.sin(a) * 2.6, -a - Math.PI / 2, { y: Y }); }
        P.mannequin(b, -19, -61, 0, { ruff: true, tint: 0xc8bcaa }); P.L(b, -19, -61, 0, Y);
        for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, x = -19 + Math.cos(a) * 1.2, z = -61 + Math.sin(a) * 1.2; b.cyl(M.bone, x, Y, z, 0.03, 0.035, 0.12 + r() * 0.15, 6, { lod: 'detail' }); OE.Lights.add({ x, y: Y + 0.3, z, size: 0.02, color: 0xffa040, intensity: i === 0 ? 0.9 : 0.3, range: 5, mode: 'flicker', noLight: i !== 0, halo: 0.25 }); }
        { const l = P.L(b, -15, -63, -2.3, Y); l.box(M.metalGray, 0, 0.9, 0, 0.5, 0.35, 0.3); l.cyl(M.iron, 0.15, 1.25, 0, 0.15, 0.15, 0.06, 12, { rx: Math.PI / 2 }); l.cyl(M.iron, -0.15, 1.25, 0, 0.15, 0.15, 0.06, 12, { rx: Math.PI / 2 }); P.table(b, -15, -63, -2.3, { y: Y, w: 0.8, d: 0.6, h: 0.9 }); }
        new OE.MusicBox({ x: -19.6, y: Y + 0.5, z: -60.2 });
        new OE.Note({ x: -16.2, y: Y + 0.9, z: -64.8, title: 'Caderno do Beppo', text: 'O público nunca vai embora.\nEles só precisam ficar quietos até o fim do número.\nO último espetáculo ainda não terminou.\nQuando a caixinha tocar, todos voltam para seus lugares.' });
        H.wardrobe(b, -14.6, -57, -Math.PI / 2, { y: Y, w: 1.1, mat: M.woodRed });
        // ---- sala de ventilação (exaustores girando) ----
        [[42.5, -45.2], [47.5, -45.2]].forEach(([x, z]) => {
          b.cyl(M.metalGray, x, Y + 1.8, z + 0.3, 1.25, 1.25, 0.9, 20, { rx: Math.PI / 2, open: true }); b.box(M.metalGray, x, Y, z + 0.3, 2.8, 0.6, 1.0, {});
          b.colBox(x, Y, z + 0.3, 2.8, 3.2, 1.0, 0, 'prop');
          const fan = new THREE.Group(); fan.position.set(x, Y + 1.8, z + 0.85); OE.addDyn(fan);
          fan.add(OE.partMesh(bb => { for (let k = 0; k < 5; k++) bb.box(M.iron, 0, 0, 0, 0.3, 2.2, 0.03, { rz: k / 5 * Math.PI }); bb.cyl(M.iron, 0, -0.1, 0, 0.18, 0.18, 0.2, 10, { rx: Math.PI / 2 }); }));
          const spin = { v: 0.15 }; OE.Map.updater(dt => { spin.v += ((OE.state.power ? 6 : 0.12) - spin.v) * dt * 0.4; fan.rotation.z += spin.v * dt; fan.updateMatrixWorld(true); });
        });
        P.pipes(b, [[40.3, Y + 3.5, -40], [49.7, Y + 3.5, -40]], 0.35, { mat: M.metalGray }); H.behind('pipes', 41, -39.3, Math.PI, Y, { crouch: true, side: -0.9, cat: 'improvisado', exposure: 0.3 });
        // ---- casa de bombas ----
        [[62.5, -30.5], [67.5, -30.5]].forEach(([x, z]) => { b.cyl(M.metalGreen, x, Y, z, 1.1, 1.1, 2.6, 16, { col: true }); b.cyl(M.iron, x, Y + 2.6, z, 0.3, 0.3, 1.0, 8, { lod: 'detail' }); });
        P.pipes(b, [[62.5, Y + 3.6, -30.5], [67.5, Y + 3.6, -30.5], [67.5, Y + 3.6, -35.2]], 0.15);
        H.behind('pipes', 65, -29.0, 0, Y, { crouch: true, side: 0, cat: 'aberto', exposure: 0.35 }).entry = { x: 65, z: -32.5 }; H.spots[H.spots.length - 1].pos.set(65, Y + 1, -32.5);
        // ---- depósito 2 ----
        P.shelf(b, 76.5, -42, Math.PI / 2, { w: 3 }); P.shelf(b, 83.5, -42, -Math.PI / 2, { w: 3 }); P.crateStack(b, 80, -45, 0, 2);
        H.behind('crates', 80, -44, 0, Y, { crouch: true, side: 1.2, cat: 'improvisado' }); P.barrel(b, 77, -45.2, { y: Y });
        // ---- armários no túnel ----
        H.wardrobe(b, 30, -38.15, 0, { y: Y, kind: 'locker' }); H.wardrobe(b, 93.65, -28, -Math.PI / 2, { y: Y, kind: 'locker' });
        P.bottles(b, 70, -37, Y); P.bottles(b, -2, -39.5, Y);
        // navegação: escadas
        Map.stairNav([[19.55, 0, -47.4], [19.55, Y, -41.3]]);
        Map.cp('Subsolo', 19.5, Y, -38.5, Math.PI, 2.5);
      },
      detail(b) { const P = OE.Props; P.papers(b, -5, -45, 8, -4.5); P.debris(b, 50, -37, 3); P.papers(b, -19, -62, 10, -4.5); P.debris(b, 92, -20, 2); }
    });
  };
})(window.OE);

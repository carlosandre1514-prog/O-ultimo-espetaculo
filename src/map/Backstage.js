'use strict';
/* SETOR C — Bastidores (inclui os camarins: DressingRooms).
   Prédio de madeira pintada atrás da tenda. Um corredor principal leste-oeste liga:
   ao sul  — sala de preparação dos artistas, escritório 1, saguão (passagem para a tenda),
             escritório 2, depósito de figurinos e a escada para o subsolo (trancada: Chave do Subsolo);
   ao norte— camarim 1, camarim 2 (trancado: Chave do Camarim 2), sala de maquiagem, vestiário
             com armários metálicos, banheiros com cabines.
   Saídas: oeste (beco para os alojamentos), leste (ferrolho por dentro = atalho para o depósito),
   sul da sala de preparação (rota alternativa para a tenda). Portas internas criam laços. */
(function (OE) {
  OE.Map.Backstage = function () {
    OE.Sectors.define({
      name: 'Bastidores', label: 'Setor C · bastidores e camarins', bounds: [-23, -65, 23, -37], interiorRange: 9, priority: 2,
      build(b, def) {
        const M = OE.MAT, A = OE.Arch, P = OE.Props, H = OE.Hiding, Map = OE.Map, r = b.r, D = OE.DEG;
        const HGT = 3.3;
        b.layer = 'shell';
        A.plan(b, {
          y: 0, h: HGT, ext: M.woodCream, extTint: [0.85, 0.82, 0.78], wall: M.plaster, floor: M.wood, ceil: M.plaster, doorMat: M.woodDark, frameMat: M.woodDark,
          rooms: [
            { id: 'prep', r: [-22, -48, -10, -38], wall: M.plasterBlue },
            { id: 'of1', r: [-10, -48, -4, -38], wall: M.wallpaperGreen },
            { id: 'hall', r: [-4, -48, 4, -38], wall: M.wallpaperRed, floor: M.checker },
            { id: 'of2', r: [4, -48, 10, -38], wall: M.wallpaperGreen },
            { id: 'fig', r: [10, -48, 17, -38], wall: M.wallpaperGreen },
            { id: 'esc', r: [17, -48, 22, -38], wall: M.concrete, floor: null },
            { id: 'cor', r: [-22, -50.5, 22, -48], wall: M.plasterGreen, floor: M.checker },
            { id: 'cam1', r: [-22, -64, -12, -50.5], wall: M.wallpaperRed },
            { id: 'cam2', r: [-12, -64, -2, -50.5], wall: M.wallpaperRed },
            { id: 'maq', r: [-2, -64, 8, -50.5], wall: M.tiles, floor: M.tilesFloor },
            { id: 'ves', r: [8, -64, 15, -50.5], wall: M.plasterBlue, floor: M.tilesFloor },
            { id: 'ban', r: [15, -64, 22, -50.5], wall: M.tiles, floor: M.tilesFloor }],
          doors: [
            { x: 0, z: -38, w: 1.6, door: { name: 'porta do saguão' }, sign: 2, signSide: 1 },
            { x: -16, z: -38, w: 1.0, door: { name: 'porta da sala de preparação' } },
            { x: 0, z: -48, w: 1.3 }, { x: -16, z: -48 }, { x: -7, z: -48 }, { x: 7, z: -48 }, { x: 13.5, z: -48 },
            { x: 19.5, z: -48, door: { lock: 'key:chave_subsolo', kind: 'metal', mat: M.metalGray, name: 'porta do subsolo' } },
            { x: -4, z: -43, door: { name: 'porta lateral' } }, { x: 4, z: -43, door: { name: 'porta lateral' } },
            { x: -22, z: -49.25, w: 1.0, door: { name: 'porta oeste' } },
            { x: 22, z: -49.25, w: 1.0, door: { lock: 'bolt', boltSide: -1, name: 'porta leste' } },
            { x: -17, z: -50.5 }, { x: -7, z: -50.5, door: { lock: 'key:chave_camarim', name: 'camarim 2' } }, { x: 3, z: -50.5 }, { x: 11.5, z: -50.5 }, { x: 18.5, z: -50.5 },
            { x: -2, z: -57, door: { name: 'porta interna' } }, { x: 8, z: -57, door: { name: 'porta interna' } }],
          windows: [
            { x: -18, z: -64, broken: 0.5 }, { x: -15, z: -64, broken: 0.3 }, { x: -7, z: -64, broken: 0.6, bars: -1 }, { x: 3, z: -64, broken: 0.4 }, { x: 11.5, z: -64, w: 0.8, sill: 1.6, h: 0.6, broken: 0.8 }, { x: 18.5, z: -64, w: 0.8, sill: 1.7, h: 0.5 },
            { x: -22, z: -43, broken: 0.5 }, { x: -22, z: -57, broken: 0.4 }, { x: 22, z: -57, w: 0.8, sill: 1.7, h: 0.5 },
            { x: -13, z: -38, broken: 0.7 }, { x: -7, z: -38, broken: 0.3 }, { x: 7, z: -38, broken: 0.5 }, { x: 13.5, z: -38, broken: 0.6 }]
        });
        A.subtract([17, -48, 22, -38], [OE.HOLES[0]]).forEach(q => b.box(M.concrete, (q[0] + q[2]) / 2, -0.01, (q[1] + q[3]) / 2, q[2] - q[0], 0.022, q[3] - q[1], { col: false, grime: false }));
        A.roofGable(b, -22, -64, 22, -38, HGT, 2.6, M.rust, { over: 0.6, gableMat: M.woodCream, gableTint: [0.8, 0.78, 0.74] });
        // marquise sobre a porta do saguão
        b.box(M.metalRed, 0, 2.6, -37.2, 4.0, 0.08, 1.6, { col: false, rx: 0.12 });
        // ---------- interior ----------
        b.layer = 'interior';
        // corredor: luminárias, cartazes, extintor, bancos, bilhetes
        for (let x = -18; x <= 18; x += 6) P.fluorescent(b, x, HGT, -49.25, 0, { mode: x === 0 ? 'flicker' : x === 12 ? 'dying' : 'off', intensity: 1.0, needsPower: x !== 0, group: 'bast' });
        P.emergency(b, -21.85, 2.5, -49.25, Math.PI / 2, {}); P.emergency(b, 21.85, 2.5, -49.6, -Math.PI / 2, { mode: 'dying' });
        [[-12, 0], [-3, 2], [6, 4], [15, 6]].forEach(([x, i]) => P.poster(b, x, 1.6, -48.12, Math.PI, i, 0.8));
        P.poster(b, -20, 1.5, -50.38, 0, 5, 0.8); P.poster(b, 9.5, 1.6, -50.38, 0, 6, 0.8);
        P.bench(b, -10, -50.05, 0, { w: 1.6 }); P.bottles(b, 5, -49.3, 0);
        H.trunk(b, 16, -49.95, 0);
        // ---- sala de preparação dos artistas ----
        P.clothesRack(b, -20.5, -44, Math.PI / 2, { w: 2.2 }); P.mannequin(b, -18.5, -46.5, 0.4, { ruff: true }); P.mannequin(b, -12.2, -46.8, -0.6, { headless: true, tint: 0x6a2020 });
        P.table(b, -15, -42, 0, { w: 2.0, d: 0.9 }); H.under('table', -15, -42, 0, 0, 0.7, { depth: 0.45 });
        P.crate(b, -11.3, -39.0, 0.2, { s: 0.8 }); P.crate(b, -11.1, -39.0, 0.3, { s: 0.6, y: 0.8 }); P.barrel(b, -21.2, -39, { mat: M.metalBlue });
        // monociclos, malabares, arcos
        for (let i = 0; i < 3; i++) { b.cyl(M.rubber, -13 + i * 0.6, 0.3, -46.5, 0.3, 0.3, 0.05, 14, { rx: Math.PI / 2, lod: 'detail' }); b.cyl(M.chrome, -13 + i * 0.6, 0.3, -46.5, 0.015, 0.015, 0.9, 4, { lod: 'clutter' }); }
        for (let i = 0; i < 6; i++) b.cyl(M.paint, -15.6 + (r() - 0.5) * 1.2, 0.78, -42 + (r() - 0.5) * 0.5, 0.03, 0.05, 0.42, 6, { rz: Math.PI / 2, yaw: r() * 3, tint: [0.9, 0.2 + r() * 0.6, 0.1], lod: 'clutter' });
        b.geo(M.metalRed, OE.G.torus(0.45, 0.025, 4, 20), -21.7, 0.6, -40.5, { yaw: Math.PI / 2, rx: 0.2, lod: 'detail' }); b.geo(M.metalYellow, OE.G.torus(0.42, 0.025, 4, 20), -21.7, 0.6, -41.4, { yaw: Math.PI / 2, rx: -0.1, lod: 'detail' });
        b.box(M.mirror, -21.85, 0.35, -45.5, 0.04, 1.9, 1.4, { col: false, grime: false }); P.ceilingLamp(b, -16, HGT, -43, { mode: 'off' });
        OE.Hiding.wardrobe(b, -21.4, -47.2, Math.PI / 2, { w: 1.2 });
        // ---- escritório 1 (gerência) ----
        P.desk(b, -7, -40, Math.PI, { drawer: true }); P.fileCabinet(b, -9.6, -44, Math.PI / 2); P.fileCabinet(b, -9.6, -44.6, Math.PI / 2);
        H.under('table', -7, -40, 0, 0, 0.7, { depth: 0.35, exposure: 0.35 });
        P.wallLamp(b, -4.15, 2.0, -45, -Math.PI / 2, { mode: 'dying', intensity: 0.7 });
        b.box(M.woodDark, -9.85, 1.2, -41, 0.04, 0.9, 1.4, { col: false }); // quadro de avisos
        for (let i = 0; i < 5; i++) b.box(M.paint, -9.82, 1.3 + (i % 2) * 0.35, -41.5 + i * 0.25, 0.01, 0.28, 0.21, { col: false, lod: 'clutter', tint: [0.8, 0.78, 0.68], yaw: 0, rx: (r() - 0.5) * 0.2 });
        new OE.Note({ x: -9.6, y: 1.4, z: -41, title: 'Memorando — Direção', text: 'A partir de hoje está PROIBIDO descer ao subsolo sem autorização.\nO Sr. Moretti guarda a chave do subsolo no camarim 2.\nQuem ouvir a caixinha de música durante o ensaio: NÃO responda.\n— A Direção, 1987' });
        // ---- saguão ----
        P.rug(b, 0, -43, 0, 3, 6, 0x5a1818); P.bench(b, -3.4, -41, Math.PI / 2, { w: 1.8 }); P.bench(b, 3.4, -45, -Math.PI / 2, { w: 1.8 });
        P.ceilingLamp(b, 0, HGT, -43, { mode: 'flicker', intensity: 1.1, shade: M.metalRed });
        P.poster(b, -3.88, 1.7, -46.5, Math.PI / 2, 0, 1.0); P.poster(b, 3.88, 1.7, -39.5, -Math.PI / 2, 4, 1.0);
        b.box(M.woodDark, 0, 0, -47.4, 2.0, 1.0, 0.6, {}); b.box(M.woodCream, 0, 1.0, -47.4, 2.1, 0.05, 0.7, { col: false }); // balcão
        // ---- escritório 2 (contabilidade) ----
        P.desk(b, 7, -45.8, 0, {}); P.fileCabinet(b, 9.6, -39.2, -Math.PI / 2); P.shelf(b, 4.35, -40.5, Math.PI / 2, { w: 2.2, d: 0.4, mat: M.woodDark });
        b.box(M.metalGray, 9.4, 0, -42.5, 0.8, 1.0, 0.8, { tint: 0x556060 }); // cofre
        P.papers(b, 7, -42, 12);
        // ---- depósito de figurinos ----
        P.clothesRack(b, 12, -40.5, 0, { w: 2.4 }); P.clothesRack(b, 12, -43.2, 0, { w: 2.4 }); P.clothesRack(b, 15.5, -45.8, Math.PI / 2, { w: 2.0 });
        H.wardrobe(b, 16.4, -40, -Math.PI / 2, { w: 1.2 }); H.trunk(b, 11.5, -47.2, 0);
        P.mannequin(b, 16.3, -44.8, 2.5, { tint: 0x2a3a6a }); Map.cand(17.6, 0, -44.5); P.cardboardPile(b, 10.6, -38.6, 3);
        b.box(M.fabric, 13.2, 0, -46, 1.2, 0.35, 0.9, { tint: 0x7a2a5a, rz: 0.05, lod: 'detail' }); // monte de tecidos
        P.ceilingLamp(b, 13.5, HGT, -43, { mode: 'dying', intensity: 0.8 });
        // ---- escada do subsolo (poço com guarda-corpo) ----
        A.stairs(b, { x: 19.55, z: -46.6, y0: 0, y1: -4.5, dir: [0, 1], w: 2.2, run: 0.3, mat: M.concrete, nosing: true, tag: '' });
        A.railing(b, [18.3, -46.6], [18.3, -42.0], 0, {}); A.railing(b, [20.8, -46.6], [20.8, -42.0], 0, {}); A.railing(b, [18.3, -41.9], [20.8, -41.9], 0, {});
        P.emergency(b, 21.85, 2.6, -44, -Math.PI / 2, {}); P.sign(b, 19.5, 2.55, -47.87, 0, 6, 1.6);
        b.box(M.concrete, 21.4, 0, -39.0, 1.0, 0.4, 1.8, {}); // degrau/plataforma de manutenção
        // ---- camarim 1 ----
        P.vanity(b, -19, -63.5, 0, { lit: true, mode: 'flicker', w: 1.4 }); P.vanity(b, -15.4, -63.5, 0, { w: 1.4, chairFallen: true });
        P.clothesRack(b, -21.3, -56, Math.PI / 2, { w: 2.0 }); H.wardrobe(b, -12.6, -58, -Math.PI / 2, { w: 1.1 });
        P.suitcase(b, -16, -52, 0.3, { open: true }); P.rug(b, -17, -57, 0.1, 3.5, 2.5, 0x4a2840);
        P.mannequin(b, -13.5, -52, -0.4, { ruff: true, tint: 0xc8c0a0 });
        new OE.Note({ x: -18.9, y: 0.8, z: -63.2, title: 'Bilhete preso no espelho', text: 'Lúcia,\nO Beppo não está bem. Ele ensaia sozinho com a cara pintada até de madrugada e fala com o público da plateia vazia.\nSe você ouvir a caixinha, se esconda e NÃO acenda a lanterna.\n— M.' });
        // ---- camarim 2 (trancado; guarda a Chave do Subsolo) ----
        P.vanity(b, -9, -63.5, 0, { lit: true, mode: 'dying', drawerItem: 'chave_subsolo' }); P.vanity(b, -5.4, -63.5, 0, {});
        H.wardrobe(b, -2.6, -53, -Math.PI / 2, { w: 1.1 }); P.bed(b, -10.8, -55, 0, { w: 0.9, d: 1.9 }); H.under('bed', -10.8, -55, Math.PI / 2, 0, 0.35, { depth: 0.45 });
        P.clothes(b, -7, -56, 6); P.suitcase(b, -5, -52, 1.2); P.mannequin(b, -6, -59, 0.4, { ruff: true, tint: 0xd8d0c0 });
        for (let i = 0; i < 6; i++) P.poster(b, -11.85, 1.2 + (i % 2) * 0.8, -60 + i * 0.6, Math.PI / 2, i % 2 ? 1 : 6, 0.5);
        // ---- sala de maquiagem ----
        for (let i = 0; i < 3; i++) P.vanity(b, -1 + i * 2.6 + 0.6, -63.5, 0, { lit: i === 1, mode: 'flicker', w: 1.2 });
        P.table(b, 3, -55, 0, { w: 2.2, d: 1.0, cloth: 0x9a8a70 }); H.under('table', 3, -55, 0, 0, 0.7, { depth: 0.5 });
        for (let i = 0; i < 4; i++) b.geo(M.ceramic, OE.G.sphere(0.1, 10, 8), 2.2 + i * 0.5, 0.86, -55 + (r() - 0.5) * 0.4, { scale: [0.85, 1.15, 0.9], lod: 'clutter' }); // cabeças de manequim
        P.sink(b, 7.6, -52.5, -Math.PI / 2); P.sink(b, 7.6, -54.0, -Math.PI / 2);
        // ---- vestiário: armários metálicos (esconderijos) ----
        for (let i = 0; i < 6; i++) { const z = -51.8 - i * 0.62; if (i === 1 || i === 4) H.wardrobe(b, 14.65, z - 0.3, -Math.PI / 2, { kind: 'locker' }); else { P.L(b, 14.65, z - 0.3, -Math.PI / 2).box(M.metalGreen, 0, 0, 0, 0.6, 1.95, 0.55); } }
        for (let i = 0; i < 5; i++) { const z = -52 - i * 0.62; if (i === 2) H.wardrobe(b, 8.35, z - 0.3, Math.PI / 2, { kind: 'locker' }); else P.L(b, 8.35, z - 0.3, Math.PI / 2).box(M.metalGreen, 0, 0, 0, 0.6, 1.95, 0.55); }
        P.bench(b, 11.5, -57, Math.PI / 2, { w: 3.0 }); P.clothes(b, 11.5, -61, 5); P.shower(b, 9.0, -63.3, 0); P.shower(b, 10.3, -63.3, 0);
        P.fluorescent(b, 11.5, HGT, -56, Math.PI / 2, { mode: 'dying', intensity: 0.8 });
        // ---- banheiros ----
        for (let i = 0; i < 3; i++) H.stall(b, 16.0 + i * 1.0 + 0.45, -63.25, 0, { w: 0.95, d: 1.4 });
        P.sink(b, 21.55, -52.2, -Math.PI / 2); P.sink(b, 21.55, -53.6, -Math.PI / 2); P.sink(b, 21.55, -55.0, -Math.PI / 2);
        P.emergency(b, 15.2, 2.4, -56, Math.PI / 2, { mode: 'pulse' }); b.box(M.paint, 18, 0.004, -57, 1.5, 0.004, 1.0, { col: false, tint: 0x1a1612, lod: 'detail', grime: false }); // poça
        // checkpoint e nós extras
        Map.cp('Bastidores', 0, 0, -43, Math.PI, 3);
        def.cand = true;
      },
      detail(b) {
        const P = OE.Props, r = b.r;
        P.papers(b, -6, -49.2, 8); P.papers(b, -15, -40, 6); P.clothes(b, 13, -42, 6); P.clothes(b, -17, -60, 5); P.debris(b, 20, -60, 1.5); P.planks(b, 21, -40, 2);
        for (let i = 0; i < 20; i++) b.box(OE.MAT.paint, (r() - 0.5) * 42, 0.004, -38.5 - r() * 25, 0.08 + r() * 0.2, 0.004, 0.08 + r() * 0.2, { yaw: r() * 6, col: false, lod: 'clutter', tint: [0.2, 0.17, 0.12], grime: false });
      }
    });
  };
})(window.OE);

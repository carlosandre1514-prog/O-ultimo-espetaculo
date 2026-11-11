'use strict';
/* SETOR D — Dormitórios e alojamentos.
   Prédio de alvenaria com corredor norte-sul. A oeste, quatro alojamentos coletivos com beliches
   (montadores, tratadores); a leste, banheiro coletivo, dois quartos individuais de artistas,
   cozinha e refeitório. Malas, roupas, fotos, garrafas: gente que saiu às pressas.
   Esconderijos: guarda-roupas, debaixo das camas e beliches, debaixo das mesas do refeitório,
   cabines do banheiro, armário da cozinha. A Chave do Camarim 2 está num criado-mudo. */
(function (OE) {
  OE.Map.Dormitories = function () {
    OE.Sectors.define({
      name: 'Alojamentos', label: 'Setor D · dormitórios', bounds: [-73, -67, -37, -31], interiorRange: 9, priority: 2,
      build(b) {
        const M = OE.MAT, A = OE.Arch, P = OE.Props, H = OE.Hiding, Map = OE.Map, r = b.r;
        const HGT = 3.0;
        A.plan(b, {
          y: 0, h: HGT, ext: M.brick, wall: M.plasterGreen, floor: M.tilesFloor, ceil: M.plaster, doorMat: M.woodGreen,
          rooms: [
            { id: 'cor', r: [-55.5, -66, -53, -32], wall: M.plaster, floor: M.concreteDark },
            { id: 'a1', r: [-72, -40.5, -55.5, -32] }, { id: 'a2', r: [-72, -49, -55.5, -40.5], wall: M.plasterBlue },
            { id: 'a3', r: [-72, -57.5, -55.5, -49] }, { id: 'a4', r: [-72, -66, -55.5, -57.5], wall: M.plasterBlue },
            { id: 'ban', r: [-53, -38, -38, -32], wall: M.tiles },
            { id: 'q1', r: [-53, -44, -38, -38], wall: M.wallpaperRed, floor: M.wood },
            { id: 'q2', r: [-53, -50, -38, -44], wall: M.wallpaperGreen, floor: M.wood },
            { id: 'coz', r: [-53, -56, -38, -50], wall: M.tiles },
            { id: 'ref', r: [-53, -66, -38, -56], wall: M.plaster, floor: M.wood }],
          doors: [
            { x: -54.25, z: -32, w: 1.2, door: { name: 'porta sul' }, sign: 5, signSide: 1 }, { x: -54.25, z: -66, w: 1.2, door: { name: 'porta norte', lock: 'jammed' } },
            { x: -55.5, z: -36.25 }, { x: -55.5, z: -44.75 }, { x: -55.5, z: -53.25 }, { x: -55.5, z: -61.75 },
            { x: -53, z: -35 }, { x: -53, z: -41 }, { x: -53, z: -47 }, { x: -53, z: -53 }, { x: -53, z: -61, w: 1.4 },
            { x: -45.5, z: -56, w: 1.2, door: { name: 'porta da cozinha' } }, { x: -38, z: -61, w: 1.1, door: { name: 'porta do refeitório' } },
            { x: -64, z: -40.5, door: { name: 'porta de ligação', lock: 'jammed' } }, { x: -64, z: -57.5 }],
          windows: [
            { x: -72, z: -36 }, { x: -72, z: -45, broken: 0.6 }, { x: -72, z: -53, broken: 0.3 }, { x: -72, z: -62, broken: 0.8 },
            { x: -64, z: -32, broken: 0.5 }, { x: -64, z: -66, broken: 0.4 }, { x: -45.5, z: -32, w: 0.8, sill: 1.7, h: 0.5 },
            { x: -38, z: -41, broken: 0.4 }, { x: -38, z: -47, broken: 0.5 }, { x: -38, z: -53 }, { x: -45.5, z: -66, w: 2.0, broken: 0.6 }, { x: -38, z: -58.5, broken: 0.2 }]
        });
        A.roofGable(b, -72, -66, -38, -32, HGT, 2.4, M.metalRed, { over: 0.5, flip: true, gableMat: M.brick });
        b.layer = 'interior';
        // corredor
        for (let z = -35; z > -66; z -= 7) P.ceilingLamp(b, -54.25, HGT, z, { mode: z === -42 ? 'flicker' : z === -56 ? 'dying' : 'off', intensity: 1.0, shade: M.metalGray });
        P.emergency(b, -54.25, 2.6, -65.8, 0, {}); P.poster(b, -53.12, 1.6, -58, -Math.PI / 2, 7, 0.7); P.bottles(b, -54.3, -50, 0);
        // alojamentos coletivos com beliches
        const dorm = (z0, z1, seed, keyStand) => {
          const zc = (z0 + z1) / 2;
          for (let i = 0; i < 4; i++) { const x = -70.6 + i * 3.6; const top = z1 - 1.2; const bk = P.bunk(b, x, top, 0); if (i % 2 === 0) H.under('bed', x, top, Math.PI / 2, 0, bk.clear, { depth: 0.48, exposure: 0.5 }); }
          for (let i = 0; i < 3; i++) { const x = -70.6 + i * 3.6; P.bed(b, x, z0 + 1.2, Math.PI, { w: 0.95 }); if (i === 1) H.under('bed', x, z0 + 1.2, Math.PI / 2, 0, 0.35, { depth: 0.48 }); }
          P.nightstand(b, -68.8, z1 - 0.35, Math.PI, { item: keyStand ? 'chave_camarim' : undefined, drawer: true });
          H.wardrobe(b, -59.0, z0 + 0.45, 0, { w: 1.2 }); P.nightstand(b, -60.6, z0 + 0.3, 0, {});
          P.table(b, -61, zc, 0, { w: 1.2, d: 0.8, mat: M.wood }); P.chair(b, -61.6, zc + 0.7, Math.PI + 0.3); P.chair(b, -60.2, zc - 0.7, 0.5, { fallen: r() < 0.5 });
          P.suitcase(b, -66, zc, r() * 3, { open: r() < 0.5 }); P.suitcase(b, -57, z1 - 0.5, 0.2); P.clothes(b, -64, zc + 1, 5);
          P.rug(b, -64, zc, 0, 3, 2, 0x3a3428);
          P.ceilingLamp(b, -64, HGT, zc, { mode: seed % 2 ? 'dying' : 'off', intensity: 0.9 });
          // fotos e pôsteres nas paredes
          P.poster(b, -71.87, 1.6, zc - 1.5, Math.PI / 2, seed + 1, 0.55); P.poster(b, -71.87, 1.6, zc + 1.7, Math.PI / 2, seed + 4, 0.45);
        };
        dorm(-40.5, -32, 0, false); dorm(-49, -40.5, 1, true); dorm(-57.5, -49, 2, false); dorm(-66, -57.5, 3, false);
        new OE.Note({ x: -66, y: 0.3, z: -45, title: 'Diário (página arrancada)', text: '13 de março.\nO Beppo trancou o camarim 2 e deu a chave para o Tonho guardar no criado-mudo. Diz que lá embaixo, no subsolo, ele "guarda o público".\nHoje sumiram mais dois do pessoal da montagem.\nAmanhã é o último espetáculo. Eu vou embora antes.' });
        // banheiro coletivo
        for (let i = 0; i < 4; i++) H.stall(b, -51.9 + i * 1.05, -37.25, 0, { w: 1.0, d: 1.4, mat: M.metalGreen });
        for (let i = 0; i < 3; i++) P.sink(b, -39.6 - i * 1.2, -32.6, Math.PI);
        P.shower(b, -40.3, -37.4, 0); P.shower(b, -41.5, -37.4, 0); P.fluorescent(b, -45.5, HGT, -35, 0, { mode: 'flicker', intensity: 0.8 });
        // quartos individuais (artistas)
        [[-41, 'q1'], [-47, 'q2']].forEach(([zc], qi) => {
          P.bed(b, -40.0, zc, Math.PI / 2, { w: 1.3, d: 2.0, mat: M.woodDark, hy: 0.5 }); H.under('bed', -40.0, zc, 0, 0, 0.4, { depth: 0.75, exposure: 0.45 });
          P.nightstand(b, -38.6, zc - 1.6, -Math.PI / 2, { drawer: true }); H.wardrobe(b, -45.5, zc - 2.5, 0, { w: 1.2 });
          P.vanity(b, -49.5, zc - 2.55, 0, { w: 1.1, lit: qi === 0, mode: 'dying' }); P.rug(b, -44, zc, 0, 3, 2, qi ? 0x283a4a : 0x5a2020);
          P.suitcase(b, -51.5, zc + 1.8, 0.2, { open: true }); P.clothes(b, -47, zc + 1, 4);
          P.poster(b, -52.87, 1.7, zc, -Math.PI / 2 + Math.PI, qi * 3 + 1, 0.7);
        });
        P.mannequin(b, -51.8, -45.5, 0.8, { ruff: true });
        // cozinha
        P.counter(b, -49.5, -55.6, 0, 5, { upper: true }); P.stove(b, -51.6, -50.45, Math.PI); P.fridge(b, -39.0, -50.45, Math.PI);
        P.table(b, -45.5, -52.5, 0, { w: 2.0, d: 0.9, mat: M.wood }); H.under('table', -45.5, -52.5, 0, 0, 0.7, { depth: 0.45 });
        H.wardrobe(b, -38.5, -53.5, -Math.PI / 2, { w: 1.0, h: 1.95, mat: M.woodCream, kind: 'cabinet' });
        P.bottles(b, -42, -51.5, 0); P.barrel(b, -52.4, -52.0, { mat: M.metalGray });
        P.fluorescent(b, -45.5, HGT, -53, 0, { mode: 'dying', intensity: 0.9 });
        // refeitório
        for (let i = 0; i < 3; i++) { const z = -58.2 - i * 2.8; P.table(b, -45.5, z, 0, { w: 4.5, d: 0.9, mat: M.wood }); P.bench(b, -45.5, z + 0.75, 0, { w: 4.2 }); P.bench(b, -45.5, z - 0.75, 0, { w: 4.2 });
          if (i !== 1) H.under('table', -43.7, z, Math.PI / 2, 0, 0.7, { depth: 0.3, exposure: 0.4 });
          for (let k = 0; k < 6; k++) b.cyl(r() < 0.5 ? M.ceramic : M.rust, -47.5 + k * 0.8, 0.76, z + (r() - 0.5) * 0.4, 0.09, 0.07, 0.06, 8, { lod: 'clutter' }); }
        P.counter(b, -52.4, -64.0, Math.PI / 2, 3.6, {}); P.ceilingLamp(b, -45.5, HGT, -61, { mode: 'flicker', intensity: 1.1 }); P.ceilingLamp(b, -41, HGT, -64, { mode: 'off' });
        new OE.MusicBox({ x: -45.5, y: 0.8, z: -63.8 }); b.box(M.woodRed, -45.5, 0.76, -63.8, 0.18, 0.12, 0.14, { col: false, lod: 'clutter' });
        // lixo e caçamba atrás do refeitório
        P.dumpster(b, -35.5, -64.5, -Math.PI / 2); P.trashBin(b, -35.6, -58.5, 0); P.cardboardPile(b, -36, -67.2, 2);
        Map.cp('Alojamentos', -54.25, 0, -36, Math.PI, 2.5);
      },
      detail(b) { const P = OE.Props; P.papers(b, -64, -53, 8); P.clothes(b, -66, -36, 5); P.clothes(b, -68, -62, 5); P.debris(b, -70, -62.5, 1.2); P.papers(b, -45, -60, 6); }
    });
  };
})(window.OE);

'use strict';
/* Planta geral do complexo "Gran Circo Estrela" (metros; x leste, z sul, y cima).

                         z -80 ┌───────────────────── cerca perimetral ─────────────────────┐
     D Alojamentos [-72..-38]  │  C Bastidores [-22..22]   E Depósito [38..78]             │
                    z -66..-32 │   z -64..-38              z -70..-32     ┌─ galpão/escada │
                               │        │ passagem coberta                │   [88..100]    │
     G Parque [-125..-35]      │   B Grande Tenda (r = 30, centro 0,0)    F Animais [45..102]
       roda-gigante, carrossel │                                          estábulo, jaulas│
                               │   praça de entrada                                       │
                         z 100 └──────── A Entrada: portão, bilheterias, guarita ─────────┘
                                   estrada, estacionamento (fora da cerca)
     H Subsolo (y = -4,5): sob os bastidores, túnel até o galpão dos animais.          */
(function (OE) {
  const Map = {}; OE.Map = Map;
  OE.HOLES = [[18.4, -46.6, 20.7, -42.0], [90.9, -16.3, 93.1, -11.6]];   // poços das escadas do subsolo
  OE.STAIRS = [[19.5, -44.3, 'Bastidores'], [92, -14, 'Animais']];
  OE.checkpoints = [];
  OE.navCands = [];
  Map.cand = (x, y, z, o) => OE.navCands.push(Object.assign({ x, y, z }, o || {}));
  Map.cp = (name, x, y, z, yaw, r) => OE.checkpoints.push({ name, x, y, z, yaw, r });
  OE.extraUpdaters = [];
  Map.updater = fn => OE.extraUpdaters.push({ update: fn });

  Map.define = function () {
    const S = OE.Sectors;
    S.define({ name: 'Terreno', label: 'terreno e cercas', bounds: [-140, -95, 125, 150], alwaysVisible: true, build: Map.terrain });
    OE.Map.CircusEntrance(); OE.Map.MainCircusTent(); OE.Map.Backstage(); OE.Map.Dormitories();
    OE.Map.Warehouse(); OE.Map.AnimalArea(); OE.Map.AbandonedPark(); OE.Map.Underground();
    S.define({ name: 'Finalizar', label: 'rotas e atmosfera', bounds: [0, 0, 0, 0], build: Map.finalize, alwaysVisible: true });
  };

  Map.terrain = function (b) {
    const M = OE.MAT;
    OE.Arch.ground(b, [-140, -95, 125, 150], OE.HOLES, M.grassGround);
    // fora da cerca: estrada e estacionamento
    b.box(M.asphalt, -7, 0.004, 124, 266, 0.012, 9, { col: false, grime: false, skip: [0, 1, 3, 4, 5] });
    for (let x = -130; x < 120; x += 6) b.box(M.paint, x, 0.018, 124, 2.5, 0.004, 0.15, { col: false, tint: 0x3a382c, lod: 'detail', grime: false, skip: [0, 1, 3, 4, 5] });
    b.box(M.asphalt, -26, 0.006, 110, 34, 0.012, 14, { col: false, grime: false, skip: [0, 1, 3, 4, 5], tint: 0x9a9a9a });
    // caminhos de terra e cascalho entre os setores
    const A = OE.Arch;
    A.path(b, [[0, 119], [0, 96], [0, 70], [0, 34]], 6, M.gravel);
    A.path(b, [[0, 66], [-20, 58], [-40, 48], [-60, 30], [-62, 18]], 3.2, M.dirt);
    A.path(b, [[0, 62], [22, 50], [36, 30], [42, 17], [52, 17]], 3.2, M.dirt);
    A.path(b, [[0, -30], [0, -38]], 4, M.gravel);
    A.path(b, [[-22, -49], [-30, -49], [-38, -55], [-38, -61]], 2.4, M.dirt);
    A.path(b, [[22, -49], [38, -49]], 2.4, M.dirt);
    A.path(b, [[31, 0], [45, 16]], 2.4, M.dirt);
    A.path(b, [[58, -31], [58, -24], [50, -10], [50, 6]], 3, M.gravel);
    A.path(b, [[-54, -31], [-54, -22], [-40, -10], [-28, -2]], 2.4, M.dirt);
    A.path(b, [[-31, 0], [-48, 4], [-62, 8]], 2.4, M.dirt);
    // cerca perimetral (tela com arame farpado), buracos = entradas alternativas
    const F = (a, c, o) => A.chainFence(b, a, c, o);
    F([-125, 100], [-11, 100], { gaps: [25] });             // buraco perto do parque (x ≈ -49)
    F([11, 100], [105, 100], { gaps: [10] });               // buraco a leste (x ≈ 42)
    F([-125, -80], [105, -80]); F([-125, -80], [-125, 100]); F([105, -80], [105, 100]);
    // pedaços da cerca caídos junto aos buracos
    b.box(M.chainlink, -49, 0.05, 101.2, 3.2, 0.02, 2.4, { col: false, rx: 0.08, grime: false, lod: 'detail' });
    b.box(M.chainlink, 42.4, 0.4, 101.0, 3.2, 2.4, 0.02, { col: false, rx: 1.2, grime: false, lod: 'detail' });
    // zonas de atmosfera (neblina/ambiente)
    const L = OE.Lights;
    L.addZone({ name: 'tenda', box: [-30, -2, -30, 30, 30, 30], fog: 0x07080a, density: 0.03, hemi: 0.22, moon: 0.08, dust: true, priority: 2, round: true });
    L.addZone({ name: 'bastidores', box: [-22, -1, -64, 22, 6, -38], fog: 0x040404, density: 0.045, hemi: 0.1, moon: 0.02, dust: true, priority: 3 });
    L.addZone({ name: 'alojamentos', box: [-72, -1, -66, -38, 6, -32], fog: 0x050505, density: 0.045, hemi: 0.1, moon: 0.03, dust: true, priority: 3 });
    L.addZone({ name: 'deposito', box: [38, -1, -70, 78, 12, -32], fog: 0x05060a, density: 0.035, hemi: 0.14, moon: 0.06, dust: true, priority: 3 });
    L.addZone({ name: 'estabulo', box: [55, -1, 8, 95, 8, 36], fog: 0x060504, density: 0.04, hemi: 0.12, moon: 0.04, dust: true, priority: 3 });
    L.addZone({ name: 'subsolo', box: [-30, -10, -70, 100, -1.2, -5], fog: 0x020202, density: 0.06, hemi: 0.03, moon: 0, dust: true, priority: 5 });
  };

  // Depois de todos os setores: pontos de navegação externos em grade + validação + checkpoints
  Map.finalize = function () {
    const w = OE.world;
    // grade externa (só onde não há construção)
    const inside = (x, z) => [[-23, -65, 23, -37], [-73, -67, -37, -31], [37, -71, 79, -31], [54, 7, 96, 37], [87, -19, 101, -5]].some(r => x > r[0] && x < r[2] && z > r[1] && z < r[3]) || Math.hypot(x, z) < 31;
    for (let x = -120; x <= 100; x += 7) for (let z = -76; z <= 96; z += 7) if (!inside(x, z)) Map.cand(x, 0, z);
    // anel em volta da tenda
    for (let a = 0; a < 24; a++) Map.cand(Math.cos(a / 24 * 6.283) * 33.5, 0, Math.sin(a / 24 * 6.283) * 33.5);
    let ok = 0;
    for (const c of OE.navCands) {
      let placed = false;
      const tries = [[0, 0], [0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7], [1.2, 1.2], [-1.2, 1.2], [1.2, -1.2], [-1.2, -1.2], [2, 0], [-2, 0], [0, 2], [0, -2]];
      for (const [dx, dz] of (c.fixed ? [[0, 0]] : tries)) {
        const x = c.x + dx, z = c.z + dz;
        if (w.overlaps(x, z, 0.4, c.y + 0.35, c.y + 1.9)) continue;
        const g = w.ground(x, z, c.y + 0.4, 0.3); if (Math.abs(g - c.y) > 0.35) continue;
        const n = OE.Nav.add(x, g, z, { tag: c.tag, crawl: c.crawl, reach: c.reach, noAuto: c.noAuto }); if (c.ref) c.ref.node = n; placed = true; ok++; break;
      }
      if (!placed && c.ref) c.ref.node = null;
    }
    // ligações explícitas (escadas) registradas pelos setores
    (OE.navLinks || []).forEach(fn => fn()); OE.navLinks2.forEach(fn => fn());
    OE.log('nav candidatos', OE.navCands.length, 'válidos', ok);
  };
  OE.navLinks = []; OE.navLinks2 = [];
  // Liga uma escada: pontos fixos (sem validar) em sequência e conecta pontas ao grafo automático
  Map.stairNav = function (pts, o) {
    const refs = pts.map(p => ({ x: p[0], y: p[1], z: p[2] }));
    const chain = { nodes: null };
    // 1º passo: cria os nós e liga em sequência
    OE.navLinks.push(() => {
      chain.nodes = refs.map(p => OE.Nav.add(p.x, p.y, p.z, Object.assign({ noAuto: true }, o)));
      chain.nodes.forEach(n => { n.chain = chain; });
      for (let i = 0; i < chain.nodes.length - 1; i++) OE.Nav.link(chain.nodes[i], chain.nodes[i + 1], { forced: true, crawl: o && o.crawl });
    });
    // 2º passo (depois de todas as cadeias): pontas ligam ao que estiver perto e visível (inclusive outras cadeias)
    OE.navLinks2.push(() => {
      const nodes = chain.nodes;
      [nodes[0], nodes[nodes.length - 1]].forEach(n => {
        const near = OE.Nav.nodes.filter(m => m.chain !== chain && Math.abs(m.y - n.y) < 0.4).map(m => [Math.hypot(m.x - n.x, m.z - n.z), m]).sort((a, b) => a[0] - b[0]).slice(0, 4);
        near.forEach(([d, m]) => { if (d < 9 && !n.links.some(l => l.to === m) && !OE.world.blocked({ x: n.x, y: n.y + 0.5, z: n.z }, { x: m.x, y: m.y + 0.5, z: m.z }, c => c.tag === 'door') && !OE.world.blocked({ x: n.x, y: n.y + 1.4, z: n.z }, { x: m.x, y: m.y + 1.4, z: m.z }, c => c.tag === 'door')) OE.Nav.link(n, m, { forced: true, crawl: o && o.crawl }); });
      });
    });
  };
})(window.OE);

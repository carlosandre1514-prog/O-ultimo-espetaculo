// Teste de jogabilidade: node tests/gameplay.mjs
// 1) caminha (com a física real do jogador) por TODAS as ligações do grafo de navegação
// 2) entra e sai de TODOS os esconderijos e confere câmera, ocupação e saída livre
// 3) abre e fecha TODAS as portas e confere o colisor
// 4) conectividade do inimigo e pontos onde o jogador fica preso
import { serve, open } from './smoke.mjs';
const srv = await serve(8131); const { browser, page, errors } = await open(8131, 640, 360);
const res = await page.evaluate(() => {
  const G = OE.game, P = G.player, H = OE.Hiding, W = OE.world, out = { fails: [] }; G.enemyOff = true; G.running = true;
  const step = (n, dt) => { for (let i = 0; i < n; i++) { for (const u of G.updatables) u.update(dt, P); } };
  // ---------- portas ----------
  let doorOk = 0; const doorFail = [];
  for (const d of OE.doors) {
    if (!d.toggle || d.axis) { doorOk++; continue; }
    const lock = d.lock; d.lock = null; if (d.open) { d.close('enemy'); for (let i = 0; i < 120; i++) d.update(1 / 30); } const a0 = d.col.yaw;
    d.toggle({ x: d.x + Math.sin(d.yaw) * 2, z: d.z + Math.cos(d.yaw) * 2 }, 'test'); for (let i = 0; i < 90; i++) d.update(1 / 30);
    const opened = Math.abs(d.col.yaw - a0) > 1.2;
    d.close('enemy'); for (let i = 0; i < 90; i++) d.update(1 / 30);
    const closed = Math.abs(d.col.yaw - a0) < 0.05; d.lock = lock;
    if (opened && closed) doorOk++; else doorFail.push(d.name + '@' + d.x.toFixed(1) + ',' + d.z.toFixed(1) + (opened ? '' : ' não abriu') + (closed ? '' : ' não fechou'));
  }
  out.doors = { total: OE.doors.length, ok: doorOk, fail: doorFail };
  // abre e destranca tudo para percorrer o mapa
  OE.doors.forEach(d => { d.lock = null; if (d.axis) { d.t = d.target = 1; d._apply(); } else if (!d.open) { d.toggle({ x: d.x + Math.sin(d.yaw) * 2, z: d.z + Math.cos(d.yaw) * 2 }, 'test'); d.angle = d.target; d._apply(); } });
  OE.Interact.list.filter(o => o instanceof OE.Pushable).forEach(p => { p.use(P); for (let i = 0; i < 60; i++) p.update(1 / 30); });
  // ---------- caminhada pelas ligações ----------
  let walked = 0, stuck = []; const I = { keys: {}, axes: () => ({ x: 0, y: 1, run: false }), pressed: () => false, lookX: 0, lookY: 0 };
  for (const e of OE.Nav.edges) {
    const a = e.a, b = e.b; if (e.a.tag === 'cat' && e.b.tag === 'cat' && Math.abs(a.y - b.y) < 0.1 && e.len > 12) continue;
    for (const [s, t] of [[a, b], [b, a]]) {
      P.teleport(s.x, s.y, s.z, 0); P.crouch = !!e.crawl; P.grounded = true; P.vy = 0;
      const maxT = e.len / 1.0 + 3; let tt = 0, ok = false;
      while (tt < maxT) {
        const dx = t.x - P.pos.x, dz = t.z - P.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.45 && Math.abs(P.pos.y - t.y) < 0.6) { ok = true; break; }
        const sp = (P.crouch ? 1.25 : 2.4) / 30; P.move(dx / d * Math.min(sp, d), dz / d * Math.min(sp, d), 1 / 30); tt += 1 / 30;
      }
      walked++; if (!ok) stuck.push(`${s.x.toFixed(1)},${s.y.toFixed(1)},${s.z.toFixed(1)} -> ${t.x.toFixed(1)},${t.y.toFixed(1)},${t.z.toFixed(1)} parou em ${P.pos.x.toFixed(1)},${P.pos.y.toFixed(1)},${P.pos.z.toFixed(1)}`);
    }
  }
  out.walk = { tried: walked, stuck: stuck.length, list: stuck.slice(0, 40) };
  // ---------- esconderijos ----------
  const hideFail = []; let hideOk = 0;
  for (const s of H.spots) {
    const g = W.ground(s.entry.x, s.entry.z, (s.y || 0) + 0.5, 0.3);
    P.teleport(s.entry.x, g, s.entry.z, s.cam.yaw + Math.PI); P.crouch = false; P.control = true; P.hidden = null; H.active = null; H.seq = null;
    // dá para alcançar a entrada? (não está dentro de um colisor)
    const blocked = W.overlaps(s.entry.x, s.entry.z, 0.28, g + 0.3, g + 1.0);
    H.enter(s); for (let i = 0; i < 90 && H.seq; i++) H.update(1 / 30, I);
    const inside = P.hidden === s && s.occupied && !H.seq;
    const camOk = Math.hypot(G.camera.position.x - s.cam.x, G.camera.position.z - s.cam.z) < 0.05;
    // câmera não pode estar dentro de parede (só dentro do próprio móvel)
    const camWall = W.overlaps(G.camera.position.x, G.camera.position.z, 0.05, G.camera.position.y - 0.05, G.camera.position.y + 0.05, null);
    const camBad = camWall && s.colliders.indexOf(camWall) < 0 && camWall.tag !== 'hide' && camWall.tag !== 'furn' && camWall.tag !== 'prop';
    H.exit(); for (let i = 0; i < 90 && H.seq; i++) H.update(1 / 30, I);
    const outOk = !P.hidden && P.control && !s.occupied && !W.overlaps(P.pos.x, P.pos.z, 0.28, P.pos.y + 0.47, P.pos.y + (P.crouch ? 1.0 : 1.75));
    if (inside && camOk && outOk && !blocked && !camBad) hideOk++; else hideFail.push(`${s.kind}@${s.x.toFixed(1)},${(s.y||0).toFixed(1)},${s.z.toFixed(1)} dentro:${inside} cam:${camOk} camParede:${camBad ? camWall.tag : 'não'} saiu:${outOk} entradaBloqueada:${!!blocked}`);
    P.hidden = null; H.active = null; H.seq = null; P.control = true; document.body.className = '';
  }
  out.hide = { total: H.spots.length, ok: hideOk, cats: H.spots.reduce((m, s) => (m[s.cat] = (m[s.cat] || 0) + 1, m), {}), fail: hideFail };
  // ---------- conectividade do inimigo (portas fechadas mas destrancadas; trancadas bloqueiam) ----------
  const start = OE.Nav.nodes.find(n => n.tag === 'enemyStart') || OE.Nav.nearest({ x: 0, y: 0, z: 20 });
  const reach = OE.Nav.reachable(start, 'enemy'); const unreached = OE.Nav.nodes.filter(n => !reach.has(n) && !n.crawl);
  out.enemy = { nodes: OE.Nav.nodes.length, reach: reach.size, unreached: unreached.length, sample: unreached.slice(0, 25).map(n => `${n.x.toFixed(0)},${n.y.toFixed(1)},${n.z.toFixed(0)}`) };
  // ---------- teste de "preso": ponto aleatório em área livre, tenta sair em 8 direções ----------
  const trap = []; const rnd = OE.rng(5);
  for (let k = 0; k < 400; k++) {
    const n = OE.Nav.nodes[(rnd() * OE.Nav.nodes.length) | 0]; const x = n.x + (rnd() - 0.5) * 3, z = n.z + (rnd() - 0.5) * 3;
    const g = W.ground(x, z, n.y + 0.5, 0.3); if (g < n.y - 0.6) continue; if (W.overlaps(x, z, 0.3, g + 0.47, g + 1.0)) continue;
    let free = 0; for (let a = 0; a < 8; a++) { P.teleport(x, g, z, 0); P.crouch = W.overlaps(x, z, 0.3, g + 1.0, g + 1.75) ? true : false; for (let i = 0; i < 20; i++) P.move(Math.cos(a * 0.785) * 0.08, Math.sin(a * 0.785) * 0.08, 1 / 30); if (Math.hypot(P.pos.x - x, P.pos.z - z) > 0.8) free++; }
    if (free === 0) trap.push(`${x.toFixed(1)},${g.toFixed(1)},${z.toFixed(1)}`);
  }
  out.trapped = trap;
  return out;
});
console.log(JSON.stringify(res, null, 1));
console.log('erros JS:', errors.filter(e => !/GPU stall|swiftshader|WebGL/.test(e)).slice(0, 10).join('\n') || 'nenhum');
await browser.close(); srv.close();

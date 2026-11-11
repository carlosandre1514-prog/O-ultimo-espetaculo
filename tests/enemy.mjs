// Teste do inimigo: perseguição + captura, esconderijo visto, navegação por destinos aleatórios.
import { serve, open } from './smoke.mjs';
const srv = await serve(8133); const { browser, page, errors } = await open(8133, 480, 270);
const res = await page.evaluate(() => {
  const G = OE.game, P = G.player, E = G.enemy, H = OE.Hiding, out = {}; G.running = true; G.enemyOff = false;
  const I = OE.Input; let caught = 0; OE.on('caught', () => caught++);
  const sim = (sec, stopFn) => { for (let t = 0; t < sec * 30; t++) { G.update(1 / 30); I.endFrame(); if (stopFn && stopFn()) return t / 30; } return -1; };
  // 1) jogador parado e visível no picadeiro, inimigo a 14 m
  P.teleport(0, 0, 12, Math.PI); E.place(OE.Nav.nearest({ x: 0, y: 0, z: 3.5 })); E.yaw = 0;
  out.chaseCatch = sim(25, () => caught > 0); out.respawned = (sim(4, () => !G.dying), G.checkpoint && G.checkpoint.name);
  // 2) foge para o guarda-roupa com o inimigo vendo -> ele revista e pega
  caught = 0; const sp = H.spots.find(s => s.kind === 'wardrobe' && Math.abs(s.x + 21.4) < 0.1);
  P.teleport(sp.entry.x, 0, sp.entry.z, 0); E.place(OE.Nav.nearest({ x: -16, y: 0, z: -44 }));
  E.state = 'chase'; E.aware = 2; E.visibleT = OE.state.time; E.lastSeen = P.pos.clone();
  H.enter(sp); out.seenHide = sim(25, () => caught > 0); sim(4, () => !G.dying);
  // 3) esconde sem ser visto, inimigo longe patrulhando: sobrevive 30 s?
  caught = 0; const sp2 = H.spots.find(s => s.kind === 'locker'); P.teleport(sp2.entry.x, sp2.y || 0, sp2.entry.z, 0); E.place(OE.Nav.nodes.find(n => Math.hypot(n.x - sp2.x, n.z - sp2.z) > 70));
  H.enter(sp2); sim(2); out.hiddenSurvived30s = sim(30, () => caught > 0) < 0; H.exit(); sim(2);
  // 4) navegação: 25 destinos aleatórios
  G.player.teleport(-100, 0, 90, 0); let ok = 0, tries = 0; const r = OE.rng(9);
  for (let k = 0; k < 25; k++) { const n = OE.Nav.nodes[(r() * OE.Nav.nodes.length) | 0]; if (n.crawl) continue; tries++; E.state = 'investigate'; E.goTo(n.p);
    if (!E.path) continue; const t = sim(120, () => !E.path); if (t >= 0 && Math.hypot(E.pos.x - n.x, E.pos.z - n.z) < 2.5) ok++; }
  out.navigate = ok + '/' + tries; return out;
});
console.log(JSON.stringify(res)); console.log(errors.filter(e => !/404/.test(e)).slice(0, 5).join('\n'));
await browser.close(); srv.close();

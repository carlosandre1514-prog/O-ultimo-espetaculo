// Teste online: servidor PeerJS local + dois navegadores (anfitrião e convidado)
import { serve } from './smoke.mjs'; import { createRequire } from 'module';
const require = createRequire(import.meta.url); const { chromium } = require('/opt/node-tools/node_modules/playwright/index.js');
const { ExpressPeerServer } = require('/tmp/claude-0/pj/node_modules/peer'); const express = require('/tmp/claude-0/pj/node_modules/express');
const app = express(); const ps = app.listen(9000, '127.0.0.1'); app.use('/', ExpressPeerServer(ps, { path: '/' })); const srv = await serve(8196);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const mk = async (char) => { const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(c => { try { localStorage.setItem('oe.char', c); localStorage.setItem('oe.quality', 'suave'); } catch (e) {} }, char);
  await p.goto('http://localhost:8196/index.html?peerhost=127.0.0.1:9000'); await p.waitForFunction(() => window.OE && OE.ready, null, { timeout: 200000 }); return { p, errs }; };
const A = await mk('lucas'), B = await mk('lucas');                       // os dois pedem o Lucas: o convidado deve ganhar outro
await A.p.click('#netCreate'); await A.p.waitForFunction(() => OE.Net.code && OE.Net.me, null, { timeout: 30000 });
const code = await A.p.evaluate(() => OE.Net.code);
await B.p.fill('#netCode', code); await B.p.click('#netJoin');
await A.p.waitForFunction(() => OE.Net.roster.length === 2, null, { timeout: 30000 });
await B.p.waitForFunction(() => OE.Net.roster.length === 2, null, { timeout: 30000 });
const lobby = await B.p.evaluate(() => ({ roster: OE.Net.roster.map(r => r.char), status: document.getElementById('netSt').textContent }));
await A.p.evaluate(() => { OE.noPointerLock = true; document.getElementById('netGo').click(); });
await B.p.waitForFunction(() => OE.game.running && OE.Net.started, null, { timeout: 30000 });
await A.p.waitForFunction(() => [...OE.Net.remotes.values()].every(r => r.loaded) && OE.Net.remotes.size === 1, null, { timeout: 120000 });
await B.p.waitForFunction(() => [...OE.Net.remotes.values()].every(r => r.loaded) && OE.Net.remotes.size === 1, null, { timeout: 120000 });
// convidado anda; anfitrião deve ver
await B.p.evaluate(() => OE.game.player.teleport(5, 0, 80, 0)); await A.p.waitForTimeout(1500);
const seen = await A.p.evaluate(() => { const r = [...OE.Net.remotes.values()][0]; return { char: r.char, pos: r.pos.toArray().map(v => +v.toFixed(1)) }; });
// captura: o anfitrião olhando para o convidado (que está de lanterna acesa)
await B.p.evaluate(() => { OE.game.player.teleport(0, 0, 84, Math.PI); OE.game.flashOn = true; OE.Lights.setFlash(true); });
await A.p.evaluate(() => { const P = OE.game.player; P.teleport(0, 0, 89, 0); P.pitch = 0.05; OE.game.flashOn = true; OE.Lights.setFlash(true); });
await A.p.waitForTimeout(3000);
{ const d = await A.p.evaluate(() => { const G = OE.game; G.render(); return G.renderer.domElement.toDataURL('image/jpeg', 0.9); }); (await import('fs')).writeFileSync(process.env.SHOT || '/tmp/claude-0/coop.jpg', Buffer.from(d.split(',')[1], 'base64')); }
// porta, item, energia
await A.p.evaluate(() => { const d = OE.doors.find(x => x.name === 'porta da guarita'); d.toggle({ x: 10, z: 92.5 }, 'player'); OE.giveItem('chave_camarim'); OE.state.items.add('fusivel'); OE.Interact.list.find(o => o instanceof OE.Generator).use(); });
await B.p.waitForTimeout(1500);
const sync = await B.p.evaluate(() => ({ door: OE.doors.find(x => x.name === 'porta da guarita').open, item: OE.state.items.has('chave_camarim'), power: OE.state.power, enemyDriven: !!OE.game.enemyRemote && !!OE.game.enemy.netTarget }));
// o Mestre do anfitrião agarra o convidado
await A.p.evaluate(() => { const R = [...OE.Net.remotes.values()][0], E = OE.game.enemy; OE.game.enemyOff = false; E.pos.set(R.pos.x, R.pos.y, R.pos.z + 1.5); E.grab(R); });
await B.p.waitForFunction(() => OE.game.dying, null, { timeout: 15000 }).catch(() => {});
const kill = { victimDying: await B.p.evaluate(() => !!OE.game.dying), hostSaw: await A.p.evaluate(() => [...OE.Net.remotes.values()][0].killAnim) };
console.log(JSON.stringify({ code, lobby, seen, sync, kill }, null, 1));
console.log('erros A:', A.errs.slice(0, 3).join(' | ') || 'nenhum', '| erros B:', B.errs.slice(0, 3).join(' | ') || 'nenhum');
await b.close(); srv.close(); ps.close && ps.close(); process.exit(0);

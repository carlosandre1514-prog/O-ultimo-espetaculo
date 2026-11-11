// Teste da história: intro, portão que fecha, documentos, senha, caixinha, energia, final e fuga
import { serve, open } from './smoke.mjs'; import fs from 'fs';
const grab = async (page, file) => { const d = await page.evaluate(() => { const G = OE.game; G.render(); return G.renderer.domElement.toDataURL('image/png'); }); fs.writeFileSync(file, Buffer.from(d.split(',')[1], 'base64')); };
const out = process.argv[2]; const srv = await serve(8190); const { browser, page, errors } = await open(8190, 960, 540);
await page.evaluate(() => { OE.noPointerLock = true; document.getElementById('start').click(); OE.game.enemyOff = true; });
await page.waitForTimeout(1500); if (out) await page.screenshot({ path: out + '/s_intro.png' });
const r = await page.evaluate(async () => {
  const G = OE.game, P = G.player, S = OE.Story, res = {}, wait = ms => new Promise(r => setTimeout(r, ms));
  document.getElementById('intro').click(); await wait(800);
  res.introOk = !G.paused && !!S.obj; res.obj0 = S.obj;
  res.gateOpenAtStart = OE.doors.filter(d => d.name === 'portão').every(d => d.open);
  P.teleport(0, 0, 90, 0); await wait(600);
  res.trapped = S.flags.trapped && OE.doors.filter(d => d.name === 'portão').every(d => d.lock === 'sealed'); res.obj1 = S.obj;
  res.docsOnMap = OE.Interact.list.filter(o => o.label && /^Ler: /.test(o.label() || '')).length;
  ['ingresso', 'programa', 'contrato'].forEach(id => S.read(id)); document.getElementById('note').click(); res.ch = S.ch; res.obj2 = S.obj;
  const door = OE.doors.find(d => d.name === 'porta dos arquivos'); S.keypad(door, '1403');
  for (const k of ['9', '9', '9', '9']) document.querySelector('#keypad [data-k="' + k + '"]').click(); await wait(400); res.wrongCodeStillLocked = !!door.lock;
  for (const k of ['1', '4', '0', '3']) document.querySelector('#keypad [data-k="' + k + '"]').click(); await wait(500); res.codeOpens = door.lock === null;
  P.teleport(19.5, -4.5, -38, 0); await wait(400); res.obj3 = S.obj;
  S.pickBox(); res.hasBox = OE.state.items.has('caixinha'); res.obj4 = S.obj;
  S.breakBox(); res.needsPowerFirst = !S.final;
  OE.state.items.add('fusivel'); const gen = OE.Interact.list.find(o => o instanceof OE.Generator); gen.use(); res.power = OE.state.power;
  S.breakBox(); res.finalStarted = !!S.final; res.gateReopens = OE.doors.filter(d => d.name === 'portão').every(d => !d.lock);
  P.teleport(0, 0, 102.5, 0); for (let i = 0; i < 20 && !S.ended; i++) { G.update(1 / 30); await wait(50); } res.ending = document.getElementById('ending').classList.contains('good');
  res.journal = S.found.size + '/' + S.docs.size; return res;
});
console.log(JSON.stringify(r, null, 1));
if (out) {
  await page.evaluate(() => { document.getElementById('ending').className = ''; OE.game.paused = false; OE.Story.ended = false; OE.Story.final = null; const P = OE.game.player; P.teleport(-108.5, 0, -35.2, Math.PI / 2 + 0.3); OE.game.flashOn = true; OE.Lights.setFlash(true); });
  await page.waitForTimeout(1500); await grab(page, out + '/s_espelhos.png');
  await page.evaluate(() => { const G = OE.game, P = G.player, E = G.enemy; P.teleport(0, 0, 9.5, Math.PI); P.pitch = 0.15; E.pos.set(0, 0, 12.5); E.yaw = Math.PI; E.state = 'patrol'; E.path = null; E.wait = 99; G.enemyOff = false; });
  await page.waitForTimeout(1500); await grab(page, out + '/s_mestre.png');
}
console.log(errors.filter(e => !/404/.test(e)).slice(0, 6).join('\n')); await browser.close(); srv.close();

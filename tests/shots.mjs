// Capturas de inspeção: node tests/shots.mjs <saida_dir> '<json views>'
// view: {n:nome, p:[x,y,z], yaw, pitch, flash, map, walk:[x,y,z] (posiciona o corpo do jogador)}
import { serve, open } from './smoke.mjs';
const out = process.argv[2], views = JSON.parse(process.argv[3]);
const srv = await serve(8124); const { browser, page, errors } = await open(8124, +(process.env.W || 1280), +(process.env.H || 720));
await page.evaluate(() => { OE.noPointerLock = true; document.getElementById('start').click(); OE.game.enemyOff = !window.ENEMY; });
await page.waitForFunction(() => !(OE.game.cine && OE.game.cine.active) || OE.Cine.flash, null, { timeout: 60000 }); await page.waitForTimeout(500); await page.evaluate(() => { if (OE.Cine && OE.game.cine && OE.game.cine.active) OE.Cine.finish(); OE.game.enemyOff = !window.ENEMY; });
for (const v of views) {
  await page.evaluate(v => {
    const G = OE.game, P = G.player; G.mapView = !!v.map; G.flashOn = !!v.flash; OE.Lights.setFlash(!!v.flash);
    if (v.walk) { P.spectator = false; P.teleport(v.walk[0], v.walk[1], v.walk[2], v.yaw || 0); P.pitch = v.pitch || 0; }
    else { P.spectator = true; P.spec.set(v.p[0], v.p[1], v.p[2]); P.yaw = v.yaw || 0; P.pitch = v.pitch || 0; }
    if (v.enemy) { G.enemyOff = false; G.enemy.pos.set(v.enemy[0], v.enemy[1], v.enemy[2]); G.enemy.yaw = v.enemy[3] || 0; G.enemy.state = 'patrol'; G.enemy.path = null; G.enemy.wait = 99; }
    if (v.debug) document.getElementById('debug').classList.add('on');
  }, v);
  await page.waitForTimeout(v.wait || 1400);
  await page.screenshot({ path: `${out}/${v.n}.png` });
}
console.log(errors.slice(0, 20).join('\n'));
await browser.close(); srv.close();

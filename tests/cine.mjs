// Cinemática de abertura: roda inteira e captura um quadro por plano (lendo o canvas)
import { serve, open } from './smoke.mjs'; import fs from 'fs';
const out = process.argv[2]; const srv = await serve(8194); const { browser, page, errors } = await open(8194, 960, 540);
const grab = async n => { const d = await page.evaluate(() => { const G = OE.game; G.render(); return G.renderer.domElement.toDataURL('image/jpeg', 0.85); }); if (out) fs.writeFileSync(`${out}/${n}.jpg`, Buffer.from(d.split(',')[1], 'base64')); };
await page.evaluate(() => { OE.noPointerLock = true; OE.game.enemyOff = true; document.getElementById('start').click(); });
await page.waitForFunction(() => OE.Cine.active && OE.Cine.hero, null, { timeout: 120000 });
// avança a cena em passos fixos de 1/30 s (independe da velocidade do navegador de teste)
await page.evaluate(() => { OE.game.paused = true; });
const stepTo = async cond => { for (let k = 0; k < 400; k++) { const ok = await page.evaluate(c => { const C = OE.Cine, G = OE.game; for (let i = 0; i < 15; i++) { if (!C.active || eval(c)) return true; G.update(1 / 30); } return !C.active || eval(c); }, cond); if (ok) return; } };
const marks = [[3, 'k1_aereo'], [9, 'k2_estrada'], [15, 'k3_vira'], [18, 'k4_close'], [22, 'k5_close'], [28.5, 'k6_silhueta']];
for (const [t, n] of marks) { await stepTo('C.t > ' + t); await grab(n); }
await stepTo('C.slamT'); await grab('k7_portao');
for (const [dt, n] of [[2.5, 'k8_grades'], [6.8, 'k9_apagao'], [7.6, 'k10_sumiram']]) { await stepTo('C.t - C.slamT > ' + dt); await grab(n); }
await stepTo('false'); await page.evaluate(() => { OE.game.paused = false; });
const r = await page.evaluate(() => ({ playing: !OE.game.paused, trapped: OE.Story.flags.trapped, gates: OE.doors.filter(d => d.name === 'portão').map(d => d.lock + '/' + d.open), pos: OE.game.player.pos.toArray().map(v => +v.toFixed(1)), obj: OE.Story.obj, actorsLeft: OE.Cine.actors.length }));
await grab('k11_jogo'); console.log(JSON.stringify(r)); console.log(errors.filter(e => !/404/.test(e)).slice(0, 6).join('\n')); await browser.close(); srv.close();

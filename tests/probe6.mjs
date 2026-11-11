import { serve, open } from './smoke.mjs';
const srv = await serve(8132); const { browser, page } = await open(8132, 640, 360);
await page.evaluate(() => { OE.noPointerLock = true; document.getElementById('start').click(); });
for (let i = 0; i < 4; i++) { await new Promise(r => setTimeout(r, 4000)); console.log(await page.evaluate(() => { const G = OE.game; let a = performance.now(); G.update(0.016); const u = performance.now() - a; a = performance.now(); G.render(); return 'fps ' + G.fps.toFixed(1) + ' update ' + u.toFixed(1) + ' render ' + (performance.now() - a).toFixed(1) + ' calls ' + G.renderer.info.render.calls; })); }
await browser.close(); srv.close();

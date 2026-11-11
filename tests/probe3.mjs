import { serve, open } from './smoke.mjs';
const srv = await serve(8127); const { browser, page } = await open(8127, 960, 540);
const r = await page.evaluate(() => { const G = OE.game, P = G.player; P.teleport(0, 0, 24, 0); G.update(0.016);
  const d = OE.Sectors.byName.Entrada.dyn; return d.children.filter(o => o.visible).map(o => o.type + '@' + o.position.x.toFixed(1) + ',' + o.position.z.toFixed(1) + ' n=' + o.children.length); });
console.log(r.join('\n')); await browser.close(); srv.close();

import { serve, open } from './smoke.mjs';
const srv = await serve(8130); const { browser, page } = await open(8130, 960, 540);
const r = await page.evaluate(() => { const G = OE.game, P = G.player; G.enemyOff = true; P.teleport(19.5, -4.5, -38, 0); for (let i = 0; i < 3; i++) G.update(0.016);
  return { cam: G.camera.position.toArray(), pos: P.pos.toArray(), vis: OE.Sectors.list.map(d => d.name + ':' + d.group.visible) }; });
console.log(JSON.stringify(r)); await browser.close(); srv.close();

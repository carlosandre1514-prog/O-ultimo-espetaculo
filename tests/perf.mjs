// Mede draw calls / triângulos / tempo de quadro em pontos do mapa (olhando em 4 direções)
import { serve, open } from './smoke.mjs';
const srv = await serve(8128); const { browser, page } = await open(8128, 960, 540);
const pts = JSON.parse(process.argv[2] || '[["estrada",0,0,128],["praca",0,0,62],["tenda",0,0,20],["passarela",0,9.5,16],["bastidores",0,0,-49.2],["alojamentos",-54,0,-50],["deposito",58,0,-50],["estabulo",75,0,22],["parque",-62,0,25],["subsolo",19.5,-4.5,-38]]');
await page.evaluate(f => { window.__FL = f; }, !!process.env.FLASH);
const res = await page.evaluate(async pts => {
  const G = OE.game, P = G.player, out = []; G.enemyOff = true; if (G.cine && G.cine.active) OE.Cine.finish(); G.flashOn = window.__FL; OE.Lights.setFlash(window.__FL);
  for (const [n, x, y, z] of pts) { let calls = 0, tris = 0, ms = 0;
    for (let k = 0; k < 4; k++) { P.teleport(x, y, z, k * Math.PI / 2); for (let i = 0; i < 3; i++) G.update(0.016); const a = performance.now(); if (OE.Q.shadow) G.renderer.shadowMap.needsUpdate = G.flashOn; G.renderer.render(G.scene, G.camera); ms += performance.now() - a;
      calls = Math.max(calls, G.renderer.info.render.calls); tris = Math.max(tris, G.renderer.info.render.triangles); }
    out.push(n + ': calls ' + calls + ' tri ' + (tris / 1000).toFixed(0) + 'k render(swiftshader) ' + (ms / 4).toFixed(0) + 'ms');
  } return out; }, pts);
console.log(res.join('\n')); await browser.close(); srv.close();

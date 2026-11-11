import { serve, open } from './smoke.mjs';
const srv = await serve(8125); const { browser, page, errors } = await open(8125, 960, 540);
const r = await page.evaluate(() => {
  OE.noPointerLock = true; const G = OE.game; G.running = true; OE.Audio.init && 0;
  const t = {}; const P = G.player; P.teleport(0, 0, 128, 0);
  let a = performance.now(); G.update(0.016); t.update = performance.now() - a;
  a = performance.now(); OE.game.enemy.update(0.016); t.enemy = performance.now() - a;
  a = performance.now(); OE.Interact.update(P, G.camera); t.interact = performance.now() - a;
  a = performance.now(); OE.Lights.update(0.016, G.camera, P.pos); t.lights = performance.now() - a;
  a = performance.now(); G.renderer.render(G.scene, G.camera); t.render = performance.now() - a;
  t.calls = G.renderer.info.render.calls; t.tris = G.renderer.info.render.triangles; t.emitters = OE.Lights.emitters.length;
  t.meshes = 0; G.scene.traverse(o => { if (o.isMesh) t.meshes++; });
  return t;
});
console.log(JSON.stringify(r)); console.log(errors.slice(0, 10).join('\n'));
await browser.close(); srv.close();

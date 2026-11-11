import { serve, open } from './smoke.mjs';
const srv = await serve(8126); const { browser, page } = await open(8126, 960, 540);
const pos = JSON.parse(process.argv[2] || '[0,0,128,0]');
const r = await page.evaluate((pos) => {
  const G = OE.game, P = G.player; P.teleport(pos[0], pos[1], pos[2], pos[3]); G.update(0.016); G.camera.updateMatrixWorld();
  const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(G.camera.projectionMatrix, G.camera.matrixWorldInverse));
  const by = {}, nan = []; let n = 0;
  G.scene.traverse(o => { if (o.isMesh && o.geometry.boundingSphere && isNaN(o.geometry.boundingSphere.radius)) { let s = o; while (s.parent && s.parent !== G.scene) s = s.parent; nan.push(s.name + ':' + (o.material.name || '?')); } });
  G.scene.traverseVisible(o => { if (!(o.isMesh || o.isPoints)) return; if (o.frustumCulled && !fr.intersectsObject(o)) return; let s = o; while (s.parent && s.parent !== G.scene) s = s.parent; const k = (s.name || 'scene') + (o.userData.lod ? '/' + o.userData.lod : '') ; by[k] = (by[k] || 0) + 1; n++; });
  return { n, by, nan: nan.slice(0, 12) };
}, pos);
console.log(JSON.stringify(r, null, 0));
await browser.close(); srv.close();

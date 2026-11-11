#!/usr/bin/env node
/* Otimiza os GLB do Meshy para celular (glTF-Transform + sharp):
   - texturas: no máximo 1024 px, JPEG (PNG só se tiver transparência);
   - remove dados duplicados/não usados, solda vértices;
   - arquivos de animação (*_walk/_run): ficam só os ossos e as animações (sem malha nem textura).
   - brinquedos (assets/models/brinquedos): todas as peças viram uma malha com textura-paleta.
   Uso: npm i @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4 sharp
        node tools/optimize_models.cjs [assets/models] */
const path = require('path'), fs = require('fs');
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const { dedup, prune, weld, resample, textureCompress, flatten, join, palette } = require('@gltf-transform/functions');
const sharp = require('sharp');
const dir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'assets', 'models'));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
(async () => {
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.glb'))) {
    const p = path.join(dir, f), before = fs.statSync(p).size, doc = await io.read(p), root = doc.getRoot();
    const animOnly = /_(walk|run|idle)\.glb$/.test(f) || /[\\/]anim$/.test(dir);
    const ride = /brinquedos/.test(dir);
    if (ride) {
      // brinquedos do MiniBlender: muitas peças com cores lisas -> paleta + uma malha só (1 draw call)
      await doc.transform(dedup(), flatten(), palette({ min: 2 }), join({ keepNamed: false }), weld(), prune());
    } else if (animOnly) {
      root.listNodes().forEach(n => { if (n.getMesh()) n.setMesh(null); if (n.getSkin()) n.setSkin(null); });
      root.listMeshes().forEach(m => m.dispose()); root.listMaterials().forEach(m => m.dispose()); root.listTextures().forEach(t => t.dispose());
      await doc.transform(resample(), prune(), dedup());
    } else {
      await doc.transform(dedup(), weld(), textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [1024, 1024], quality: 82,
        pattern: /^(?!.*alpha).*$/ }), prune());
    }
    await io.write(p, doc);
    const tris = root.listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((a, pr) => a + ((pr.getIndices() ? pr.getIndices().getCount() : pr.getAttribute('POSITION').getCount()) / 3), 0), 0);
    console.log(f.padEnd(24), (before / 1048576).toFixed(1) + ' MB ->', (fs.statSync(p).size / 1048576).toFixed(2) + ' MB', animOnly ? '(só animação: ' + root.listAnimations().length + ' clipe)' : Math.round(tris) + ' triângulos');
  }
})();

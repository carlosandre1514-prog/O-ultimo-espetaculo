'use strict';
/* Modelos externos (GLB) — ponto de integração com o Meshy.ai (ou qualquer GLB).
   Se existir assets/models/manifest.json, cada entrada é carregada com o GLTFLoader (o mesmo do
   MiniBlender), posicionada no mapa com colisor simplificado e entra no setor indicado
   (carregamento por setor e culling continuam valendo). "enemy" substitui o corpo do palhaço.
   Formato:
   { "enemy": { "file": "palhaco.glb", "height": 2.05 },
     "props": [ { "file": "cavalo.glb", "sector": "Parque", "pos": [-62, 0.45, 13], "yaw": 1.2, "height": 1.6, "collider": [1.4, 1.6, 0.4] } ] }
   O script tools/meshy_generate.mjs gera os GLB pela API do Meshy e escreve este manifesto. */
(function (OE) {
  const M = { manifest: null };
  OE.Models = M;
  function loader() { return new THREE.GLTFLoader(); }
  async function loadGLTF(file) {
    return new Promise((res, rej) => loader().load(OE.asset('assets/models/' + file), g => res(g), undefined, rej));
  }
  async function loadGLB(file) { return (await loadGLTF(file)).scene; }
  // normaliza altura, apoia no chão, materiais padronizados (sombra/neblina iguais ao resto)
  function fit(obj, height) {
    // personagem com esqueleto: a malha é posicionada pelos ossos, então mede pelos ossos
    let bones = []; obj.updateMatrixWorld(true); obj.traverse(o => { if (o.isBone) bones.push(o.getWorldPosition(new THREE.Vector3())); });
    if (bones.length) {
      let y0 = Infinity, y1 = -Infinity; bones.forEach(p => { y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
      const full = (y1 - y0) / 0.93, s = height / (full || 1); obj.scale.multiplyScalar(s); obj.position.y -= y0 * s;
      obj.traverse(o => { if (o.isMesh) { o.material.fog = true; if (o.material.map) o.material.map.encoding = THREE.sRGBEncoding; o.material.metalness = Math.min(o.material.metalness, 0.2); } });
      const w = new THREE.Group(); w.add(obj); return w;
    }
    const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3());
    const s = height / (size.y || 1); obj.scale.multiplyScalar(s);
    const b2 = new THREE.Box3().setFromObject(obj); obj.position.y -= b2.min.y;
    obj.traverse(o => { if (o.isMesh) { o.material.fog = true; if (o.material.map) o.material.map.encoding = THREE.sRGBEncoding; } });
    const wrap = new THREE.Group(); wrap.add(obj); return wrap;
  }
  M.loadManifest = async function () {
    if (M.manifest !== null) return M.manifest;
    try { const r = await fetch(OE.asset('assets/models/manifest.json')); M.manifest = r.ok ? await r.json() : false; } catch (e) { M.manifest = false; }
    return M.manifest;
  };
  // Inimigo: GLB com esqueleto (rigging do Meshy) + clipes de animação em arquivos separados
  // ("anims": {"walk": "x_walk.glb", "run": "x_run.glb"}) — os ossos têm os mesmos nomes.
  M.enemyModel = async function () {
    const m = await M.loadManifest(); if (!m || !m.enemy) return null;
    try {
      const g = await loadGLTF(m.enemy.file), obj = fit(g.scene, m.enemy.height || 2.05);
      obj.traverse(o => { if (o.isSkinnedMesh) o.frustumCulled = false; });
      const mixer = new THREE.AnimationMixer(g.scene), actions = {};
      g.animations.forEach(c => { actions[c.name.toLowerCase()] = mixer.clipAction(c); });
      for (const [k, f] of Object.entries(m.enemy.anims || {})) {
        try { const a = await loadGLTF(f); if (a.animations[0]) actions[k] = mixer.clipAction(a.animations[0]); } catch (e) { console.warn('animação', k, e); }
      }
      return { obj, mixer, actions };
    } catch (e) { console.warn('GLB do inimigo falhou', e); return null; }
  };
  // chamado depois que os setores foram construídos
  M.placeProps = async function () {
    const m = await M.loadManifest(); if (!m || !m.props) return 0; let n = 0;
    for (const p of m.props) {
      try {
        const obj = fit(await loadGLB(p.file), p.height || 1); obj.position.set(p.pos[0], p.pos[1], p.pos[2]); obj.rotation.y = p.yaw || 0;
        const def = OE.Sectors.byName[p.sector]; (def ? def.dyn : OE.scene).add(obj); obj.userData.far = true;
        if (p.collider) OE.world.box(p.pos[0], p.pos[1] + p.collider[1] / 2, p.pos[2], p.collider[0] / 2, p.collider[1] / 2, p.collider[2] / 2, p.yaw || 0, 'prop');
        n++;
      } catch (e) { console.warn('GLB falhou', p.file, e); }
    }
    return n;
  };
})(window.OE);

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
    const p = 'assets/models/' + file, url = window.OE_ASSET_LAZY ? await window.OE_ASSET_LAZY(p) : OE.asset(p);   // artefato: decodifica sob demanda
    return new Promise((res, rej) => loader().load(url, g => res(g), undefined, rej));
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
  // Adolescentes: modelo com esqueleto + clipes compartilhados (mesmos 24 ossos em todos os rigs do Meshy)
  const clipCache = {};
  M.loadCharacter = async function (id) {
    const m = await M.loadManifest(); if (!m || !m.characters) return null;
    const c = m.characters.find(x => x.id === id) || m.characters[0]; if (!c) return null;
    const g = await loadGLTF(c.file), obj = fit(g.scene, c.height || 1.72);
    // malha com esqueleto em escala de centímetros: a esfera de culling fica errada -> não descartar
    obj.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (OE.Q.shadow) o.castShadow = true; } });
    const mixer = new THREE.AnimationMixer(g.scene), actions = {};
    for (const [k, f] of Object.entries(m.teenAnims || {})) {
      try { if (!clipCache[k]) { const a = await loadGLTF(f); clipCache[k] = a.animations[0]; } if (clipCache[k]) actions[k] = mixer.clipAction(clipCache[k]); } catch (e) { console.warn('animação', k, e); }
    }
    ['jump', 'pickup', 'door', 'strangled', 'dead', 'scared'].forEach(k => { if (actions[k]) { actions[k].setLoop(THREE.LoopOnce, 1); actions[k].clampWhenFinished = true; } });
    return { obj, mixer, actions, info: c };
  };
  M.enemyModel = async function () {
    const m = await M.loadManifest(); if (!m || !m.enemy) return null;
    try {
      const g = await loadGLTF(m.enemy.file), obj = fit(g.scene, m.enemy.height || 2.05);
      obj.traverse(o => { if (o.isSkinnedMesh) o.frustumCulled = false; if (o.isMesh && OE.Q.shadow) o.castShadow = true; });
      const mixer = new THREE.AnimationMixer(g.scene), actions = {};
      g.animations.forEach(c => { actions[c.name.toLowerCase()] = mixer.clipAction(c); });
      for (const [k, f] of Object.entries(m.enemy.anims || {})) {
        try { const a = await loadGLTF(f); if (a.animations[0]) actions[k] = mixer.clipAction(a.animations[0]); } catch (e) { console.warn('animação', k, e); }
      }
      return { obj, mixer, actions };
    } catch (e) { console.warn('GLB do inimigo falhou', e); return null; }
  };
  // Desgaste no shader: ferrugem e sujeira projetadas em 3 eixos (triplanar) sobre as cores lisas
  // dos brinquedos modelados no MiniBlender; mais sujo perto do chão, escorrido nas verticais.
  function weather(mat, strength) {
    if (mat.userData.weathered) return; mat.userData.weathered = true;
    mat.onBeforeCompile = sh => {
      sh.uniforms.tRust = { value: OE.TEX.rust }; sh.uniforms.tDirt = { value: OE.TEX.concreteDark }; sh.uniforms.wStr = { value: strength };
      sh.vertexShader = 'varying vec3 vWP; varying vec3 vWN;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = 'uniform sampler2D tRust; uniform sampler2D tDirt; uniform float wStr; varying vec3 vWP; varying vec3 vWN;\n' +
        'vec3 tri(sampler2D t, vec3 p, vec3 n){ vec3 w = abs(n); w /= (w.x + w.y + w.z); return texture2D(t, p.zy).rgb * w.x + texture2D(t, p.xz).rgb * w.y + texture2D(t, p.xy).rgb * w.z; }\n' +
        sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
          vec3 rust = tri(tRust, vWP * 0.55, vWN), dirt = tri(tDirt, vWP * 0.3, vWN);
          float r = smoothstep(0.08, 0.28, rust.r - rust.b) * (0.55 + 0.45 * smoothstep(0.5, 0.0, vWN.y));
          float low = 1.0 - smoothstep(0.0, 1.8, vWP.y);
          diffuseColor.rgb = mix(diffuseColor.rgb, rust * 1.1, clamp(r * wStr, 0.0, 0.85));
          diffuseColor.rgb *= mix(vec3(1.0), dirt * 1.5, 0.45 * wStr + 0.3 * low) * 0.85;`);
    };
    mat.needsUpdate = true;
  }
  M.weather = weather;
  const rotL = (x, z, yaw, lx, lz) => ({ x: x + lx * Math.cos(yaw) + lz * Math.sin(yaw), z: z - lx * Math.sin(yaw) + lz * Math.cos(yaw) });
  // chamado depois que os setores foram construídos
  M.placeProps = async function () {
    const m = await M.loadManifest(); if (!m || !m.props) return 0; let n = 0;
    // brinquedos do parque (modelados no MiniBlender): já em metros, com colisores e esconderijos
    for (const p of m.rides || []) {
      try {
        const obj = await loadGLB(p.file), wrap = new THREE.Group(); wrap.add(obj); wrap.position.set(p.pos[0], p.pos[1], p.pos[2]); wrap.rotation.y = p.yaw || 0;
        obj.traverse(o => { if (o.isMesh) { o.material.fog = true; if (o.material.map) o.material.map.encoding = THREE.sRGBEncoding; weather(o.material, p.weather === undefined ? 0.75 : p.weather); } });
        wrap.userData.far = true; const def = OE.Sectors.byName[p.sector]; (def ? def.dyn : OE.scene).add(wrap); wrap.updateMatrixWorld(true);
        const yaw = p.yaw || 0, y = p.pos[1];
        (p.colliders || []).forEach(c => {
          if (c.box) { const [lx, ly, lz, w, h, d, ly2] = c.box, q = rotL(p.pos[0], p.pos[2], yaw, lx, lz); OE.world.box(q.x, y + ly + h / 2, q.z, w / 2, h / 2, d / 2, yaw + (ly2 || 0), 'prop'); }
          else if (c.cyl) { const [lx, lz, r, y0, y1] = c.cyl, q = rotL(p.pos[0], p.pos[2], yaw, lx, lz); OE.world.cyl(q.x, q.z, r, y + y0, y + y1, 'prop'); }
        });
        const H = OE.Hiding;
        (p.hides || []).forEach(h => {
          const q = rotL(p.pos[0], p.pos[2], yaw, h.x, h.z), hy = yaw + h.yaw; let s;
          if (h.cat === 'improvisado') s = H.inside(h.kind, q.x, q.z, hy, y, { depth: h.depth || 0.6, camY: h.camY || 0.8, exposure: 0.25, overlay: 'low' });
          else if (h.low) s = H.under(h.kind, q.x, q.z, hy, y, h.clear || 0.9, { depth: 0.4, cat: h.cat });
          else s = H.behind(h.kind, q.x, q.z, hy, y, { side: 0, crouch: true });
          if (h.name) s.name = h.name;
        });
        n++;
      } catch (e) { console.warn('brinquedo falhou', p.file, e); }
    }
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

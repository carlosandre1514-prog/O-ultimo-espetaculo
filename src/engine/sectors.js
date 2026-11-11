'use strict';
/* Gerenciador de setores.
   - Cada setor tem: casca (estrutura externa, sempre carregada), interior (paredes internas e móveis,
     só aparece quando o jogador está dentro ou perto das aberturas — oclusão por ambiente),
     detalhe preguiçoso (miudezas criadas ao chegar perto e DESCARREGADAS ao se afastar, com seus colisores)
     e objetos dinâmicos (portas, gavetas, esconderijos).
   - Subsolo x superfície: quem está no subsolo não desenha a superfície (e vice-versa), exceto
     perto das escadas.
   - LOD por distância nos pedaços mesclados (detail/clutter) + frustum culling do Three. */
(function (OE) {
  const S = { list: [], byName: {} };
  OE.Sectors = S;
  OE.addDyn = o => { (OE.currentDyn || OE.scene).add(o); };
  S.define = function (def) { def.bounds = def.bounds; S.list.push(def); S.byName[def.name] = def; return def; };

  S.buildAll = async function (scene, world, progress) {
    let i = 0;
    for (const def of S.list) {
      def.group = new THREE.Group(); def.group.name = def.name; scene.add(def.group);
      def.dyn = new THREE.Group(); def.dyn.name = def.name + '-dyn'; scene.add(def.dyn);
      OE.currentDyn = def.dyn; OE._floorY = def.floorY || 0; OE.PY = def.floorY || 0;
      const b = new OE.Builder(def.name, world); def.builder = b;
      const t0 = performance.now();
      def.build(b, def);
      def.meshes = b.finalize(def.group);
      if (def.after) { OE.currentDyn = def.dyn; def.after(def); }
      def.ms = performance.now() - t0;
      OE.currentDyn = null; OE._floorY = 0; OE.PY = 0;
      def.detailLoaded = false;
      if (progress) await progress(++i / S.list.length, def.label || def.name);
    }
  };
  function distToBounds(def, x, z) {
    const b = def.bounds, dx = Math.max(b[0] - x, 0, x - b[2]), dz = Math.max(b[1] - z, 0, z - b[3]); return Math.hypot(dx, dz);
  }
  S.distTo = distToBounds;
  S.sectorAt = function (p) {
    let best = null;
    for (const d of S.list) if (distToBounds(d, p.x, p.z) === 0 && (!best || (d.priority || 0) > (best.priority || 0)) && (!d.underground === !(p.y < -1.5))) best = d;
    return best;
  };
  const LOAD = 48, UNLOAD = 72;
  // Oclusão por ambiente (PVS): estando DENTRO de um ambiente fechado, só os setores que dá para
  // enxergar pelas aberturas são desenhados. Chave = zona do EnvironmentLighting.
  S.PVS = {
    tenda: ['Terreno', 'Tenda', 'Entrada', 'Bastidores', 'Animais', 'Parque', 'Finalizar'],
    bastidores: ['Terreno', 'Bastidores', 'Tenda', 'Alojamentos', 'Finalizar'],
    alojamentos: ['Terreno', 'Alojamentos', 'Bastidores', 'Parque', 'Finalizar'],
    deposito: ['Terreno', 'Deposito', 'Bastidores', 'Animais', 'Finalizar'],
    estabulo: ['Terreno', 'Animais', 'Finalizar']
  };
  S.update = function (cam, forceAll) {
    const cx = cam.position.x, cz = cam.position.z, under = cam.position.y < -1.2;
    const zone = OE.Lights.zoneAt ? OE.Lights.zoneAt(cam.position) : null, pvs = !forceAll && zone && S.PVS[zone.name];
    for (const def of S.list) {
      const d = distToBounds(def, cx, cz);
      // oclusão subsolo/superfície
      let vis = true;
      if (!forceAll) {
        // escadas do subsolo: perto delas, os dois lados se enxergam (só o setor da escada)
        const st = (OE.STAIRS || []).find(s => Math.hypot(s[0] - cx, s[1] - cz) < 4.5);
        if (def.underground) vis = under || !!st;
        else vis = !under || !!(st && (st[2] === def.name || def.name === 'Terreno'));
      }
      if (pvs && pvs.indexOf(def.name) < 0) vis = false;
      def.group.visible = vis; def.dyn.visible = vis && (forceAll || !def.interiorRange || d < def.interiorRange);
      if (!vis) continue;
      // objetos dinâmicos (portas, gavetas, tampas) só perto da câmera
      if (def.dyn.visible && !forceAll) for (const o of def.dyn.children) { const p = o.position; o.visible = (p.x - cx) ** 2 + (p.z - cz) ** 2 < 32 * 32 || o.userData.far; }
      // detalhe preguiçoso
      if (def.detail) {
        if (!def.detailLoaded && (d < LOAD || forceAll)) S.loadDetail(def);
        else if (def.detailLoaded && d > UNLOAD && !forceAll) S.unloadDetail(def);
      }
      const interiorOn = forceAll || !def.interiorRange || d < def.interiorRange;
      const list = def.detailMeshes ? def.meshes.concat(def.detailMeshes) : def.meshes;
      for (const m of list) {
        if (m.userData.layer === 'interior' && !interiorOn) { m.visible = false; continue; }
        if (m.userData.lodDist < 1e8 && !forceAll) {
          const c = m.userData.center, dd = Math.hypot(c.x - cx, c.y - cam.position.y, c.z - cz) - m.userData.radius;
          m.visible = dd < m.userData.lodDist;
        } else m.visible = true;
      }
    }
  };
  S.loadDetail = function (def) {
    OE.currentDyn = def.dyn; OE._floorY = def.floorY || 0; OE.PY = def.floorY || 0;
    const b = new OE.Builder(def.name + '-det', OE.world, OE.rng(def.name.length * 31 + 7));
    def.detail(b, def); def.detailGroup = new THREE.Group(); def.detailMeshes = b.finalize(def.detailGroup); def.group.add(def.detailGroup);
    def.detailColliders = b.colliders; def.detailLoaded = true; OE.currentDyn = null; OE._floorY = 0; OE.PY = 0;
    OE.log('carregou detalhe', def.name, def.detailMeshes.length);
  };
  S.unloadDetail = function (def) {
    def.detailColliders.forEach(c => OE.world.remove(c));
    def.detailMeshes.forEach(m => { m.geometry.dispose(); }); def.group.remove(def.detailGroup);
    def.detailMeshes = null; def.detailGroup = null; def.detailColliders = null; def.detailLoaded = false;
    OE.log('descarregou detalhe', def.name);
  };
})(window.OE);

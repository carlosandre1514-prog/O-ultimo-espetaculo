'use strict';
/* EnvironmentLighting.
   - Centenas de "emissores" (lâmpadas, luzes de emergência, refletores) mas só POOL luzes reais:
     a cada 0,2 s as mais relevantes perto do jogador recebem as PointLights do pool.
     O número de luzes nunca muda -> os shaders não recompilam (sem engasgos no celular).
   - Lâmpadas visíveis: um único InstancedMesh com cor por instância (piscar = mudar a cor).
   - Zonas: exterior noturno, interiores, tenda, subsolo — cada uma com neblina e luz ambiente.
   - Lanterna (SpotLight na câmera) e partículas de poeira nos ambientes fechados. */
(function (OE) {
  const POOL = OE.Q.lights;          // luzes reais simultâneas: definido pelo nível de gráfico
  const L = { emitters: [], pool: [], groups: {}, zones: [], zone: null, t: 0 };
  OE.Lights = L;
  const col = new THREE.Color();

  L.init = function (scene, camera) {
    L.scene = scene;
    L.hemi = new THREE.HemisphereLight(0x3a4a66, 0x0c0a08, 0.5); scene.add(L.hemi);
    L.moon = new THREE.DirectionalLight(0x9aaccc, 0.32); L.moon.position.set(-60, 90, 40); scene.add(L.moon); scene.add(L.moon.target);
    for (let i = 0; i < POOL; i++) { const p = new THREE.PointLight(0xffc890, 0, 12, 2); p.userData.em = null; p.userData.fade = 0; scene.add(p); L.pool.push(p); }
    L.flash = new THREE.SpotLight(0xfff1d8, 0, 26, 0.5, 0.55, 1.3); L.flash.position.set(0.18, -0.2, 0); L.flash.target.position.set(0, -0.15, -4);
    camera.add(L.flash); camera.add(L.flash.target);
    scene.fog = new THREE.FogExp2(0x0a0d14, 0.028); scene.background = new THREE.Color(0x05070c);
    L.fogTarget = { c: new THREE.Color(0x0a0d14), d: 0.028, h: 0.5, m: 0.32 };
    // poeira
    const N = 260, pos = new Float32Array(N * 3); for (let i = 0; i < N * 3; i++) pos[i] = (Math.random() - 0.5) * 16;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    L.dust = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.035, map: OE.SPRITE.dust, transparent: true, depthWrite: false, opacity: 0.55, color: 0xd8c8a8 }));
    L.dust.frustumCulled = false; scene.add(L.dust);
  };
  // Emissor: {x,y,z,color,intensity,range,mode:'steady'|'flicker'|'dying'|'pulse'|'strobe'|'off', group, needsPower, bulb:true, size}
  L.add = function (e) {
    e = Object.assign({ color: 0xffc890, intensity: 1.2, range: 9, mode: 'steady', bulb: true, size: 0.06, on: true, seed: Math.random() * 100 }, e);
    e.cur = 0; L.emitters.push(e);
    if (e.group) (L.groups[e.group] = L.groups[e.group] || []).push(e);
    return e;
  };
  L.setGroup = function (g, on) { (L.groups[g] || []).forEach(e => { e.on = on; }); };
  // Constrói o InstancedMesh das lâmpadas (chamar depois que o mapa registrou os emissores)
  L.finalize = function () {
    const list = L.emitters.filter(e => e.bulb);
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), list.length);
    const M = new THREE.Matrix4();
    list.forEach((e, i) => { M.makeScale(e.size, e.size * (e.stretch || 1), e.size); M.setPosition(e.x, e.y, e.z); m.setMatrixAt(i, M); e.idx = i; m.setColorAt(i, col.set(0x111111)); });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; L.bulbs = m; L.scene.add(m);
    // halos: TODOS num único THREE.Points com shader próprio (1 draw call, tamanho e cor por ponto)
    const hl = L.emitters.filter(e => e.halo); L.haloList = hl;
    if (hl.length) {
      const g = new THREE.BufferGeometry(), pos = new Float32Array(hl.length * 3), size = new Float32Array(hl.length), colr = new Float32Array(hl.length * 3);
      hl.forEach((e, i) => { pos.set([e.x, e.y, e.z], i * 3); size[i] = e.halo; col.set(e.color); colr.set([col.r, col.g, col.b], i * 3); e.haloIdx = i; });
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('size', new THREE.BufferAttribute(size, 1)); g.setAttribute('hcolor', new THREE.BufferAttribute(colr, 3));
      g.setAttribute('level', new THREE.BufferAttribute(new Float32Array(hl.length), 1));
      const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { map: { value: OE.SPRITE.glow }, scale: { value: innerHeight } },
        vertexShader: 'attribute float size; attribute vec3 hcolor; attribute float level; varying vec3 vC; varying float vL; uniform float scale;\n' +
          'void main(){ vC = hcolor; vL = level; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = size * scale * 0.6 / -mv.z; }',
        fragmentShader: 'uniform sampler2D map; varying vec3 vC; varying float vL;\nvoid main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC * t.a * vL * 0.55, 1.0); }' });
      L.haloPts = new THREE.Points(g, mat); L.haloPts.frustumCulled = false; L.scene.add(L.haloPts);
      addEventListener('resize', () => { mat.uniforms.scale.value = innerHeight; });
    }
  };
  // Zonas de atmosfera: {name, box:[x0,y0,z0,x1,y1,z1], fog, density, hemi, moon, dust, priority}
  L.zone = null;
  L.addZone = z => { L.zones.push(Object.assign({ priority: 1 }, z)); };
  L.zoneAt = function (p) {
    let best = null;
    for (const z of L.zones) { const b = z.box; if (p.x >= b[0] && p.x <= b[3] && p.y >= b[1] && p.y <= b[4] && p.z >= b[2] && p.z <= b[5] && (!best || z.priority > best.priority)) best = z; }
    return best || L.outside;
  };
  L.outside = { name: 'exterior', fog: 0x0a0d14, density: 0.026, hemi: 0.5, moon: 0.32, dust: false };

  function level(e, t) {
    if (!e.on || (e.needsPower && !OE.state.power) || e.mode === 'off') return 0;
    const s = e.seed;
    switch (e.mode) {
      case 'flicker': { const n = Math.sin(t * 23 + s) * Math.sin(t * 7.3 + s * 2) + Math.sin(t * 1.7 + s); return n > 0.6 ? 0.15 : n < -1.3 ? 0 : 0.85 + 0.15 * Math.sin(t * 40 + s); }
      case 'dying': { const ph = (t * 0.6 + s) % 7; return ph < 0.25 ? (Math.sin(t * 60) > 0 ? 1 : 0.1) : ph < 5 ? 0.06 : ph < 5.4 ? 0.9 : 0; }
      case 'pulse': return 0.55 + 0.45 * Math.sin(t * 2.2 + s);
      case 'strobe': return (t * 1.3 + s) % 1 < 0.08 ? 1 : 0;
      case 'cycle': { const ph = (t + s) % (e.period || 40); return ph < (e.onFor || 18) ? (ph < 0.6 ? (Math.sin(ph * 50) > 0 ? 1 : 0) : 1) : 0; }
      default: return 1;
    }
  }
  const tmpCam = new THREE.Vector3();
  L.update = function (dt, cam, playerPos) {
    const t = (L.t += dt);
    // nível de cada emissor perto (longe não precisa piscar)
    for (const e of L.emitters) {
      const dx = e.x - cam.position.x, dz = e.z - cam.position.z; e.d2 = dx * dx + dz * dz + (e.y - cam.position.y) ** 2;
      if (e.d2 > 4900 && e.mode !== 'steady') continue;
      e.cur = level(e, t);
      if (L.bulbs && e.idx !== undefined) {
        const k = e.cur; col.set(e.color).multiplyScalar(k > 0.02 ? 0.35 + k * 0.9 : 0.06);
        L.bulbs.setColorAt(e.idx, col);
        if (e.haloIdx !== undefined) L.haloPts.geometry.attributes.level.array[e.haloIdx] = k;
      }
    }
    if (L.bulbs && L.bulbs.instanceColor) L.bulbs.instanceColor.needsUpdate = true;
    if (L.haloPts) L.haloPts.geometry.attributes.level.needsUpdate = true;
    // reparte o pool a cada 0,2 s
    L.acc = (L.acc || 0) + dt;
    if (L.acc > 0.2) {
      L.acc = 0;
      const fwd = tmpCam.set(0, 0, -1).applyQuaternion(cam.quaternion);
      const cands = [];
      for (const e of L.emitters) {
        if (e.noLight || e.d2 > 50 * 50) continue; const lv = level(e, t + 0.3) + level(e, t); if (lv <= 0.01 && e.mode === 'steady') continue;
        if (!e.on || (e.needsPower && !OE.state.power) || e.mode === 'off') continue;
        // mesmo andar (subsolo x superfície)
        if ((e.y < -1) !== (cam.position.y < -1.2) && e.d2 > 64) continue;
        const d = Math.sqrt(e.d2), dir = ((e.x - cam.position.x) * fwd.x + (e.z - cam.position.z) * fwd.z) / (d || 1);
        e.score = e.intensity * e.range / (d + 3) * (dir > -0.2 || d < e.range ? 1 : 0.35);
        cands.push(e);
      }
      cands.sort((a, b) => b.score - a.score);
      const chosen = cands.slice(0, POOL);
      // mantém luzes já atribuídas para não "pular"
      const free = L.pool.filter(p => !p.userData.em || chosen.indexOf(p.userData.em) < 0);
      free.forEach(p => { p.userData.em = null; });
      chosen.forEach(e => { if (L.pool.some(p => p.userData.em === e)) return; const p = free.find(q => !q.userData.em); if (!p) return; p.userData.em = e; p.userData.fade = 0;
        p.position.set(e.x, e.y - (e.size || 0.06) * 2, e.z); p.color.set(e.color); p.distance = e.range; });
    }
    for (const p of L.pool) {
      const e = p.userData.em; if (!e) { p.intensity = Math.max(0, p.intensity - dt * 3); continue; }
      p.userData.fade = Math.min(1, p.userData.fade + dt * 2.5); p.intensity = e.intensity * e.cur * p.userData.fade;
    }
    // zona e neblina (transição suave)
    const z = L.zoneAt(playerPos); if (z !== L.zone) { L.zone = z; OE.emit('zone', z); }
    const k = Math.min(1, dt * 1.6), F = L.scene.fog;
    F.color.lerp(col.set(z.fog), k); F.density += (z.density * OE.Q.fog - F.density) * k; L.scene.background.copy(F.color);
    L.hemi.intensity += (z.hemi - L.hemi.intensity) * k; L.moon.intensity += (z.moon - L.moon.intensity) * k;
    // poeira gira em torno da câmera
    L.dust.visible = !!z.dust && OE.Q.dust;
    if (L.dust.visible) { const a = L.dust.geometry.attributes.position, c = cam.position;
      for (let i = 0; i < a.count; i++) { let x = a.getX(i), y = a.getY(i) - dt * 0.03, zz = a.getZ(i);
        x += Math.sin(t * 0.3 + i) * 0.002;
        if (x - c.x > 8) x -= 16; else if (x - c.x < -8) x += 16; if (zz - c.z > 8) zz -= 16; else if (zz - c.z < -8) zz += 16;
        if (y - c.y < -3) y += 6; else if (y - c.y > 3) y -= 6; a.setXYZ(i, x, y, zz); }
      a.needsUpdate = true; }
  };
  L.setFlash = function (on) { L.flash.intensity = on ? 2.6 : 0; };
})(window.OE);

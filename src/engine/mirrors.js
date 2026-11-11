'use strict';
/* Espelhos com reflexo real + corpo do jogador.
   - Um único refletor (render-to-texture com câmera espelhada e plano de corte oblíquo, como o
     THREE.Reflector) é levado até o espelho mais próximo que está à frente e perto (até 7 m):
     só um espelho ativo por vez => custo de uma renderização extra pequena, e nenhum se nada estiver perto.
   - O corpo do jogador (personagem escolhido) fica na camada 1: a câmera em 1ª pessoa não o vê,
     a câmera do espelho vê. Anda/corre/agacha conforme o jogador. */
(function (OE) {
  const MR = { list: [] };
  OE.Mirrors = MR;
  MR.add = m => { MR.list.push(m); return m; };   // {x,y,z (centro da face), w, h, yaw (normal = +z local)}

  const RES = () => (OE.Q.name === 'suave' ? 256 : OE.Q.name === 'padrao' ? 384 : 512);
  MR.init = function (scene, renderer) {
    const res = RES(), rt = new THREE.WebGLRenderTarget(res, res, { generateMipmaps: false }); rt.texture.encoding = THREE.sRGBEncoding;
    const tm = new THREE.Matrix4(), cam = new THREE.PerspectiveCamera(); cam.layers.enable(1);
    const mat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: rt.texture }, textureMatrix: { value: tm }, tint: { value: new THREE.Color(0x9aa0a0) } },
      vertexShader: 'uniform mat4 textureMatrix; varying vec4 vUv; varying vec2 vU; void main(){ vUv = textureMatrix * vec4(position,1.0); vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform sampler2D tDiffuse; uniform vec3 tint; varying vec4 vUv; varying vec2 vU;\n' +
        'float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }\n' +
        'void main(){ vec4 c = texture2DProj(tDiffuse, vUv); float e = smoothstep(0.0, 0.12, min(min(vU.x, 1.0-vU.x), min(vU.y, 1.0-vU.y)));\n' +
        ' float spot = smoothstep(0.55, 0.9, h(floor(vU * 38.0))) * 0.35; vec3 col = c.rgb * tint * (0.55 + 0.45 * e) * (1.0 - spot);\n' +
        ' gl_FragColor = vec4(col, 1.0); }'
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); mesh.visible = false; mesh.renderOrder = 1; scene.add(mesh);
    MR.mesh = mesh; MR.rt = rt; MR.cam = cam; MR.tm = tm; MR.renderer = renderer; MR.scene = scene;
    const C = new THREE.Vector3(), N = new THREE.Vector3(), P = new THREE.Vector3(), V = new THREE.Vector3(), T = new THREE.Vector3(), lookAt = new THREE.Vector3(), rot = new THREE.Matrix4(),
      plane = new THREE.Plane(), clip = new THREE.Vector4(), q = new THREE.Vector4();
    mesh.onBeforeRender = (r, sc, camera) => {
      if (MR.rendering) return;
      P.setFromMatrixPosition(mesh.matrixWorld); C.setFromMatrixPosition(camera.matrixWorld); rot.extractRotation(mesh.matrixWorld);
      N.set(0, 0, 1).applyMatrix4(rot); V.subVectors(P, C); if (V.dot(N) > 0) return;
      V.reflect(N).negate(); V.add(P); rot.extractRotation(camera.matrixWorld);
      lookAt.set(0, 0, -1).applyMatrix4(rot).add(C);
      T.subVectors(P, lookAt); T.reflect(N).negate(); T.add(P);
      cam.position.copy(V); cam.up.set(0, 1, 0).applyMatrix4(rot).reflect(N); cam.lookAt(T);
      cam.far = 30; cam.near = camera.near; cam.fov = camera.fov; cam.aspect = camera.aspect; cam.updateMatrixWorld(); cam.projectionMatrix.copy(camera.projectionMatrix);
      tm.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1); tm.multiply(cam.projectionMatrix); tm.multiply(cam.matrixWorldInverse); tm.multiply(mesh.matrixWorld);
      plane.setFromNormalAndCoplanarPoint(N, P); plane.applyMatrix4(cam.matrixWorldInverse);
      clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant); const pm = cam.projectionMatrix;
      q.x = (Math.sign(clip.x) + pm.elements[8]) / pm.elements[0]; q.y = (Math.sign(clip.y) + pm.elements[9]) / pm.elements[5]; q.z = -1.0; q.w = (1.0 + pm.elements[10]) / pm.elements[14];
      clip.multiplyScalar(2.0 / clip.dot(q)); pm.elements[2] = clip.x; pm.elements[6] = clip.y; pm.elements[10] = clip.z + 1.0; pm.elements[14] = clip.w;
      MR.rendering = true; mesh.visible = false; const oldRT = r.getRenderTarget();
      const beam = OE.Lights.beam, bv = beam && beam.visible; if (beam) beam.visible = false;
      r.setRenderTarget(rt); r.state.buffers.depth.setMask(true); if (r.autoClear === false) r.clear(); r.render(sc, cam);
      r.setRenderTarget(oldRT); mesh.visible = true; MR.rendering = false; if (beam) beam.visible = bv;
    };
  };
  // Pré-compila (na tela de carregamento) os materiais para a passada do reflexo: sem isto o
  // primeiro espelho visto travaria o jogo enquanto os shaders compilam.
  MR.precompile = function (camera) {
    const r = MR.renderer, old = r.getRenderTarget(); OE.Sectors.update(camera, true);
    MR.cam.position.copy(camera.position); MR.cam.quaternion.copy(camera.quaternion); MR.cam.projectionMatrix.copy(camera.projectionMatrix); MR.cam.updateMatrixWorld();
    r.setRenderTarget(MR.rt); r.render(MR.scene, MR.cam); r.setRenderTarget(old); OE.Sectors.update(camera);
  };
  // escolhe o espelho ativo (perto, à frente, de frente para a câmera)
  MR.update = function (camera) {
    if (!MR.mesh) return; let best = null, bs = 1e9; const c = camera.position, fx = -Math.sin(OE.game.player.yaw), fz = -Math.cos(OE.game.player.yaw);
    for (const m of MR.list) {
      const dx = m.x - c.x, dz = m.z - c.z, d = Math.hypot(dx, dz); if (d > 7 || Math.abs(m.y - c.y) > 2.5) continue;
      const nx = Math.sin(m.yaw), nz = Math.cos(m.yaw); if (-(dx * nx + dz * nz) < 0.05) continue;                // atrás do espelho
      const ahead = (dx * fx + dz * fz) / (d || 1); if (ahead < -0.1 && d > 1.5) continue;
      const sc = d - ahead * 2; if (sc < bs) { bs = sc; best = m; }
    }
    MR.active = best; MR.mesh.visible = !!best && !OE.game.mapView;
    if (best) { MR.mesh.position.set(best.x + Math.sin(best.yaw) * 0.012, best.y, best.z + Math.cos(best.yaw) * 0.012); MR.mesh.rotation.set(0, best.yaw, 0); MR.mesh.scale.set(best.w, best.h, 1); MR.mesh.updateMatrixWorld(); }
  };

  /* ---------- corpo do jogador ---------- */
  const AV = { obj: null };
  OE.Avatar = AV;
  AV.set = function (obj, mixer, actions) {
    if (AV.obj) OE.scene.remove(AV.obj);
    AV.obj = obj; AV.mixer = mixer; AV.actions = actions || {}; obj.traverse(o => { o.layers.set(1); if (o.isSkinnedMesh) o.frustumCulled = false; });
    OE.scene.add(obj);
    const a = AV.actions; ['idle', 'walk', 'run', 'crouch'].forEach(k => { if (a[k]) { a[k].play(); a[k].setEffectiveWeight(k === 'idle' ? 1 : 0); } });
  };
  // ação de uma vez (pular, pegar, abrir porta)
  AV.once = function (k) { const a = AV.actions && AV.actions[k]; if (!a) return; AV.busy = a; a.reset(); a.setEffectiveWeight(1); a.play(); };
  AV.update = function (dt, P) {
    if (!AV.obj) return; const o = AV.obj, show = !P.hidden && !P.spectator;
    o.visible = show; if (!show) return;
    o.position.set(P.pos.x, P.pos.y, P.pos.z); o.rotation.y = P.yaw + Math.PI;
    if (AV.mixer) {
      const a = AV.actions, mv = P.moving || 0, k = Math.min(1, dt * 8);
      const want = { idle: mv < 0.2 && !P.crouch ? 1 : 0, walk: mv >= 0.2 && mv < 3.4 && !P.crouch ? 1 : 0, run: mv >= 3.4 ? 1 : 0, crouch: P.crouch ? 1 : 0 };
      if (!a.crouch && P.crouch) want.walk = 1;
      const busy = AV.busy && AV.busy.isRunning(); if (AV.busy && !busy) { AV.busy.setEffectiveWeight(Math.max(0, AV.busy.getEffectiveWeight() - dt * 5)); }
      if (busy) for (const n in want) want[n] = 0;
      if (P.flashOn && a.torch && !busy && mv >= 0.2 && mv < 3.4 && !P.crouch) { want.walk = 0; want.torch = 1; } else want.torch = 0;
      for (const n in want) if (a[n]) { if (!a[n].isRunning()) a[n].play(); a[n].setEffectiveWeight(a[n].getEffectiveWeight() + (want[n] - a[n].getEffectiveWeight()) * k); }
      if (a.walk) a.walk.timeScale = Math.max(0.6, mv / 2.2); if (a.crouch) a.crouch.timeScale = P.moving ? 1 : 0.0001;
      AV.mixer.update(dt);
    }
  };
})(window.OE);

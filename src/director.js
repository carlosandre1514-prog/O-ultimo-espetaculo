'use strict';
/* Diretor de terror — o circo "continua funcionando" sozinho.
   O inimigo NÃO aparece o tempo todo: o diretor alterna silêncio e eventos, sempre perto do jogador
   e nunca durante uma perseguição:
     risadas distantes · crianças brincando · passos atrás de você · silhuetas que somem quando olhadas
     · alguém observando pela janela · portas que se abrem devagar · luzes piscando em rajada
     · brinquedos que ligam sozinhos (carrossel/roda-gigante) · manequins que mudam de lugar
   E o aviso da história: quando a caixinha de música começa a tocar, o Mestre está perto. */
(function (OE) {
  const D = { t: 18, mannequins: [], silhouette: null };
  OE.Director = D;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // silhueta escura (recorte do Mestre: chapéu, ombros, braços longos)
  function silhouetteMesh() {
    const sh = new THREE.Shape(); const P = [[-0.22, 0], [-0.18, 0.9], [-0.32, 1.45], [-0.5, 0.75], [-0.42, 0.72], [-0.28, 1.25], [-0.2, 1.6], [-0.1, 1.68], [-0.13, 1.92], [-0.22, 1.94], [-0.22, 1.98], [0.22, 1.98], [0.22, 1.94], [0.13, 1.92], [0.1, 1.68], [0.2, 1.6], [0.28, 1.25], [0.42, 0.72], [0.5, 0.75], [0.32, 1.45], [0.18, 0.9], [0.22, 0]];
    P.forEach((p, i) => (i ? sh.lineTo(p[0], p[1] + (p[1] > 1.9 ? 0.25 : 0)) : sh.moveTo(p[0], p[1])));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: 0x020202, side: THREE.DoubleSide, fog: true }));
    m.scale.setScalar(1.08); return m;
  }
  D.init = function (scene) {
    D.silhouette = silhouetteMesh(); D.silhouette.visible = false; scene.add(D.silhouette);
    // olhos que brilham na silhueta
    const eyes = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.025), new THREE.MeshBasicMaterial({ color: 0xffe8c0 })); eyes.position.set(0, 1.83, 0.01); D.silhouette.add(eyes);
  };
  // manequins "vivos": registrados pelo mapa (separados da geometria estática)
  D.addMannequin = function (x, y, z, yaw, tint, ruff) {
    const py = OE.PY; OE.PY = 0; const g = OE.partMesh(b => { OE.Props.mannequin(b, 0, 0, 0, { ruff, tint }); }); OE.PY = py;
    OE.world.cyl(x, z, 0.75, y, y + 1.8, 'prop');
    g.position.set(x, y, z); g.rotation.y = yaw; OE.addDyn(g); g.updateMatrixWorld(true);
    D.mannequins.push({ g, x, y, z, yaw, home: { x, z, yaw } });
  };
  const frustum = new THREE.Frustum(), M4 = new THREE.Matrix4();
  const seen = (cam, p) => { M4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frustum.setFromProjectionMatrix(M4); return frustum.containsPoint(p); };

  D.update = function (dt, G) {
    const P = G.player, E = G.enemy, cam = G.camera; if (!G.running || G.dying || P.spectator) return;
    // aviso musical: a caixinha distorcida toca quando ele está perto (mais alto quanto mais perto)
    const d = E ? E.pos.distanceTo(P.pos) : 99;
    OE.Audio.musicBoxNear && OE.Audio.musicBoxNear(d < 24 && !E.enemyOff ? OE.clamp(1 - d / 24, 0, 1) : 0, E.pos);
    // silhueta: some quando olhada por um tempo ou depois de alguns segundos
    const S = D.silhouette;
    if (S.visible) { S.userData.t -= dt; const p = S.position.clone().setY(S.position.y + 1.2);
      if (seen(cam, p)) S.userData.look += dt; if (S.userData.look > 0.45 || S.userData.t <= 0) { S.visible = false; if (S.userData.look > 0.45) OE.Audio.play('whoosh', p, 0.7); } }
    // manequins mudam de posição quando ninguém está olhando
    for (const m of D.mannequins) {
      const p = new THREE.Vector3(m.g.position.x, m.y + 1.2, m.g.position.z), dist = p.distanceTo(cam.position);
      if (dist < 16 && !seen(cam, p) && Math.random() < dt * 0.04) {
        const a = Math.atan2(cam.position.x - m.g.position.x, cam.position.z - m.g.position.z);   // passa a encarar o jogador
        m.g.rotation.y = a; m.g.position.x = m.home.x + rnd(-0.5, 0.5); m.g.position.z = m.home.z + rnd(-0.5, 0.5); m.g.updateMatrixWorld(true);
        if (dist < 8) OE.Audio.play('creak', p, 0.25);
      }
    }
    // próximo evento
    if (E && (E.state === 'chase' || E.state === 'searchSpot')) { D.t = Math.max(D.t, 12); return; }
    D.t -= dt; if (D.t > 0) return;
    D.t = rnd(22, 48) * (OE.Story && OE.Story.ch >= 3 ? 0.6 : 1);
    D.fire(G);
  };
  D.fire = function (G) {
    const P = G.player, cam = G.camera, zone = OE.Lights.zone ? OE.Lights.zone.name : 'exterior', A = OE.Audio;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).setY(0).normalize();
    const behind = P.pos.clone().addScaledVector(fwd, -3);
    const ev = [];
    ev.push(['risada', 3, () => { const a = Math.random() * 6.28; A.play('laugh', { x: P.pos.x + Math.cos(a) * rnd(18, 30), y: 3, z: P.pos.z + Math.sin(a) * rnd(18, 30) }, 0.6); }]);
    ev.push(['passos', 3, () => { for (let i = 0; i < 4; i++) setTimeout(() => A.play('enemyStep', { x: behind.x + fwd.x * -i * 0.6, y: P.pos.y, z: behind.z + fwd.z * -i * 0.6 }, 0.45), i * 520); }]);
    ev.push(['luzes', 2, () => { OE.Lights.emitters.filter(e => Math.hypot(e.x - P.pos.x, e.z - P.pos.z) < 18).forEach(e => { const m = e.mode, on = e.on; e.mode = 'strobe'; e.on = true; setTimeout(() => { e.mode = m; e.on = on; }, 2200); }); A.play('switch', null, 0.4); }]);
    if (zone === 'exterior' || zone === 'alojamentos') ev.push(['criancas', 2, () => { const a = Math.random() * 6.28; A.play('giggle', { x: P.pos.x + Math.cos(a) * 14, y: 1, z: P.pos.z + Math.sin(a) * 14 }, 0.7); }]);
    // porta que se abre devagar sozinha
    const door = OE.doors.find(d => !d.open && !d.lock && d.toggle && d.kind !== 'cage' && d.name !== 'portão' && Math.hypot(d.x - P.pos.x, d.z - P.pos.z) < 12 && Math.hypot(d.x - P.pos.x, d.z - P.pos.z) > 3);
    if (door) ev.push(['porta', 2, () => { door.toggle({ x: door.x + Math.sin(door.yaw) * 2, z: door.z + Math.cos(door.yaw) * 2 }, 'ghost'); door.target = door.maxAng * 0.45; A.play('creak', door.pos, 0.8); }]);
    // silhueta à frente, longe, ou observando por uma janela de fora
    ev.push(['silhueta', 3, () => {
      for (let k = 0; k < 12; k++) {
        const ang = Math.atan2(fwd.x, fwd.z) + rnd(-0.5, 0.5), dist = rnd(14, 24), x = P.pos.x + Math.sin(ang) * dist, z = P.pos.z + Math.cos(ang) * dist;
        const g = OE.world.ground(x, z, P.pos.y + 0.5, 0.3); if (Math.abs(g - P.pos.y) > 1.5) continue;
        if (OE.world.overlaps(x, z, 0.35, g + 0.3, g + 1.8)) continue;
        if (OE.world.blocked({ x: cam.position.x, y: cam.position.y, z: cam.position.z }, { x, y: g + 1.5, z }, c => c.see)) continue;
        const S = D.silhouette; S.position.set(x, g, z); S.rotation.y = Math.atan2(P.pos.x - x, P.pos.z - z); S.visible = true; S.userData = { t: 6, look: 0 }; return;
      }
    }]);
    // brinquedo liga sozinho (no parque)
    if (P.pos.x < -40 && P.pos.y > -1) ev.push(['brinquedo', 4, () => {
      const g = Math.random() < 0.5 ? 'roda' : 'carrossel', em = OE.Lights.groups[g] || [];
      em.forEach(e => { e.on = true; e.prevPower = e.needsPower; e.needsPower = false; e.mode = 'flicker'; });
      const c = g === 'roda' ? { x: -96, y: 8, z: 34 } : { x: -62, y: 2, z: 8 }; A.play('musicbox', c, 1); OE.UI.msg(g === 'roda' ? 'As luzes da roda-gigante acenderam sozinhas.' : 'O carrossel começou a tocar sozinho.', 3);
      OE.emit('noise', { pos: new THREE.Vector3(c.x, 0, c.z), radius: 40, source: 'ride' });
      setTimeout(() => em.forEach(e => { e.needsPower = e.prevPower; e.on = false; }), 16000);
    }]);
    // sorteio ponderado
    const tot = ev.reduce((s, e) => s + e[1], 0); let r = Math.random() * tot;
    for (const e of ev) { r -= e[1]; if (r <= 0) { OE.log('evento', e[0]); e[2](); break; } }
  };
})(window.OE);

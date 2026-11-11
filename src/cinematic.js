'use strict';
/* Cinemática de abertura (no motor do jogo, com os 6 adolescentes do Meshy).
   A estrada à noite -> o grupo chega -> falas diante do portão aberto -> a caixinha toca e uma silhueta
   de cartola aparece na praça -> o protagonista (o personagem escolhido) entra primeiro -> o portão se
   fecha sozinho -> os amigos batem nas grades -> apagão e risada -> quando a luz volta, eles sumiram
   (como na noite de 1987) -> a câmera entra nos olhos do protagonista e o jogo começa. Pode pular. */
(function (OE) {
  const C = { active: false, actors: [] };
  OE.Cine = C;
  const $ = id => document.getElementById(id), V = (x, y, z) => new THREE.Vector3(x, y, z);
  const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
  const LINES = {
    lucas: 'Fiquem juntos. Ninguém se separa.', bia: 'Gente... tem música tocando lá dentro.', rafa: 'Então quem acendeu as luzes?',
    julia: 'Ninguém pisa aqui há quase quarenta anos.', davi: 'Eu não vou entrar aí. Sério.', manu: 'Só tem um jeito de descobrir.'
  };

  function actor(c, i) {
    const a = { id: c.info.id, nome: c.info.nome, obj: c.obj, mixer: c.mixer, act: c.actions, pos: V(-30 - i * 0.9, 0, 124), yaw: Math.PI / 2, path: [], speed: 1.45, mode: 'idle', visible: true };
    ['idle', 'walk', 'scared', 'torch'].forEach(k => { const x = a.act[k]; if (x) { x.play(); x.setEffectiveWeight(k === 'idle' ? 1 : 0); } });
    if (a.act.scared) { a.act.scared.setLoop(THREE.LoopRepeat, Infinity); a.act.scared.clampWhenFinished = false; }
    OE.scene.add(a.obj); return a;
  }
  function stepActor(a, dt) {
    let moving = false;
    if (a.path.length) {
      const t = a.path[0], dx = t.x - a.pos.x, dz = t.z - a.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.08) a.path.shift(); else { const s = Math.min(d, a.speed * dt); a.pos.x += dx / d * s; a.pos.z += dz / d * s; moving = true;
        let dy = Math.atan2(dx, dz) - a.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; a.yaw += dy * Math.min(1, dt * 6); }
    } else if (a.face !== undefined) { let dy = a.face - a.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; a.yaw += dy * Math.min(1, dt * 4); }
    const want = { idle: !moving && a.mode !== 'scared' ? 1 : 0, walk: moving && !a.torch ? 1 : 0, torch: moving && a.torch ? 1 : 0, scared: !moving && a.mode === 'scared' ? 1 : 0 };
    if (!a.act.torch) { want.walk = Math.max(want.walk, want.torch); } if (!a.act.scared) want.idle = Math.max(want.idle, want.scared);
    for (const k in want) { const x = a.act[k]; if (x) x.setEffectiveWeight(x.getEffectiveWeight() + (want[k] - x.getEffectiveWeight()) * Math.min(1, dt * 6)); }
    if (a.act.walk) a.act.walk.timeScale = a.speed / 1.45;
    a.mixer.update(dt); a.obj.position.copy(a.pos); a.obj.rotation.y = a.yaw; a.obj.visible = a.visible;
  }
  const say = (who, text) => { const s = $('cineSub'); s.innerHTML = who ? '<b>' + who + '</b>' + text : '<i>' + text + '</i>'; s.classList.add('on'); clearTimeout(C.subT); C.subT = setTimeout(() => s.classList.remove('on'), 2600); };
  const title = (t1, t2) => { const e = $('cineTitle'); e.innerHTML = '<b>' + t1 + '</b><span>' + t2 + '</span>'; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 4200); };

  C.play = async function (done) {
    const m = await OE.Models.loadManifest(); if (!m || !m.characters || m.characters.length < 2) return done(false);
    const G = OE.game, ov = $('cine'); ov.classList.add('on'); $('cineLoad').textContent = 'Preparando a cena…'; G.cine = C; C.active = true; C.t = 0; C.done = done;
    const pid = OE.charId(), order = [pid].concat(m.characters.map(c => c.id).filter(id => id !== pid));
    for (const id of order) { const c = await OE.Models.loadCharacter(id); if (c) C.actors.push(actor(c, C.actors.length)); }
    $('cineLoad').textContent = '';
    C.hero = C.actors[0]; C.hero.torch = true; C.friends = C.actors.slice(1);
    // formação na estrada, andando para leste
    C.actors.forEach((a, i) => { const row = Math.floor(i / 2), side = i % 2 ? 0.7 : -0.7; a.pos.set(-21 - row * 1.4, 0, 124 + side); a.path = [V(-3 - row * 1.4, 0, 124 + side), V(0 + side * 1.6, 0, 116 + row * 1.3)]; a.speed = 2.0; });
    C.hero.pos.set(-19.6, 0, 124); C.hero.path = [V(-1.6, 0, 124), V(0, 0, 115)]; C.hero.speed = 2.0;
    // lanterna real presa ao protagonista (mesma luz da câmera: nenhum shader novo)
    C.flash = OE.Lights.flash; C.flashTarget = OE.Lights.flash.target; C.hero.obj.add(C.flash); C.hero.obj.add(C.flashTarget);
    C.flash.position.set(0.25, 1.3, 0.35); C.flashTarget.position.set(0, 0.6, 6); C.flash.intensity = 2.2;
    OE.Lights.beam.visible = false; OE.Lights.torch.visible = false;
    OE.Audio.theme(0.2); C.events = {}; $('cineSkip').onclick = () => C.finish();
  };
  const once = (k, fn) => { if (!C.events[k]) { C.events[k] = 1; fn(); } };
  C.update = function (dt) {
    if (!C.active || !C.hero) return; const G = OE.game, cam = G.camera, t = (C.t += dt), H = C.hero;
    C.actors.forEach(a => stepActor(a, dt));
    const look = (p, l) => { cam.position.copy(p); cam.lookAt(l); };
    const lead = H.pos;
    if (t < 6) {                                   // 1 · plano aéreo
      once('t', () => title('GRAN CIRCO ESTRELA', 'Fechado desde 14 de março de 1987'));
      const k = ease(t / 6); look(V(OE.lerp(34, 6, k), OE.lerp(24, 9, k), OE.lerp(168, 140, k)), V(0, OE.lerp(10, 6, k), OE.lerp(40, 70, k)));
    } else if (t < 13) {                           // 2 · travelling lateral
      once('l1', () => say(H.nome, 'É aqui. A carta dizia que o portão estaria aberto.'));
      look(V(lead.x + 2.2, 1.5, 129.2), V(lead.x - 1.2, 1.25, 124));
    } else if (t < 16.5) {                         // grupo vira para o portão
      const k = ease((t - 13) / 3.5); look(V(OE.lerp(1, 4.5, k), OE.lerp(1.6, 2.4, k), OE.lerp(129, 121, k)), V(0, 1.4, 112));
    } else if (t < 26) {                           // 3 · closes: falas diante do portão
      C.actors.forEach(a => { if (!a.path.length) a.face = Math.PI; });   // olham para o portão (norte = -z → yaw π)
      const idx = Math.min(C.friends.length - 1, Math.floor((t - 16.5) / 1.6)), f = C.friends[idx];
      once('f' + idx, () => { say(f.nome, LINES[f.id] || '...'); f.face = Math.atan2(H.pos.x - f.pos.x, H.pos.z - f.pos.z); });
      const fp = f.pos, fwd = V(Math.sin(f.yaw), 0, Math.cos(f.yaw)); look(V(fp.x + fwd.x * 1.25 + 0.25, 1.55, fp.z + fwd.z * 1.25), V(fp.x, 1.5, fp.z));
    } else if (t < 31) {                           // 4 · sobre os ombros: caixinha e silhueta na praça
      once('mb', () => { OE.Audio.musicBoxAt({ x: 0, y: 2, z: 70 }); C.actors.forEach(a => { a.face = Math.PI; }); });
      once('sil', () => { const S = OE.Director.silhouette; S.position.set(3.2, 0, 88.5); S.rotation.y = 0.2; S.visible = true; S.userData = { t: 99, look: -99 }; });
      if (t > 29.2) once('sil2', () => { OE.Director.silhouette.visible = false; OE.Audio.play('whoosh', { x: 3, y: 1, z: 88 }, 0.8); const d = C.friends.find(a => a.id === 'davi') || C.friends[0]; say(d.nome, 'Vocês viram aquilo?!'); C.friends.forEach(a => { a.mode = 'scared'; }); });
      const k = ease((t - 26) / 5); look(V(1.6, 1.85, OE.lerp(119.5, 118.2, k)), V(1.2, 1.5, 88));
    } else if (!C.slamT || t - C.slamT < 1.0) {   // 5 · o protagonista entra primeiro; o portão bate quando ele passa
      once('go', () => { H.path = [V(0, 0, 104), V(0, 0, 96.5)]; H.speed = 1.7; say(H.nome, 'Eu vou na frente. Fiquem atrás de mim.'); C.friends.forEach((a, i) => { a.mode = 'idle'; a.path = [V(-2 + i * 1.0, 0, 108 + (i % 2))]; a.speed = 1.2; }); });
      if (H.pos.z < 98.6 && !C.slamT) { C.slamT = t; OE.Story.trap(true); OE.Audio.play('metal', { x: 0, y: 1, z: 100 }, 2); C.friends.forEach((a, i) => { a.path = [V(-2.4 + i * 1.2, 0, 101.6)]; a.speed = 2.6; }); }
      look(V(H.pos.x + 0.9, 1.9, H.pos.z + 3.4), V(H.pos.x, 1.4, H.pos.z - 4));
    } else if (t - C.slamT < 5.5) {                           // 6 · contraplano: amigos nas grades
      once('bars', () => { C.friends.forEach(a => { a.face = Math.PI * 2; a.mode = 'scared'; }); H.face = 0; H.visible = false; /* ponto de vista do protagonista */ const r = C.friends.find(a => a.id === 'rafa') || C.friends[0]; say(r.nome, 'Não abre! A gente não consegue abrir!'); });
      if (t - C.slamT > 3.2) once('l2', () => { const b = C.friends.find(a => a.id === 'manu') || C.friends[1] || C.friends[0]; say(b.nome, 'Fica aí! Vamos dar a volta e te tirar daí!'); });
      if (Math.random() < dt * 2.5) OE.Audio.play('metal', { x: 0, y: 1, z: 100 }, 0.5);
      look(V(-0.55, 1.68, 95.1), V(0, 1.35, 104));
    } else if (t - C.slamT < 8.5) {                // 7 · apagão
      once('dark', () => { C.exp = G.renderer.toneMappingExposure; G.renderer.toneMappingExposure = 0.0; OE.Audio.play('laugh', { x: 0, y: 2, z: 104 }, 1.3); $('fade').style.opacity = 1; });
      if (t - C.slamT > 7.2) once('back', () => { G.renderer.toneMappingExposure = C.exp; $('fade').style.opacity = 0; C.friends.forEach(a => { a.visible = false; }); say(H.nome, '...Gente?'); });
      look(V(-0.55, 1.68, 95.1), V(0, 1.35, 104));
    } else if (t - C.slamT < 11) {                 // 8 · entra nos olhos do protagonista
      const k = ease((t - C.slamT - 8.5) / 2.5), eye = V(H.pos.x, 1.62, H.pos.z);
      cam.position.lerpVectors(V(-0.55, 1.68, 95.1), eye, k); const q0 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(V(-0.55, 1.68, 95.1), V(0, 1.35, 104), V(0, 1, 0)));
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0, 'YXZ')); cam.quaternion.slerpQuaternions(q0, q1, k);
      if (k > 0.6) H.visible = false;
    } else C.finish();
  };
  C.finish = function () {
    if (!C.active) return; C.active = false; const G = OE.game;
    if (C.exp !== undefined) G.renderer.toneMappingExposure = C.exp; $('fade').style.opacity = 0; OE.Director.silhouette.visible = false;
    // devolve a lanterna à câmera e remove os atores
    G.camera.add(C.flash); G.camera.add(C.flashTarget); C.flash.position.set(0.18, -0.2, 0); C.flashTarget.position.set(0, -0.15, -4); OE.Lights.setFlash(G.flashOn);
    C.actors.forEach(a => { OE.scene.remove(a.obj); a.mixer.stopAllAction(); }); C.actors = [];
    $('cine').classList.remove('on'); $('cineSub').classList.remove('on'); G.cine = null;
    if (!OE.Story.flags.trapped) OE.Story.trap(true);
    G.player.teleport(0, 0, 96.5, 0);
    C.done && C.done(true);
  };
})(window.OE);

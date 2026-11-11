'use strict';
/* O Último Espetáculo · laço principal, interface, checkpoints e captura. */
(function (OE) {
  OE.asset = p => (window.OE_ASSETS && window.OE_ASSETS[p]) || p;
  OE.debug = /debug/.test(location.search);

  /* ---------------- Interface ---------------- */
  const $ = id => document.getElementById(id);
  const UI = OE.UI = {};
  let msgT = null;
  UI.prompt = t => { const e = $('prompt'); if (t) { e.textContent = (OE.Input.touch ? '' : '[E] ') + t; e.classList.add('on'); $('bAct').classList.add('on'); } else { e.classList.remove('on'); $('bAct').classList.remove('on'); } };
  UI.msg = (t, s) => { const e = $('msg'); e.textContent = t; e.classList.add('on'); clearTimeout(msgT); msgT = setTimeout(() => e.classList.remove('on'), (s || 3) * 1000); };
  UI.note = (title, text) => { $('noteT').textContent = title || ''; $('noteB').textContent = text; $('note').classList.add('on'); OE.game.paused = true; };
  UI.inventory = () => { $('inv').innerHTML = [...OE.state.items].map(k => '<span>' + OE.ITEMS[k] + '</span>').join(''); };
  UI.fade = v => { $('fade').style.opacity = v; };
  $('note').addEventListener('click', () => { $('note').classList.remove('on'); OE.game.paused = false; });

  /* ---------------- Jogo ---------------- */
  class Game {
    constructor() {
      const cv = $('cv');
      // nível de gráfico (Suave/Padrão/Alto): antisserrilhado e densidade de pixels fixos, escolhidos na carga
      this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: OE.Q.aa, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, OE.Q.dpr));
      this.renderer.setSize(OE.view.w, OE.view.h);
      this.renderer.outputEncoding = THREE.sRGBEncoding; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
      this.scene = OE.scene = new THREE.Scene();
      // a neblina apaga tudo além de ~90 m: o plano distante corta antes de desenhar
      this.camera = new THREE.PerspectiveCamera(70, OE.view.w / OE.view.h, 0.05, OE.Q.far); this.scene.add(this.camera);
      this.world = OE.world = new OE.CollisionWorld();
      this.player = new OE.Player(this.camera, this.world);
      this.running = false; this.paused = false; this.flashOn = false; this.checkpoint = null; this.dying = false;
      OE.on('viewResize', v => { this.camera.aspect = v.w / v.h; this.camera.updateProjectionMatrix(); this.renderer.setSize(v.w, v.h); });
      OE.game = this;
    }
    async load(progress) {
      progress(0.02, 'Pintando texturas');
      await frame(); OE.buildMaterials(this.renderer);
      OE.Lights.init(this.scene, this.camera); OE.Mirrors.init(this.scene, this.renderer);
      progress(0.1, 'Construindo o complexo');
      OE.Map.define();
      await OE.Sectors.buildAll(this.scene, this.world, async (k, name) => { progress(0.1 + k * 0.7, 'Construindo: ' + name); await frame(); });
      OE.Lights.finalize();
      await OE.Models.placeProps();
      // pontos de navegação que ficaram dentro dos objetos/brinquedos externos saem do grafo
      OE.Nav.nodes = OE.Nav.nodes.filter(n => n.links.length || !this.world.overlaps(n.x, n.z, 0.4, n.y + 0.35, n.y + 1.9)); OE.Nav.nodes.forEach((n, i) => { n.id = i; });
      progress(0.82, 'Calculando rotas do inimigo'); await frame();
      OE.Nav.build();
      progress(0.9, 'Ele está acordando'); await frame();
      this.enemy = new OE.Enemy(this.scene); await this.enemy.load();
      progress(0.95, 'Preparando seu personagem'); await this.setCharacter(OE.charId());
      const far = OE.Nav.nodes.find(n => n.tag === 'enemyStart') || OE.Nav.nodes[0]; this.enemy.place(far);
      const cp = OE.checkpoints[0]; this.setCheckpoint(cp, true); this.player.teleport(cp.x, cp.y, cp.z, cp.yaw);
      this.updatables = new Set(); OE.Interact.list.forEach(o => o.update && this.updatables.add(o)); OE.doors.forEach(d => this.updatables.add(d));
      (OE.extraUpdaters || []).forEach(u => this.updatables.add(u));
      OE.on('caught', () => this.caught()); OE.on('fellOut', () => this.respawn());
      OE.on('spectator', on => UI.msg(on ? 'Modo espectador (V para voltar)' : 'De volta ao corpo', 2));
      OE.Sectors.update(this.camera);
      this.renderer.compile(this.scene, this.camera);
      progress(1, 'Pronto');
    }
    start() {
      this.running = true; OE.Audio.init(); if (OE.Audio.ctx && OE.Audio.ctx.state !== 'running') OE.Audio.ctx.resume();
      this.last = performance.now(); requestAnimationFrame(t => this.loop(t));
      UI.msg('O portão está acorrentado. Procure outro caminho para entrar.', 5);
    }
    async setCharacter(id) {
      try { const c = await OE.Models.loadCharacter(id); if (c) { OE.Avatar.set(c.obj, c.mixer, c.actions); this.character = c.info; } } catch (e) { console.warn('personagem', e); }
    }
    setPause(on) {
      this.paused = on; $('pause').classList.toggle('on', on);
      if (on && document.pointerLockElement) document.exitPointerLock();
    }
    setCheckpoint(cp, silent) { if (this.checkpoint === cp) return; this.checkpoint = cp; if (!silent) UI.msg('Checkpoint: ' + cp.name, 2.5); }
    // Morte: agarra pelo pescoço e levanta, quebra o pescoço, joga no chão e esfaqueia.
    caught() {
      if (this.dying) return; this.dying = true; const P = this.player, E = this.enemy; P.control = false;
      if (P.hidden) OE.Hiding.forceOut();
      this.deathT = 0; this.deathPhase = 0; OE.Audio.play('sting', null, 1);
      // palhaço de frente, a 0,75 m
      const dx = P.pos.x - E.pos.x, dz = P.pos.z - E.pos.z, d = Math.hypot(dx, dz) || 1;
      E.pos.set(P.pos.x - dx / d * 1.05, P.pos.y, P.pos.z - dz / d * 1.05); E.yaw = Math.atan2(dx, dz);
      this.grabDur = Math.max(1.6, E.playOnce('grab') || 1.8); this.camFrom = { y: P.eyeY || P.pos.y + 1.6 };
    }
    deathUpdate(dt) {
      const P = this.player, E = this.enemy, t = (this.deathT += dt), G = this.grabDur, cam = this.camera;
      E.animate(dt, 0); E.group.position.set(E.pos.x, E.pos.y, E.pos.z); E.group.rotation.set(0, E.yaw, 0);
      const toE = Math.atan2(-(E.pos.x - P.pos.x), -(E.pos.z - P.pos.z)), face = () => { let d = toE - P.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; P.yaw += d * Math.min(1, dt * 8); };
      const shake = a => (Math.random() - 0.5) * a, blood = $('blood');
      if (t < G * 0.55) {                       // agarrado e levantado pelo pescoço
        face(); const k = Math.min(1, t / (G * 0.35)); cam.position.set(P.pos.x + shake(0.03), P.pos.y + 1.6 + 0.35 * k + shake(0.03), P.pos.z + shake(0.03));
        cam.rotation.set(0.25 * k + shake(0.04), P.yaw, shake(0.06), 'YXZ'); blood.style.opacity = 0.15 * k;
      } else if (t < G) {                       // pescoço quebrado e jogado no chão
        if (this.deathPhase === 0) { this.deathPhase = 1; OE.Audio.play('crack', null, 1); blood.style.opacity = 0.6; }
        const k = OE.smooth(Math.min(1, (t - G * 0.55) / (G * 0.45))); cam.position.set(P.pos.x, P.pos.y + OE.lerp(1.95, 0.22, k), P.pos.z);
        cam.rotation.set(OE.lerp(0.25, 0.9, k), P.yaw + 0.4 * k, OE.lerp(0, 1.25, k), 'YXZ'); blood.style.opacity = OE.lerp(0.6, 0.3, k);
      } else if (t < G + 3.4) {                 // no chão: facadas
        if (this.deathPhase === 1) { this.deathPhase = 2; this.stabDur = E.playOnce('stab') || 0.9; this.nextStab = t + 0.35;
          // fica de pé sobre a vítima
          const fx = Math.sin(E.yaw), fz = Math.cos(E.yaw); E.pos.set(P.pos.x - fx * 0.55, P.pos.y, P.pos.z - fz * 0.55); }
        if (t > this.nextStab) { this.nextStab = t + (this.stabDur || 0.9); OE.Audio.play('stab', null, 1); blood.style.opacity = 0.75; cam.position.y = P.pos.y + 0.2 + shake(0.04); }
        blood.style.opacity = Math.max(0.3, (+blood.style.opacity || 0) - dt * 1.2);
        // deitado, olhando para cima, para o palhaço
        cam.position.set(P.pos.x, P.pos.y + 0.22, P.pos.z); cam.rotation.set(0.75 + shake(0.015), toE, 0.3, 'YXZ');
        UI.fade(OE.clamp((t - G - 2.4) / 1.0, 0, 1));
      } else { blood.style.opacity = 0; E.stopOnce(); this.respawn(); }
    }
    respawn() {
      const P = this.player, cp = this.checkpoint;
      P.spectator = false; P.hidden = null; OE.Hiding.active = null; OE.Hiding.seq = null; document.body.classList.remove('hid-v', 'hid-h', 'hid-low', 'hid-gap', 'hid-none');
      P.teleport(cp.x, cp.y, cp.z, cp.yaw); P.crouch = false; P.control = true; P.stamina = 1;
      // inimigo recomeça longe do checkpoint
      const far = OE.Nav.nodes.filter(n => !n.crawl && Math.hypot(n.x - cp.x, n.z - cp.z) > 55);
      this.enemy.place(far[(Math.random() * far.length) | 0] || OE.Nav.nodes[0]);
      this.dying = false; UI.fade(0);
    }
    loop(t) {
      requestAnimationFrame(tt => this.loop(tt));
      // FPS travado em 30 (opção): pula quadros, poupa bateria e esquenta menos
      if (OE.Q.fps === 30 && t - (this.lastDraw || 0) < 1000 / 31) return; this.lastDraw = t;
      let dt = (t - this.last) / 1000; this.last = t; if (dt > 0.05) dt = 0.05;
      this.fps = this.fps ? this.fps * 0.95 + (1 / Math.max(dt, 1e-3)) * 0.05 : 60;
      if (!this.paused) this.update(dt);
      this.render();
      OE.Input.endFrame();
    }
    update(dt) {
      const I = OE.Input, P = this.player; OE.state.time += dt;
      if (I.pressed('light')) { this.flashOn = !this.flashOn; OE.Lights.setFlash(this.flashOn); OE.Audio.play('click', null, 0.4); }
      if (I.pressed('debug')) $('debug').classList.toggle('on');
      if (I.pressed('debugMap')) this.mapView = !this.mapView;
      if (I.pressed('pause')) this.setPause(true);
      if (this.dying && this.enemy.actions && this.enemy.actions.grab) { this.deathUpdate(dt); }
      else if (this.dying) {
        this.deathT += dt; const E = this.enemy;
        // vira para o rosto dele, escurece e volta ao checkpoint
        const a = Math.atan2(-(E.pos.x - P.pos.x), -(E.pos.z - P.pos.z)); let d = a - P.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        P.yaw += d * Math.min(1, dt * 6); P.pitch += (0.12 - P.pitch) * Math.min(1, dt * 4); P.updateCamera(dt);
        UI.fade(OE.clamp((this.deathT - 0.8) / 0.8, 0, 1));
        if (this.deathT > 1.0 && !this.deathMsg) { this.deathMsg = true; UI.msg('Ele te encontrou.', 2.5); }
        if (this.deathT > 2.8) { this.deathMsg = false; this.respawn(); }
      } else {
        if (OE.Hiding.active || OE.Hiding.seq) { if (I.pressed('spectator')) { P.spectator = !P.spectator; P.spec.copy(this.camera.position); } if (P.spectator) P._spectate(dt, I); else OE.Hiding.update(dt, I); }
        else P.update(dt, I);
        OE.Interact.update(P, this.camera);
        for (const cp of OE.checkpoints) if (Math.hypot(P.pos.x - cp.x, P.pos.z - cp.z) < (cp.r || 3) && Math.abs(P.pos.y - cp.y) < 2) this.setCheckpoint(cp);
      }
      for (const u of this.updatables) u.update(dt, P);
      for (const t of OE.noiseTraps) t.update(dt, P);
      if (this.enemy && !this.dying && !this.enemyOff) this.enemy.update(dt);
      OE.Lights.update(dt, this.camera, P.spectator ? this.camera.position : P.pos);
      P.flashOn = this.flashOn; OE.Lights.updateTorch(dt, P); OE.Avatar.update(dt, P); OE.Mirrors.update(this.camera);
      OE.Sectors.update(this.camera, this.mapView);
      OE.Audio.listener(this.camera);
      $('stam').style.transform = 'scaleX(' + P.stamina.toFixed(3) + ')'; $('stamW').classList.toggle('on', P.stamina < 0.98);
    }
    render() {
      const r = this.renderer;
      if (this.mapView) {
        if (!this.mapCam) { this.mapCam = new THREE.OrthographicCamera(-130, 130, 110, -110, 1, 400); this.mapCam.position.set(-10, 200, 10); this.mapCam.lookAt(-10, 0, 10); }
        const a = innerWidth / innerHeight; this.mapCam.left = -120 * a; this.mapCam.right = 120 * a; this.mapCam.top = 120; this.mapCam.bottom = -120; this.mapCam.updateProjectionMatrix();
        const fog = this.scene.fog; this.scene.fog = null; const hi = OE.Lights.hemi.intensity; OE.Lights.hemi.intensity = 1.6;
        r.render(this.scene, this.mapCam); this.scene.fog = fog; OE.Lights.hemi.intensity = hi;
      } else r.render(this.scene, this.camera);
      if ($('debug').classList.contains('on')) {
        const i = r.info.render, P = this.player, E = this.enemy, sec = OE.Sectors.sectorAt(P.pos);
        $('debug').textContent = `FPS ${this.fps.toFixed(0)} · draw calls ${i.calls} · tri ${(i.triangles / 1000).toFixed(0)}k\n` +
          `setor ${sec ? sec.name : '-'} · zona ${OE.Lights.zone ? OE.Lights.zone.name : '-'}\npos ${P.pos.x.toFixed(1)}, ${P.pos.y.toFixed(1)}, ${P.pos.z.toFixed(1)}\n` +
          `inimigo ${E ? E.state : '-'} · ${E ? E.pos.distanceTo(P.pos).toFixed(1) : ''} m · colisores ${OE.world.count}`;
      }
    }
  }
  function frame() { return new Promise(r => requestAnimationFrame(() => r())); }
  OE.Game = Game;

  // ---------------- Boot ----------------
  addEventListener('load', async () => {
    OE.Input.init($('cv'));
    // escolha de personagem (cartões com foto)
    OE.Models.loadManifest().then(m => {
      const list = (m && m.characters) || []; if (!list.length) return; const box = $('chars'); box.classList.add('on');
      list.forEach(c => { const b = document.createElement('button'); b.className = 'char'; b.dataset.id = c.id;
        b.innerHTML = '<img alt="" src="' + OE.asset(c.foto) + '"><b>' + c.nome + '</b><small>' + c.idade + ' anos</small><span>' + c.desc + '</span>';
        b.addEventListener('click', () => { try { localStorage.setItem('oe.char', c.id); } catch (e) {} document.querySelectorAll('.char').forEach(x => x.classList.toggle('on', x === b)); if (OE.ready) g.setCharacter(c.id); });
        box.appendChild(b); });
      const cur = OE.charId(); document.querySelectorAll('.char').forEach(x => x.classList.toggle('on', x.dataset.id === cur));
    });
    // seletor de gráficos da tela inicial (nível muda na próxima carga; FPS muda na hora)
    const mark = () => document.querySelectorAll('#gfx button').forEach(b => b.classList.toggle('on', b.dataset.q === OE.Q.name || +b.dataset.f === OE.Q.fps));
    document.querySelectorAll('#gfx button').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.f) { OE.Q.fps = +b.dataset.f; OE.saveQuality(OE.Q.name, OE.Q.fps); mark(); return; }
      if (b.dataset.q !== OE.Q.name) { OE.saveQuality(b.dataset.q, OE.Q.fps); location.reload(); }
    }));
    mark();
    $('gfx2').appendChild($('gfx').cloneNode(true)).id = 'gfx3'; document.querySelectorAll('#gfx3 button').forEach(b => b.addEventListener('click', () => { if (b.dataset.f) { OE.Q.fps = +b.dataset.f; OE.saveQuality(OE.Q.name, OE.Q.fps); document.querySelectorAll('#gfx3 button,#gfx button').forEach(x => x.classList.toggle('on', x.dataset.q === OE.Q.name || +x.dataset.f === OE.Q.fps)); } else if (b.dataset.q !== OE.Q.name) { OE.saveQuality(b.dataset.q, OE.Q.fps); location.reload(); } }));
    const g = new Game(), bar = $('bar'), st = $('loadSt');
    try {
      if (window.OE_ASSETS_READY) { st.textContent = 'Baixando modelos'; await window.OE_ASSETS_READY; }
      await g.load(async (k, s) => { bar.style.transform = 'scaleX(' + k + ')'; st.textContent = s; });
      $('start').classList.add('on'); st.textContent = 'Toque para entrar';
      OE.ready = true;
    } catch (e) { console.error(e); st.textContent = 'Erro: ' + e.message; OE.loadError = e; }
    $('resume').addEventListener('click', () => { g.setPause(false); if (!OE.Input.touch && $('cv').requestPointerLock) $('cv').requestPointerLock(); });
    $('start').addEventListener('click', () => { if (!OE.ready) return;
      if (OE.Input.touch || matchMedia('(pointer: coarse)').matches) { OE.Input.lockLandscape(); document.body.classList.add('hint'); setTimeout(() => document.body.classList.remove('hint'), 7000); } $('splash').classList.add('off'); g.start(); if (!OE.Input.touch && !OE.noPointerLock) $('cv').requestPointerLock && $('cv').requestPointerLock(); });
    if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !OE.debug && !/UltimoEspetaculoApp/.test(navigator.userAgent)) navigator.serviceWorker.register('sw.js').catch(() => {});
  });
})(window.OE);

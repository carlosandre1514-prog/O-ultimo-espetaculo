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
      this.renderer.setSize(innerWidth, innerHeight);
      this.renderer.outputEncoding = THREE.sRGBEncoding; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
      this.scene = OE.scene = new THREE.Scene();
      // a neblina apaga tudo além de ~90 m: o plano distante corta antes de desenhar
      this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, OE.Q.far); this.scene.add(this.camera);
      this.world = OE.world = new OE.CollisionWorld();
      this.player = new OE.Player(this.camera, this.world);
      this.running = false; this.paused = false; this.flashOn = false; this.checkpoint = null; this.dying = false;
      addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); });
      OE.game = this;
    }
    async load(progress) {
      progress(0.02, 'Pintando texturas');
      await frame(); OE.buildMaterials(this.renderer);
      OE.Lights.init(this.scene, this.camera);
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
    setCheckpoint(cp, silent) { if (this.checkpoint === cp) return; this.checkpoint = cp; if (!silent) UI.msg('Checkpoint: ' + cp.name, 2.5); }
    caught() {
      if (this.dying) return; this.dying = true; const P = this.player; P.control = false;
      if (P.hidden) OE.Hiding.forceOut();
      this.deathT = 0; OE.Audio.play('sting', null, 1);
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
      if (this.dying) {
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
    // seletor de gráficos da tela inicial (nível muda na próxima carga; FPS muda na hora)
    const mark = () => document.querySelectorAll('#gfx button').forEach(b => b.classList.toggle('on', b.dataset.q === OE.Q.name || +b.dataset.f === OE.Q.fps));
    document.querySelectorAll('#gfx button').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.f) { OE.Q.fps = +b.dataset.f; OE.saveQuality(OE.Q.name, OE.Q.fps); mark(); return; }
      if (b.dataset.q !== OE.Q.name) { OE.saveQuality(b.dataset.q, OE.Q.fps); location.reload(); }
    }));
    mark();
    const g = new Game(), bar = $('bar'), st = $('loadSt');
    try {
      if (window.OE_ASSETS_READY) { st.textContent = 'Baixando modelos'; await window.OE_ASSETS_READY; }
      await g.load(async (k, s) => { bar.style.transform = 'scaleX(' + k + ')'; st.textContent = s; });
      $('start').classList.add('on'); st.textContent = 'Toque para entrar';
      OE.ready = true;
    } catch (e) { console.error(e); st.textContent = 'Erro: ' + e.message; OE.loadError = e; }
    $('start').addEventListener('click', () => { if (!OE.ready) return; $('splash').classList.add('off'); g.start(); if (!OE.Input.touch && !OE.noPointerLock) $('cv').requestPointerLock && $('cv').requestPointerLock(); });
    if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !OE.debug) navigator.serviceWorker.register('sw.js').catch(() => {});
  });
})(window.OE);

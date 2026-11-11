'use strict';
/* Interação + InteractiveObjects.
   Cada objeto interativo tem estado real, colisor (quando ocupa espaço), som e evento de ruído
   que o inimigo escuta. Nada é decorativo: portas giram e bloqueiam, gavetas guardam itens,
   o gerador liga a energia, interruptores acendem grupos de luzes, alavancas abrem portões,
   caixas empurradas liberam passagens. */
(function (OE) {
  const tmp = new THREE.Vector3(), fwd = new THREE.Vector3();
  const IX = { list: [], current: null };
  OE.Interact = IX;
  IX.add = o => { o.radius = o.radius || 1.9; IX.list.push(o); return o; };
  IX.update = function (player, cam) {
    let best = null, bestScore = -1;
    if (player.control && !player.spectator) {
      fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
      for (const o of IX.list) {
        if (o.enabled === false) continue;
        tmp.copy(o.pos).sub(cam.position); const d = tmp.length(); if (d > o.radius) continue;
        const dot = tmp.dot(fwd) / (d || 1); if (dot < (d < 0.9 ? 0.2 : 0.72)) continue;
        const sc = dot * 2 - d / o.radius; if (sc <= bestScore) continue;
        // não interage através de paredes
        const own = o.colliders || []; const hit = OE.world.blocked(cam.position, o.pos, c => c.see || c.tag === 'door' || own.indexOf(c) >= 0 || c.tag === 'hide');
        if (hit) continue;
        best = o; bestScore = sc;
      }
    }
    IX.current = best;
    const label = best ? best.label() : null;
    OE.UI.prompt(label);
    if (best && OE.Input.pressed('interact')) { best.use(player); if (OE.Avatar) OE.Avatar.once(best instanceof OE.Door ? 'door' : (best instanceof OE.Pickup || best instanceof OE.Drawer) ? 'pickup' : null); }
  };

  // Mini-builder para peças móveis (portas, gavetas): mesma qualidade de UV/cor do cenário.
  function partMesh(fn) {
    const b = new OE.Builder('part', { box: () => ({}), cyl: () => ({}) });   // colisores das peças móveis são feitos à parte b.box = ((orig) => function (m, x, y, z, w, h, d, o) { return orig.call(this, m, x, y, z, w, h, d, Object.assign({ col: false }, o || {})); })(b.box);
    fn(b); const g = new THREE.Group(); b.finalize(g); g.children.forEach(m => { m.matrixAutoUpdate = false; }); return g;
  }
  OE.partMesh = partMesh;

  /* ---------------- Porta com dobradiça ---------------- */
  class Door {
    // o: {x,z,y,w,h,yaw (plano da parede),hinge:-1|1, opens:-1|1, mat, kind, lock, boltSide, name, sector}
    constructor(o) {
      Object.assign(this, { y: 0, w: 0.95, h: 2.05, hinge: -1, opens: 1, kind: 'wood', name: 'porta', angle: 0, target: 0, lock: null }, o);
      this.open = false; this.maxAng = (this.maxAngle || 100) * OE.DEG;
      const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
      this.hx = this.x + c * this.hinge * this.w / 2; this.hz = this.z - s * this.hinge * this.w / 2;   // dobradiça
      this.pivot = new THREE.Group(); this.pivot.position.set(this.hx, this.y, this.hz); this.pivot.rotation.y = this.yaw;
      const W = this.w - 0.04, mat = this.mat || OE.MAT.woodDark, kind = this.kind, hs = -this.hinge;
      const mesh = partMesh(b => {
        if (kind === 'cage' || kind === 'bars') {
          b.box(OE.MAT.iron, hs * W / 2, 0.05, 0, W, 0.06, 0.06); b.box(OE.MAT.iron, hs * W / 2, this.h - 0.1, 0, W, 0.06, 0.06); b.box(OE.MAT.iron, hs * W / 2, this.h / 2, 0, W, 0.05, 0.05);
          for (let i = 0; i <= 6; i++) b.cyl(OE.MAT.rust, hs * (0.03 + i * (W - 0.06) / 6), 0.05, 0, 0.018, 0.018, this.h - 0.12, 5);
        } else if (kind === 'stall') {
          b.box(mat, hs * W / 2, 0.25, 0, W, this.h - 0.25, 0.04);
        } else {
          b.box(mat, hs * W / 2, 0, 0, W, this.h - 0.02, 0.045, { uvLock: true });
          if (kind === 'wood') { b.box(mat, hs * W / 2, 0.25, 0.03, W * 0.7, 0.7, 0.02); b.box(mat, hs * W / 2, 1.15, 0.03, W * 0.7, 0.7, 0.02);
            b.box(mat, hs * W / 2, 0.25, -0.03, W * 0.7, 0.7, 0.02); b.box(mat, hs * W / 2, 1.15, -0.03, W * 0.7, 0.7, 0.02); }
          // ferragens no mesmo material (escurecido): 1 draw call por porta
          const dk = { tint: 0x2a2826 };
          if (kind === 'metal') { b.box(mat, hs * W / 2, 1.55, 0.03, W * 0.6, 0.12, 0.02, dk); b.box(mat, hs * W / 2, 1.55, -0.03, W * 0.6, 0.12, 0.02, dk); }
          b.box(mat, hs * (W - 0.1), 0.98, 0.05, 0.12, 0.04, 0.04, dk); b.box(mat, hs * (W - 0.1), 0.98, -0.05, 0.12, 0.04, 0.04, dk);
        }
      });
      this.pivot.add(mesh); this.mesh = mesh; OE.addDyn(this.pivot);
      this.col = OE.world.box(0, this.y + this.h / 2, 0, W / 2, this.h / 2, 0.05, 0, 'door'); this.col.doorRef = this; this._syncCol();
      this.pos = new THREE.Vector3(this.x, this.y + 1.1, this.z);
      this.colliders = [this.col];
      OE.Interact.add(this); OE.doors.push(this);
      if (this.startOpen) { this.angle = this.target = this.startOpen * this.maxAng; this.open = true; this._apply(); }
    }
    _syncCol() {
      const a = this.yaw + this.angle * this.opens, half = (this.w - 0.04) / 2, hs = -this.hinge;
      const cx = this.hx + Math.cos(a) * hs * half, cz = this.hz - Math.sin(a) * hs * half;
      OE.world.setBox(this.col, cx, cz, a);
    }
    _apply() { this.pivot.rotation.y = this.yaw + this.angle * this.opens; this.pivot.updateMatrixWorld(true); this._syncCol(); }
    side(p) { return (p.x - this.x) * Math.sin(this.yaw) + (p.z - this.z) * Math.cos(this.yaw) > 0 ? 1 : -1; }
    isLocked() { return !!this.lock; }
    label() {
      const P = OE.game.player;
      if (this.lock === 'jammed') return 'Emperrada';
      if (this.lock === 'bolt') return this.side(P.pos) === this.boltSide ? 'Abrir o ferrolho' : 'Trancada pelo outro lado';
      if (this.lock && this.lock.startsWith('key:')) { const k = this.lock.slice(4); return OE.state.items.has(k) ? 'Destrancar (' + OE.ITEMS[k] + ')' : 'Trancada · precisa: ' + OE.ITEMS[k]; }
      if (this.lock === 'power') return 'Sem energia';
      if (this.lock === 'sealed') return 'Trancado. Não abre por dentro';
      if (this.lock && this.lock.startsWith('code:')) return 'Painel com senha · ' + this.name;
      return (this.open ? 'Fechar ' : 'Abrir ') + this.name;
    }
    use(P) {
      if (this.lock === 'jammed') { OE.Audio.play('locked', this.pos, 0.8); OE.UI.msg('A porta está emperrada. Não abre.'); return; }
      if (this.lock === 'power') { OE.Audio.play('locked', this.pos, 0.6); OE.UI.msg('Não tem energia.'); return; }
      if (this.lock === 'sealed') { OE.Audio.play('locked', this.pos, 1); OE.UI.msg('Não abre. É como se alguém segurasse do outro lado.'); return; }
      if (this.lock && this.lock.startsWith('code:')) { OE.Story.keypad(this, this.lock.slice(5)); return; }
      if (this.lock === 'bolt') {
        if (this.side(P.pos) === this.boltSide) { this.lock = null; OE.Audio.play('click', this.pos); OE.UI.msg('Ferrolho aberto. Atalho liberado.'); }
        else { OE.Audio.play('locked', this.pos, 0.8); OE.UI.msg('Trancada pelo outro lado.'); }
        return;
      }
      if (this.lock && this.lock.startsWith('key:')) {
        const k = this.lock.slice(4);
        if (OE.state.items.has(k)) { this.lock = null; OE.Audio.play('click', this.pos); OE.UI.msg('Destrancada com ' + OE.ITEMS[k] + '.'); OE.emit('navChanged'); }
        else { OE.Audio.play('locked', this.pos, 0.8); OE.UI.msg('Trancada. Precisa de: ' + OE.ITEMS[k]); }
        return;
      }
      this.toggle(P.pos, 'player');
    }
    // Abre para o lado oposto de quem empurra (não acerta quem abre).
    toggle(from, who) {
      if (this.open) return this.close(who);
      if (!this.fixedSwing && from) this.opens = this.side(from) * (-this.hinge);
      this.target = this.maxAng; this.open = true; this._sound(who);
    }
    close(who) {
      // não fecha em cima de alguém
      const P = OE.game.player, E = OE.game.enemy;
      const blockedBy = p => Math.hypot(p.x - this.hx, p.z - this.hz) < this.w + 0.35;
      if (blockedBy(P.pos) && !P.hidden && who !== 'player-force') { if (Math.hypot(P.pos.x - this.x, P.pos.z - this.z) < 0.75) return false; }
      if (E && blockedBy(E.pos) && who !== 'enemy') return false;
      this.target = 0; this.open = false; this._sound(who); return true;
    }
    _sound(who) {
      OE.Audio.play(this.kind === 'metal' || this.kind === 'cage' || this.kind === 'bars' ? 'metal' : 'door', this.pos, this.kind === 'stall' ? 0.4 : 0.8);
      if (who === 'player') OE.emit('noise', { pos: this.pos.clone(), radius: this.kind === 'metal' || this.kind === 'cage' ? 13 : 9, source: 'door' });
    }
    update(dt) {
      if (Math.abs(this.angle - this.target) < 1e-3) return;
      const sp = dt * (this.target > this.angle ? 2.6 : 3.2);
      this.angle = this.target > this.angle ? Math.min(this.target, this.angle + sp) : Math.max(this.target, this.angle - sp);
      this._apply();
    }
  }
  OE.Door = Door; OE.doors = [];

  /* ---------------- Portão de correr / porta de enrolar ---------------- */
  class SlideGate {
    // o: {x,y,z,w,h,yaw, axis:'x'|'y', amount, mesh builder fn, lock, name, startOpen(0..1)}
    constructor(o) {
      Object.assign(this, { axis: 'x', t: 0, target: 0, name: 'portão' }, o);
      this.group = new THREE.Group(); this.group.position.set(this.x, this.y, this.z); this.group.rotation.y = this.yaw;
      this.mesh = partMesh(this.build); this.group.add(this.mesh); OE.addDyn(this.group);
      this.col = OE.world.box(this.x, this.y + this.h / 2, this.z, this.w / 2, this.h / 2, 0.08, this.yaw, 'door'); this.col.doorRef = this;
      this.pos = new THREE.Vector3(this.x + (this.handle ? this.handle[0] : 0), this.y + 1.1, this.z + (this.handle ? this.handle[1] : 0));
      this.colliders = [this.col]; this.t = this.target = this.startOpen || 0; this._apply();
      if (!this.noInteract) OE.Interact.add(this); OE.doors.push(this);
    }
    get open() { return this.t > 0.5; }
    isLocked() { return !!this.lock; }
    label() { if (this.lock === 'power') return 'Sem energia · ' + this.name; if (this.lock) return this.lockLabel || 'Trancado'; return (this.target > 0.5 ? 'Fechar ' : 'Abrir ') + this.name; }
    use() {
      if (this.lock) { OE.Audio.play('locked', this.pos); OE.UI.msg(this.lockMsg || 'Está preso.'); return; }
      this.setOpen(this.target < 0.5, 'player');
    }
    setOpen(v, who) { this.target = v ? 1 : (this.closedAt || 0); OE.Audio.play('metal', this.pos, 0.9); if (who === 'player') OE.emit('noise', { pos: this.pos.clone(), radius: 18, source: 'gate' }); }
    toggle(from, who) { this.setOpen(!this.open, who); }
    _apply() {
      const amt = this.amount * this.t;
      if (this.axis === 'y') { this.mesh.position.y = amt; const free = this.h - amt; // porta de enrolar: colisor encolhe para cima
        this.col.y = this.y + amt + (this.h) / 2; OE.world.remove(this.col); this.col.hy = this.h / 2; OE.world.add(this.col);
        this.passHeight = amt; }
      else { this.mesh.position.x = amt; const c = Math.cos(this.yaw), s = Math.sin(this.yaw); OE.world.setBox(this.col, this.x + c * amt, this.z - s * amt, this.yaw); }
      this.mesh.updateMatrix(); this.group.updateMatrixWorld(true);
    }
    update(dt) { if (Math.abs(this.t - this.target) < 1e-3) return; this.t += Math.sign(this.target - this.t) * Math.min(Math.abs(this.target - this.t), dt * 0.45); this._apply(); }
  }
  OE.SlideGate = SlideGate;

  /* ---------------- Gaveta (guarda item) ---------------- */
  class Drawer {
    constructor(o) {
      Object.assign(this, { out: 0, target: 0, name: 'gaveta' }, o);
      this.group = new THREE.Group(); this.group.position.set(this.x, this.y, this.z); this.group.rotation.y = this.yaw;
      this.mesh = partMesh(b => { const m = this.mat || OE.MAT.woodDark; b.box(m, 0, 0, 0, this.w, 0.03, this.d); b.box(m, 0, 0, this.d / 2 - 0.01, this.w, this.h, 0.025);
        b.box(m, -this.w / 2 + 0.01, 0, 0, 0.02, this.h * 0.8, this.d); b.box(m, this.w / 2 - 0.01, 0, 0, 0.02, this.h * 0.8, this.d); b.box(m, 0, 0, -this.d / 2 + 0.01, this.w, this.h * 0.8, 0.02);
        b.box(OE.MAT.chrome, 0, this.h * 0.45, this.d / 2 + 0.02, 0.1, 0.025, 0.025);
        if (this.item) b.box(this.item === 'fusivel' ? OE.MAT.metalRed : OE.MAT.chrome, 0.05, 0.03, 0, this.item === 'fusivel' ? 0.04 : 0.09, 0.03, this.item === 'fusivel' ? 0.09 : 0.03); });
      this.group.add(this.mesh); OE.addDyn(this.group);
      const c = Math.cos(this.yaw), s = Math.sin(this.yaw); this.pos = new THREE.Vector3(this.x + s * this.d / 2, this.y + this.h / 2, this.z + c * this.d / 2);
      OE.Interact.add(this); this.radius = 1.6;
    }
    label() { return this.target ? (this.item ? 'Pegar ' + OE.ITEMS[this.item] : 'Fechar ' + this.name) : 'Abrir ' + this.name; }
    use() {
      if (this.target && this.item) { OE.state.items.add(this.item); OE.UI.msg('Você pegou: ' + OE.ITEMS[this.item]); OE.UI.inventory(); OE.Audio.play('click', this.pos);
        this.item = null; this._rebuildEmpty(); return; }
      this.target = this.target ? 0 : 1; OE.Audio.play('click', this.pos, 0.5); OE.emit('noise', { pos: this.pos.clone(), radius: 3, source: 'drawer' });
    }
    _rebuildEmpty() { const old = this.mesh; this.group.remove(old); this.mesh = partMesh(b => { const m = this.mat || OE.MAT.woodDark; b.box(m, 0, 0, 0, this.w, 0.03, this.d); b.box(m, 0, 0, this.d / 2 - 0.01, this.w, this.h, 0.025); b.box(OE.MAT.chrome, 0, this.h * 0.45, this.d / 2 + 0.02, 0.1, 0.025, 0.025); }); this.group.add(this.mesh); this._apply(); }
    _apply() { this.mesh.position.z = this.out * this.d * 0.75; this.mesh.updateMatrix(); this.group.updateMatrixWorld(true); }
    update(dt) { if (this.out === this.target) return; this.out = this.target > this.out ? Math.min(1, this.out + dt * 4) : Math.max(0, this.out - dt * 4); this._apply(); }
  }
  OE.Drawer = Drawer;

  /* ---------------- Interruptor / alavanca / gerador ---------------- */
  class Switch {
    // o: {x,y,z,yaw, group (luzes), needsPower, kind:'switch'|'lever'|'panel', name, action(on)}
    constructor(o) {
      Object.assign(this, { on: false, kind: 'switch', name: 'interruptor' }, o);
      this.group = new THREE.Group(); this.group.position.set(this.x, this.y, this.z); this.group.rotation.y = this.yaw;
      const lever = this.kind === 'lever';
      this.group.add(partMesh(b => { if (lever) { b.box(OE.MAT.metalGray, 0, -0.25, 0, 0.3, 0.5, 0.12); } else b.box(OE.MAT.paint, 0, -0.08, 0, 0.12, 0.16, 0.03, { tint: 0xc8c0a8 }); }));
      this.handle = new THREE.Group(); this.handle.position.set(0, lever ? 0 : 0, lever ? 0.08 : 0.02);
      this.handle.add(partMesh(b => { if (lever) { b.box(OE.MAT.iron, 0, 0, 0, 0.04, 0.45, 0.04); b.box(OE.MAT.metalRed, 0, 0.42, 0, 0.09, 0.09, 0.09); } else b.box(OE.MAT.paint, 0, -0.03, 0, 0.03, 0.06, 0.03, { tint: 0x3a3a3a }); }));
      this.group.add(this.handle); OE.addDyn(this.group); this._apply();
      this.pos = new THREE.Vector3(this.x, this.y, this.z); OE.Interact.add(this); this.radius = 1.7;
    }
    label() { if (this.needsPower && !OE.state.power) return this.name + ' · sem energia'; return (this.on ? 'Desligar ' : 'Ligar ') + this.name; }
    use() {
      OE.Audio.play(this.kind === 'lever' ? 'metal' : 'switch', this.pos, 0.6);
      if (this.needsPower && !OE.state.power) { OE.UI.msg('Nada acontece. Sem energia.'); return; }
      this.on = !this.on; this._apply();
      if (this.lights) OE.Lights.setGroup(this.lights, this.on);
      if (this.action) this.action(this.on);
      OE.emit('noise', { pos: this.pos.clone(), radius: this.kind === 'lever' ? 10 : 3, source: 'switch' });
    }
    _apply() { this.handle.rotation.x = this.kind === 'lever' ? (this.on ? -0.9 : 0.9) : (this.on ? -0.5 : 0.5); this.handle.updateMatrix(); this.group.updateMatrixWorld(true); }
  }
  OE.Switch = Switch;

  class Generator {
    constructor(o) {
      Object.assign(this, o); this.pos = new THREE.Vector3(this.x, this.y + 1, this.z); OE.Interact.add(this); this.radius = 2.4; this.on = false;
    }
    label() { if (this.on) return 'Gerador funcionando'; return OE.state.items.has('fusivel') ? 'Instalar fusível e ligar o gerador' : 'Gerador · falta o fusível'; }
    use() {
      if (this.on) return;
      if (!OE.state.items.has('fusivel')) { OE.Audio.play('locked', this.pos); OE.UI.msg('O gerador precisa de um fusível.'); return; }
      this.on = true; OE.state.power = true; OE.Audio.play('generator', this.pos, 1);
      OE.UI.msg('O gerador ligou. As luzes voltam... e ele com certeza ouviu.', 5);
      OE.emit('noise', { pos: this.pos.clone(), radius: 60, source: 'generator' }); OE.emit('power', true);
    }
  }
  OE.Generator = Generator;

  /* ---------------- Objeto empurrável (caixa grande / estante) ---------------- */
  class Pushable {
    // o: {x,y,z,w,h,d,yaw, build(b), axis:[ax,az] (direção permitida, local), dist, name}
    constructor(o) {
      Object.assign(this, { moved: 0, name: 'caixa' }, o);
      this.group = new THREE.Group(); this.group.position.set(this.x, this.y, this.z); this.group.rotation.y = this.yaw;
      this.group.add(partMesh(this.build)); OE.addDyn(this.group); this.group.updateMatrixWorld(true);
      this.col = OE.world.box(this.x, this.y + this.h / 2, this.z, this.w / 2, this.h / 2, this.d / 2, this.yaw, 'push');
      this.pos = new THREE.Vector3(this.x, this.y + 1, this.z); this.colliders = [this.col]; OE.Interact.add(this); this.radius = Math.max(this.w, this.d) / 2 + 1.4;
      this.anim = null;
    }
    label() { return this.moved >= this.steps ? null : 'Empurrar ' + this.name; }
    use(P) {
      if (this.anim || this.moved >= this.steps) return;
      const dx = this.dir[0] * this.dist, dz = this.dir[1] * this.dist, nx = this.x + dx, nz = this.z + dz;
      // destino livre? (ignora a própria caixa)
      OE.world.remove(this.col);
      // testa a pegada da caixa no destino com círculos ao longo do lado maior
      const c = Math.cos(this.yaw), sn = Math.sin(this.yaw), long = Math.max(this.w, this.d), short = Math.min(this.w, this.d), alongX = this.w >= this.d;
      let hit = null;
      for (const k of [-1, 0, 1]) { const off = k * (long / 2 - short / 2), lx = alongX ? off : 0, lz = alongX ? 0 : off;
        hit = hit || OE.world.overlaps(nx + lx * c + lz * sn, nz - lx * sn + lz * c, short / 2 - 0.04, this.y + 0.2, this.y + this.h, null); }
      const PL = OE.game.player; if (!hit && Math.hypot(PL.pos.x - nx, PL.pos.z - nz) < long / 2 + 0.3) hit = { tag: 'player' };
      OE.world.add(this.col);
      if (hit && hit.tag !== 'floor') { OE.UI.msg('Não vai mais longe.'); return; }
      this.anim = { t: 0, fx: this.x, fz: this.z, tx: nx, tz: nz };
      OE.Audio.play('creak', this.pos, 1); OE.emit('noise', { pos: this.pos.clone(), radius: 12, source: 'push' });
    }
    update(dt) {
      if (!this.anim) return; const a = this.anim; a.t = Math.min(1, a.t + dt / 1.4); const k = OE.smooth(a.t);
      this.x = OE.lerp(a.fx, a.tx, k); this.z = OE.lerp(a.fz, a.tz, k); this.group.position.set(this.x, this.y, this.z); this.group.updateMatrixWorld(true);
      OE.world.setBox(this.col, this.x, this.z, this.yaw); this.pos.set(this.x, this.y + 1, this.z);
      if (a.t >= 1) { this.anim = null; this.moved++; if (this.onMoved) this.onMoved(this.moved); OE.emit('navChanged'); }
    }
  }
  OE.Pushable = Pushable;

  /* ---------------- Armadilha de ruído (garrafas, latas, cacos) ---------------- */
  class NoiseTrap {
    constructor(o) { Object.assign(this, { r: 0.7, cd: 0 }, o); OE.noiseTraps.push(this); }
    update(dt, P) {
      this.cd -= dt; if (this.cd > 0 || P.hidden || P.spectator) return;
      if (Math.hypot(P.pos.x - this.x, P.pos.z - this.z) < this.r && Math.abs(P.pos.y - this.y) < 0.6 && P.moving && !P.crouch) {
        this.cd = 6; OE.Audio.play(this.sound || 'can', { x: this.x, y: this.y + 0.2, z: this.z }, 1);
        OE.emit('noise', { pos: new THREE.Vector3(this.x, this.y, this.z), radius: 15, source: 'trap' }); OE.UI.msg('Você chutou algo. Barulho!', 1.5);
      }
    }
  }
  OE.NoiseTrap = NoiseTrap; OE.noiseTraps = [];

  /* ---------------- Caixinha de música (distração) ---------------- */
  class MusicBox {
    constructor(o) { Object.assign(this, o); this.pos = new THREE.Vector3(this.x, this.y + 0.1, this.z); OE.Interact.add(this); this.radius = 1.6; this.cd = 0; }
    label() { return this.cd > 0 ? null : 'Dar corda na caixinha de música'; }
    use() { this.cd = 25; OE.Audio.play('sting', null, 0.3); setTimeout(() => OE.emit('noise', { pos: this.pos.clone(), radius: 45, source: 'musicbox' }), 4000); OE.UI.msg('A melodia começa em alguns segundos... afaste-se.', 3); OE.Audio.musicBoxAt && OE.Audio.musicBoxAt(this.pos); }
    update(dt) { this.cd -= dt; }
  }
  OE.MusicBox = MusicBox;

  /* ---------------- Item no chão / Bilhete ---------------- */
  OE.ITEMS = { fusivel: 'Fusível', chave_camarim: 'Chave do Camarim 2', chave_subsolo: 'Chave do Subsolo', chave_deposito: 'Chave do Depósito', chave_portao: 'Chave do Cadeado' };
  class Pickup {
    constructor(o) { Object.assign(this, o); this.pos = new THREE.Vector3(this.x, this.y + 0.05, this.z);
      this.mesh = partMesh(b => b.box(OE.MAT.chrome, 0, 0, 0, 0.1, 0.02, 0.035)); this.mesh.position.copy(this.pos); this.mesh.rotation.y = 0.7; this.mesh.updateMatrix(); this.mesh.matrixAutoUpdate = false; OE.addDyn(this.mesh);
      OE.Interact.add(this); this.radius = 1.5; }
    label() { return 'Pegar ' + OE.ITEMS[this.item]; }
    use() { OE.state.items.add(this.item); OE.UI.msg('Você pegou: ' + OE.ITEMS[this.item]); OE.UI.inventory(); this.enabled = false; this.mesh.visible = false; OE.Audio.play('click', this.pos); }
  }
  OE.Pickup = Pickup;
  class Note {
    constructor(o) { Object.assign(this, o); this.pos = new THREE.Vector3(this.x, this.y, this.z); OE.Interact.add(this); this.radius = 1.6; }
    label() { return 'Ler ' + (this.title || 'bilhete'); }
    use() { OE.UI.note(this.title, this.text); }
  }
  OE.Note = Note;
})(window.OE);

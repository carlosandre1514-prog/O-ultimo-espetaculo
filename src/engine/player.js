'use strict';
/* Jogador em primeira pessoa: cilindro de colisão, degraus, agachar (passa por dutos e debaixo
   das arquibancadas), correr com fôlego, lanterna, passos que fazem barulho (o inimigo ouve)
   e modo espectador (V) que voa livre sem mexer no corpo do jogador. */
(function (OE) {
  const R = 0.3, H_STAND = 1.75, H_CROUCH = 1.0, EYE_STAND = 1.62, EYE_CROUCH = 0.86, STEP = 0.46, GRAV = 20;
  class Player {
    constructor(camera, world) {
      this.cam = camera; this.world = world;
      this.pos = new THREE.Vector3(); this.yaw = 0; this.pitch = 0; this.vy = 0; this.grounded = true;
      this.crouch = false; this.eye = EYE_STAND; this.stamina = 1; this.control = true; this.hidden = null;
      this.bob = 0; this.stepAcc = 0; this.moving = 0; this.noise = 0; this.spectator = false; this.spec = new THREE.Vector3();
      this.R = R; this.flash = null; this.lastSafe = new THREE.Vector3();
    }
    get height() { return this.crouch ? H_CROUCH : H_STAND; }
    teleport(x, y, z, yaw) { this.pos.set(x, y, z); this.yaw = yaw || 0; this.pitch = 0; this.vy = 0; this.eyeY = y + this.eye; this.lastSafe.copy(this.pos); }
    canStand() { return !this.world.overlaps(this.pos.x, this.pos.z, R * 0.95, this.pos.y + H_CROUCH, this.pos.y + H_STAND - 0.02); }
    look(I) {
      this.yaw -= I.lookX; this.pitch = OE.clamp(this.pitch - I.lookY, -1.45, 1.45);
    }
    update(dt, I) {
      if (I.pressed('spectator')) { this.spectator = !this.spectator; this.spec.copy(this.cam.position); OE.emit('spectator', this.spectator); }
      if (this.spectator) return this._spectate(dt, I);
      if (!this.control) return;                       // esconderijo/transição controla a câmera
      this.look(I);
      if (I.pressed('crouch')) { if (this.crouch) { if (this.canStand()) this.crouch = false; } else this.crouch = true; }
      // força agachar se não cabe em pé (duto, debaixo de arquibancada)
      if (!this.crouch && !this.canStand()) this.crouch = true;
      // pulo
      if (I.pressed('jump') && this.grounded && !this.crouch) { this.vy = 5.0; this.grounded = false; this.jumping = true; OE.Avatar && OE.Avatar.once('jump'); OE.Audio.play('step', null, 0.5); }
      const ax = I.axes(); let speed = this.crouch ? 1.25 : 2.4;
      const wantsRun = ax.run && !this.crouch && ax.y > 0.2 && this.stamina > 0.05;
      if (wantsRun) { speed = 4.6; this.stamina = Math.max(0, this.stamina - dt / 7); } else this.stamina = Math.min(1, this.stamina + dt / (this.moving ? 9 : 5));
      const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
      let mx = (-sy * ax.y + cy * ax.x) * speed * dt, mz = (-cy * ax.y - sy * ax.x) * speed * dt;
      this.move(mx, mz, dt);
      const mv = Math.hypot(mx, mz) / dt; this.moving = mv > 0.2 ? mv : 0;
      // passos e ruído
      if (this.grounded && this.moving) {
        this.stepAcc += mv * dt; this.bob += mv * dt * 2.2;
        const stride = wantsRun ? 0.85 : this.crouch ? 0.6 : 0.7;
        if (this.stepAcc > stride) { this.stepAcc = 0;
          const tag = this.world.lastGroundTag || '', snd = tag === 'metal' ? 'stepMetal' : tag === 'wood' ? 'stepWood' : 'step';
          OE.Audio.play(snd, null, this.crouch ? 0.25 : wantsRun ? 1 : 0.55);
          const level = this.crouch ? 0 : wantsRun ? 16 : tag === 'metal' ? 7 : 4.5;
          if (level) OE.emit('noise', { pos: this.pos.clone(), radius: level, source: 'player' });
        }
      }
      this.running = wantsRun && this.moving > 3;
      const targetEye = this.crouch ? EYE_CROUCH : EYE_STAND; this.eye += (targetEye - this.eye) * Math.min(1, dt * 10);
      this.updateCamera(dt);
    }
    move(mx, mz, dt) {
      const p = this.pos, len = Math.hypot(mx, mz), n = Math.max(1, Math.ceil(len / (R * 0.5)));
      const tmp = { x: p.x, z: p.z };
      for (let i = 0; i < n; i++) {
        tmp.x += mx / n; tmp.z += mz / n;
        this.world.collide(tmp, p.y, R, this.height, STEP);
      }
      p.x = tmp.x; p.z = tmp.z;
      // chão: sobe degraus, gruda ao descer escadas, cai de bordas
      const g = this.world.ground(p.x, p.z, p.y + STEP, R);
      if (this.grounded && this.vy <= 0 && g > p.y - STEP - 0.05 && g <= p.y + STEP) { p.y = g; this.vy = 0; }
      else {
        this.vy -= GRAV * dt; p.y += this.vy * dt;
        if (p.y <= g) { p.y = g; if (this.vy < -4) { OE.Audio.play('step', null, 1); OE.emit('noise', { pos: p.clone(), radius: 7, source: 'player' }); } this.vy = 0; this.grounded = true; this.jumping = false; }
        else this.grounded = false;
      }
      if (this.grounded) this.grounded = true;
      if (p.y < -30) { OE.emit('fellOut'); }
      if (this.grounded && !this.crouch) this.lastSafe.copy(p);
    }
    updateCamera(dt) {
      const target = this.pos.y + this.eye;
      if (this.eyeY === undefined) this.eyeY = target;
      this.eyeY += (target - this.eyeY) * Math.min(1, dt * 14);                  // suaviza degraus
      const b = this.moving ? Math.sin(this.bob * 3.1) * 0.035 * Math.min(1, this.moving / 2.4) : 0;
      this.cam.position.set(this.pos.x, this.eyeY + b, this.pos.z);
      this.cam.rotation.set(this.pitch, this.yaw, Math.sin(this.bob * 1.55) * 0.004 * (this.moving ? 1 : 0), 'YXZ');
    }
    _spectate(dt, I) {
      this.look(I); const ax = I.axes(), sp = (ax.run ? 18 : 7) * dt;
      const f = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')), r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      this.spec.addScaledVector(f, ax.y * sp).addScaledVector(r, ax.x * sp);
      if (I.keys.Space) this.spec.y += sp; if (I.keys.KeyQ) this.spec.y -= sp;
      this.cam.position.copy(this.spec); this.cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    }
  }
  Player.R = R; Player.EYE_STAND = EYE_STAND; Player.EYE_CROUCH = EYE_CROUCH; Player.STEP = STEP; Player.H_STAND = H_STAND; Player.H_CROUCH = H_CROUCH;
  OE.Player = Player;
})(window.OE);

'use strict';
/* O Palhaço — inimigo.
   Corpo: malha humana real do MakeHuman (a mesma do MiniBlender, extraída por tools/build_enemy.py),
   com o rosto pintado de branco na própria textura, olhos fundos, boca vermelha, nariz, tufos e
   gola de babados. Caminhada procedural no vertex shader (pernas e braços balançam).
   IA: patrulha (preferindo a região do jogador), escuta ruídos, vê com cone + linha de visão
   (escuro reduz o alcance, lanterna aumenta), persegue, procura, abre portas e revista
   esconderijos conforme as regras do HidingSpots. Dificuldade constante: velocidades fixas. */
(function (OE) {
  const SPEED = { patrol: 1.35, investigate: 2.1, chase: 3.75, search: 1.7 };
  const tmp = new THREE.Vector3();

  async function loadBody() {
    const resp = await fetch(OE.asset('assets/enemy_body.bin')); if (!resp.ok) throw new Error('enemy_body.bin');
    const buf = await resp.arrayBuffer(), dv = new DataView(buf), nV = dv.getUint32(0, true), nT = dv.getUint32(4, true);
    let o = 8; const pos = new Float32Array(buf, o, nV * 3); o += nV * 12; const uv = new Float32Array(buf, o, nV * 2); o += nV * 8;
    const idx = new Uint32Array(buf, o, nT * 3); o += nT * 12; const J = new Float32Array(buf, o, 15);
    return { nV, nT, pos: new Float32Array(pos), uv: new Float32Array(uv), idx: new Uint32Array(idx), J: Array.from(J) };
  }
  function loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }

  class Enemy {
    constructor(scene) {
      this.scene = scene; this.pos = new THREE.Vector3(); this.yaw = 0; this.state = 'patrol'; this.path = null; this.pi = 0;
      this.aware = 0; this.lastSeen = null; this.lostT = 0; this.wait = 0; this.phase = 0; this.stepAcc = 0; this.visibleT = -99; this.seesPlayer = false;
      this.group = new THREE.Group(); scene.add(this.group); this.target = null; this.searchSpot = null; this.enabled = true; this.stuckT = 0; this.lastPos = new THREE.Vector3();
      OE.on('noise', n => this.hear(n));
    }
    async load() {
      let body = null; try { body = await loadBody(); } catch (e) { console.warn('corpo do inimigo indisponível', e); }
      // modelo externo (ex.: gerado no Meshy) tem prioridade, se existir em assets/models/manifest.json
      const ext = OE.Models && await OE.Models.enemyModel();
      if (ext) { this.group.add(ext.obj); this.eyeH = 1.9; this.mixer = ext.mixer; this.actions = ext.actions;
        const pick = (...ks) => ks.map(k => Object.keys(ext.actions).find(n => n.includes(k))).find(Boolean);
        this.clipWalk = ext.actions[pick('walk')]; this.clipRun = ext.actions[pick('run')] || this.clipWalk; this.clipIdle = ext.actions[pick('idle')];
        [this.clipWalk, this.clipRun, this.clipIdle].forEach(a => { if (a) { a.play(); a.setEffectiveWeight(0); } });
        return; }
      if (body) this._buildBody(body, await loadImg(OE.asset('assets/skin_m_suit.jpg')).catch(() => null)); else this._fallbackBody();
    }
    _buildBody(B, img) {
      const P = B.pos; let minY = 1e9, maxY = -1e9, maxZ = -1e9;
      for (let i = 0; i < B.nV; i++) { minY = Math.min(minY, P[i * 3 + 1]); maxY = Math.max(maxY, P[i * 3 + 1]); }
      const H = maxY - minY, S = 2.08 / H, head = { x: B.J[0], y: B.J[1], z: B.J[2] }, neck = { y: B.J[4] };
      const pos = new Float32Array(B.nV * 3), isHead = new Uint8Array(B.nV);
      for (let i = 0; i < B.nV; i++) {
        let x = P[i * 3], y = P[i * 3 + 1] - minY, z = P[i * 3 + 2];
        const yn = y / H; x *= yn > 0.55 ? 0.92 : 0.96;                       // mais magro, alongado
        pos[i * 3] = x * S; pos[i * 3 + 1] = y * S * 1.0; pos[i * 3 + 2] = z * S * 0.95;
        if (P[i * 3 + 1] > neck.y + (head.y - neck.y) * 0.3) { isHead[i] = 1; maxZ = Math.max(maxZ, z); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(B.uv, 2)); g.setIndex(new THREE.BufferAttribute(B.idx, 1));
      g.computeVertexNormals();
      // Textura: terno da pele original + rosto pintado de palhaço em cima dos triângulos da cabeça
      const T = 1024, cv = document.createElement('canvas'); cv.width = cv.height = T; const ctx = cv.getContext('2d');
      if (img) ctx.drawImage(img, 0, 0, T, T); else { ctx.fillStyle = '#222'; ctx.fillRect(0, 0, T, T); }
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#5a3a40'; ctx.fillRect(0, 0, T, T); ctx.globalCompositeOperation = 'source-over';
      const eyeY = (head.y - minY) + H * 0.035, eyeX = H * 0.019, U = B.uv, I = B.idx;
      const tri = (a, b, c, col) => { ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(U[a * 2] * T, (1 - U[a * 2 + 1]) * T); ctx.lineTo(U[b * 2] * T, (1 - U[b * 2 + 1]) * T); ctx.lineTo(U[c * 2] * T, (1 - U[c * 2 + 1]) * T); ctx.closePath(); ctx.fill(); ctx.stroke(); };
      // UV v invertido? testa as duas convenções medindo onde a cabeça cai
      for (let t = 0; t < B.nT; t++) {
        const a = I[t * 3], b = I[t * 3 + 1], c = I[t * 3 + 2]; if (!(isHead[a] && isHead[b] && isHead[c])) continue;
        // triângulos que cruzam uma costura da UV (uv média por vértice) espalhariam tinta: pula
        const du = Math.max(Math.abs(U[a * 2] - U[b * 2]), Math.abs(U[b * 2] - U[c * 2]), Math.abs(U[a * 2] - U[c * 2])), dv = Math.max(Math.abs(U[a * 2 + 1] - U[b * 2 + 1]), Math.abs(U[b * 2 + 1] - U[c * 2 + 1]), Math.abs(U[a * 2 + 1] - U[c * 2 + 1]));
        if (du > 0.04 || dv > 0.04) continue;
        const cx = (P[a * 3] + P[b * 3] + P[c * 3]) / 3, cy = (P[a * 3 + 1] + P[b * 3 + 1] + P[c * 3 + 1]) / 3 - minY, cz = (P[a * 3 + 2] + P[b * 3 + 2] + P[c * 3 + 2]) / 3;
        const front = cz > maxZ - H * 0.05;
        const eye = front && Math.abs(Math.abs(cx - head.x) - eyeX) < H * 0.013 && Math.abs(cy - eyeY) < H * 0.017;
        const mouth = front && Math.abs(cx - head.x) < H * 0.03 && cy < eyeY - H * 0.04 && cy > eyeY - H * 0.06;
        tri(a, b, c, eye ? '#0a0606' : mouth ? '#8a0c0c' : cy > eyeY + H * 0.04 && !front ? '#e8e2d6' : '#ece6da');
      }
      const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.flipY = true; tex.anisotropy = 4;
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
      // caminhada procedural: pernas e braços giram em torno do quadril/ombro
      const hipY = 0.52 * 2.08, shY = 0.81 * 2.08, shX = 0.11 * 2.08;
      mat.onBeforeCompile = sh => {
        sh.uniforms.uPhase = { value: 0 }; sh.uniforms.uAmp = { value: 0 }; this.shader = sh;
        sh.vertexShader = 'uniform float uPhase; uniform float uAmp;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
          vec3 transformed = vec3(position);
          float side = position.x > 0.0 ? 1.0 : -1.0;
          if (position.y < ${hipY.toFixed(3)} && abs(position.x) < 0.25) {
            float a = uAmp * sin(uPhase) * side * smoothstep(${hipY.toFixed(3)}, ${(hipY - 0.15).toFixed(3)}, position.y);
            float yy = position.y - ${hipY.toFixed(3)}; float zz = position.z;
            transformed.y = ${hipY.toFixed(3)} + yy * cos(a) - zz * sin(a); transformed.z = yy * sin(a) + zz * cos(a);
          } else if (abs(position.x) > ${shX.toFixed(3)} && position.y < ${shY.toFixed(3)} + 0.08) {
            float a = -uAmp * 0.8 * sin(uPhase) * side * smoothstep(${shX.toFixed(3)}, ${(shX + 0.08).toFixed(3)}, abs(position.x));
            float yy = position.y - ${shY.toFixed(3)}; float zz = position.z;
            transformed.y = ${shY.toFixed(3)} + yy * cos(a) - zz * sin(a); transformed.z = yy * sin(a) + zz * cos(a);
          }`);
      };
      const mesh = new THREE.Mesh(g, mat); this.group.add(mesh); this.body = mesh;
      // nariz, tufos, gola de babados
      const hy = (head.y - minY) * S, hz = maxZ * S * 0.95;
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshStandardMaterial({ color: 0x9a0a0a, roughness: 0.35 })); nose.position.set(head.x * S, hy + H * 0.012 * S, hz + 0.02); this.group.add(nose);
      // tufos de cabelo: mesclados numa malha só (1 draw call)
      const tuftM = new THREE.MeshStandardMaterial({ color: 0x6a1a10, roughness: 1, vertexColors: true, flatShading: true }); tuftM.name = 'tuft'; tuftM.userData.tile = 1;
      const tb = new OE.Builder('tufts', null);
      [-1, 1].forEach(sd => { for (let k = 0; k < 5; k++) tb.geo(tuftM, new THREE.IcosahedronGeometry(0.06 + k * 0.006, 0), head.x * S + sd * (0.09 + k * 0.012), hy + 0.06 + (k % 3) * 0.03, -0.02 + (k % 2) * 0.03, { rx: k, yaw: k * 2, grime: false }); });
      tb.finalize(this.group);
      const ruff = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.05, 6, 22), new THREE.MeshStandardMaterial({ color: 0xc8c0b0, roughness: 0.9, flatShading: true }));
      const rp = ruff.geometry.attributes.position; for (let i = 0; i < rp.count; i++) { const a = Math.atan2(rp.getY(i), rp.getX(i)); rp.setZ(i, rp.getZ(i) + Math.sin(a * 11) * 0.025); }
      ruff.geometry.computeVertexNormals(); ruff.rotation.x = Math.PI / 2; ruff.position.set(0, (neck.y - minY) * S - 0.02, 0.01); this.group.add(ruff);
      this.eyeH = hy;
    }
    _fallbackBody() {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 2, 10), new THREE.MeshStandardMaterial({ color: 0x331111 })); m.position.y = 1; this.group.add(m); this.eyeH = 1.85;
    }
    place(n) { this.pos.set(n.x, n.y, n.z); this.node = n; this.path = null; this.state = 'patrol'; this.aware = 0; this.wait = 1; }

    hear(n) {
      if (!this.enabled || this.state === 'chase' || this.state === 'grab') return;
      const d = this.pos.distanceTo(n.pos); if (d > n.radius) return;
      if (Math.abs(n.pos.y - this.pos.y) > 3 && d > n.radius * 0.5) return;            // abafado entre andares
      this.state = 'investigate'; this.goTo(n.pos); this.wait = 0.4; this.noiseSrc = n.source;
      if (n.source === 'hide' && OE.Hiding.active) this.suspectSpot = OE.Hiding.active;
    }
    goTo(p) {
      const a = OE.Nav.nearest(this.pos, 1.4), b = OE.Nav.nearest(p, 2.2, true); const path = OE.Nav.path(a, b, 'enemy');
      if (path) { this.path = path; this.pi = 0; this.goal = p.clone ? p.clone() : new THREE.Vector3(p.x, p.y, p.z); } else { this.path = null; }
    }
    pickPatrol() {
      const P = OE.game.player.pos, nodes = OE.Nav.nodes; let n;
      // persegue sem saber: prefere a região onde o jogador está
      for (let k = 0; k < 20; k++) { n = nodes[(Math.random() * nodes.length) | 0]; if (n.crawl) continue; const d = Math.hypot(n.x - P.x, n.z - P.z); if (Math.random() < 0.55 ? d < 40 : true) break; }
      this.goTo(n.p);
    }
    canSee(P) {
      if (P.hidden || P.spectator) return false;
      const eye = tmp.set(this.pos.x, this.pos.y + (this.eyeH || 1.9), this.pos.z), d = eye.distanceTo(P.cam.position);
      const lit = OE.game.flashOn ? 1 : (OE.Lights.zone && OE.Lights.zone.name === 'exterior' ? 0.75 : 0.55);
      const range = (P.crouch ? 0.7 : 1) * (this.state === 'chase' ? 32 : 26) * lit;
      if (d > range) return false;
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z, dl = Math.hypot(dx, dz) || 1;
      const cos = (fx * dx + fz * dz) / dl; if (d > 2.2 && cos < (this.state === 'chase' ? -0.2 : 0.42)) return false;
      const tgt = { x: P.cam.position.x, y: P.cam.position.y - 0.25, z: P.cam.position.z };
      return !OE.world.blocked(eye, tgt, c => c.see || (c.tag === 'door' && c.doorRef && c.doorRef.kind === 'cage'));
    }
    update(dt) {
      if (!this.enabled) return;
      const G = OE.game, P = G.player;
      // percepção a cada 0,1 s
      this.percT = (this.percT || 0) - dt;
      if (this.percT <= 0) {
        this.percT = 0.1; const see = this.canSee(P); this.seesPlayer = see;
        if (see) { this.visibleT = OE.state.time; const d = this.pos.distanceTo(P.pos); this.aware += 0.1 * (d < 6 ? 6 : 14 / d) * (P.moving ? 1.3 : 0.8);
          if (this.aware > 1 && this.state !== 'chase') { this.state = 'chase'; OE.Audio.play('sting', null, 0.8); OE.emit('chase', true); }
          this.lastSeen = P.pos.clone(); this.lostT = 0; }
        else this.aware = Math.max(0, this.aware - 0.03);
      }
      // jogador se escondeu na frente dele
      if (P.hidden && !P.hidden.flagged && OE.state.time - this.visibleT < 1.3 && this.state === 'chase') { P.hidden.flagged = true; this.searchSpot = P.hidden; this.state = 'searchSpot'; this.goTo(new THREE.Vector3(P.hidden.entry.x, P.hidden.y || 0, P.hidden.entry.z)); }
      if (!P.hidden) H_clearFlags();

      let speed = SPEED.patrol;
      if (this.state === 'chase') {
        speed = SPEED.chase;
        if (P.hidden) { this.state = 'search'; this.goTo(this.lastSeen || P.pos); }
        else if (this.seesPlayer) {
          const direct = Math.abs(P.pos.y - this.pos.y) < 0.6 && !OE.world.blocked({ x: this.pos.x, y: this.pos.y + 0.5, z: this.pos.z }, { x: P.pos.x, y: P.pos.y + 0.5, z: P.pos.z }, c => c.see && false);
          if (direct) { this.path = null; this.moveTowards(P.pos, speed, dt); }
          else { this.repath = (this.repath || 0) - dt; if (this.repath <= 0 || !this.path) { this.repath = 0.8; this.goTo(P.pos); } }
        } else {
          this.lostT += dt; this.repath = (this.repath || 0) - dt;
          if (this.repath <= 0) { this.repath = 1; this.goTo(this.lastSeen || P.pos); }
          if (this.lostT > 6) { this.state = 'search'; this.wait = 2.5; OE.emit('chase', false); }
        }
        if (this.pos.distanceTo(P.pos) < 1.05 && Math.abs(P.pos.y - this.pos.y) < 1) return this.grab();
      } else if (this.state === 'searchSpot') {
        speed = SPEED.chase * 0.8;
        const s = this.searchSpot; if (!s) { this.state = 'patrol'; }
        else if (Math.hypot(this.pos.x - s.entry.x, this.pos.z - s.entry.z) < 1.0) {
          this.faceTo(s.x, s.z, dt);
          this.wait += dt; if (this.wait > 1.2) { this.wait = 0; if (s.occupied) { OE.Hiding.forceOut(); return this.grab(); } this.searchSpot = null; this.state = 'search'; }
          speed = 0;
        }
      } else if (this.state === 'investigate' || this.state === 'search') speed = this.state === 'investigate' ? SPEED.investigate : SPEED.search;

      // jogador escondido: passa perto e pode perceber (exposição do esconderijo)
      if (P.hidden && this.state !== 'searchSpot') {
        const s = P.hidden, d = Math.hypot(this.pos.x - s.x, this.pos.z - s.z);
        if (d < 2.6) { const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), c = ((s.x - this.pos.x) * fx + (s.z - this.pos.z) * fz) / (d || 1);
          const chance = OE.Hiding.exposure() * (c > 0.3 ? 0.9 : 0.25) * dt * (this.suspectSpot === s ? 2.5 : 1);
          if (Math.random() < chance) { this.searchSpot = s; this.state = 'searchSpot'; this.wait = 0; this.goTo(new THREE.Vector3(s.entry.x, s.y || 0, s.entry.z)); } }
      }

      // segue o caminho
      if (speed > 0 && this.path && this.state !== 'chase' || (this.state === 'chase' && this.path && speed > 0)) this.follow(speed, dt);
      else if (!this.path && this.state !== 'chase' && this.state !== 'searchSpot') {
        this.wait -= dt;
        if (this.wait <= 0) {
          if (this.state === 'investigate') { this.state = 'search'; this.wait = 3; this.lookAround = 3; }
          else if (this.state === 'search') { this.state = 'patrol'; this.pickPatrol(); }
          else { this.pickPatrol(); this.wait = 2 + Math.random() * 4; }
        } else this.yaw += Math.sin(OE.state.time * 0.9) * dt * 0.8;     // olha em volta
      }
      // anti-travamento
      this.stuckCheck = (this.stuckCheck || 0) + dt;
      if (this.stuckCheck > 3) { this.stuckCheck = 0; if (this.path && this.lastPos.distanceTo(this.pos) < 0.4 && !this.doorWait) { this.path = null; this.wait = 0.5; } this.lastPos.copy(this.pos); }
      this.animate(dt, speed);
    }
    faceTo(x, z, dt) { let a = Math.atan2(x - this.pos.x, z - this.pos.z) - this.yaw; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; this.yaw += a * Math.min(1, dt * 5); }
    moveTowards(t, speed, dt) {
      const dx = t.x - this.pos.x, dz = t.z - this.pos.z, d = Math.hypot(dx, dz); if (d < 0.05) return true;
      const st = Math.min(d, speed * dt); this.pos.x += dx / d * st; this.pos.z += dz / d * st; this.faceTo(t.x, t.z, dt);
      // altura: acompanha o chão real (escadas, arquibancadas)
      const g = OE.world.ground(this.pos.x, this.pos.z, this.pos.y + 0.6, 0.3); if (g > -50) this.pos.y += (g - this.pos.y) * Math.min(1, dt * 10);
      this.moved = st; return d - st < 0.05;
    }
    follow(speed, dt) {
      if (this.doorWait > 0) { this.doorWait -= dt; return; }
      const n = this.path[this.pi]; if (!n) { this.path = null; return; }
      // porta fechada no trecho?
      const prev = this.path[this.pi - 1] || this.node;
      const e = prev && OE.Nav.edgeBetween(prev, n);
      if (e && e.doors) for (const d of e.doors) {
        if (d.isLocked()) { this.path = null; this.wait = 0.5; return; }
        if (!d.open && Math.hypot(d.x - this.pos.x, d.z - this.pos.z) < 1.7) { d.toggle(this.pos, 'enemy'); this.doorWait = 0.7; return; }
      }
      const tgt = this.pi === this.path.length - 1 && this.goal && this.state !== 'patrol' ? this.goal : n.p;
      const ny = n.y; const arrived = this.moveTowardsGraph(tgt, ny, prev, speed, dt);
      if (arrived) { this.node = n; this.pi++; if (this.pi >= this.path.length) { this.path = null; this.wait = this.state === 'patrol' ? 2 + Math.random() * 3 : 1.5; } }
    }
    moveTowardsGraph(t, ny, prev, speed, dt) {
      const dx = t.x - this.pos.x, dz = t.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.15) { this.pos.y = ny; return true; }
      const st = Math.min(d, speed * dt); this.pos.x += dx / d * st; this.pos.z += dz / d * st; this.faceTo(t.x, t.z, dt);
      // y interpolado ao longo da aresta (escadas)
      if (prev) { const L = Math.hypot(t.x - prev.x, t.z - prev.z) || 1, k = OE.clamp(1 - Math.hypot(t.x - this.pos.x, t.z - this.pos.z) / L, 0, 1); this.pos.y = OE.lerp(prev.y, ny, k); }
      this.moved = st; return false;
    }
    grab() {
      this.state = 'grab'; this.path = null; OE.emit('chase', false); OE.emit('caught');
    }
    animate(dt, speed) {
      const moving = this.moved > 0 ? 1 : 0; this.moved = 0;
      this.phase += dt * (moving ? 2.2 + speed * 1.4 : 0); const amp = moving ? Math.min(0.55, 0.18 + speed * 0.1) : 0;
      if (this.mixer) {   // esqueleto: mistura parado / andar / correr pela velocidade
        const run = moving && speed > 2.6, walk = moving && !run, k = Math.min(1, dt * 6);
        const blend = (a, w) => { if (a) a.setEffectiveWeight(a.getEffectiveWeight() + (w - a.getEffectiveWeight()) * k); };
        if (this.clipRun === this.clipWalk) blend(this.clipWalk, moving ? 1 : 0); else { blend(this.clipWalk, walk ? 1 : 0); blend(this.clipRun, run ? 1 : 0); }
        if (this.clipIdle) blend(this.clipIdle, moving ? 0 : 1);
        if (this.clipWalk) this.clipWalk.timeScale = moving ? Math.max(0.6, speed / 1.4) : 1;
        this.mixer.update(dt);
      }
      if (this.shader) { this.shader.uniforms.uPhase.value = this.phase; this.shader.uniforms.uAmp.value += (amp - this.shader.uniforms.uAmp.value) * Math.min(1, dt * 6); }
      this.group.position.set(this.pos.x, this.pos.y + Math.abs(Math.sin(this.phase)) * 0.03 * moving, this.pos.z);
      this.group.rotation.set(this.state === 'chase' ? 0.12 : 0.04, this.yaw, Math.sin(this.phase * 0.5) * 0.03);
      if (moving) { this.stepAcc += dt * (2.2 + speed * 1.4); if (this.stepAcc > Math.PI) { this.stepAcc = 0; OE.Audio.play('enemyStep', { x: this.pos.x, y: this.pos.y, z: this.pos.z }, 0.6); } }
      // coração do jogador acelera quando ele está perto
      const d = this.pos.distanceTo(OE.game.player.pos); this.heartT = (this.heartT || 0) - dt;
      if (d < 14 && this.heartT <= 0) { OE.Audio.play('heart', null, OE.clamp(1.2 - d / 14, 0.2, 1)); this.heartT = OE.lerp(0.45, 1.3, d / 14); }
    }
  }
  function H_clearFlags() { for (const s of OE.Hiding.spots) s.flagged = false; }
  OE.Enemy = Enemy;
})(window.OE);

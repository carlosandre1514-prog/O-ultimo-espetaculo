'use strict';
/* Colisões simplificadas: caixas orientadas (giro só em Y) e cilindros verticais,
   num hash espacial de 4 m. O jogador é um cilindro (raio + altura) que desliza nas
   paredes e sobe degraus de até STEP metros. Raios (visão do inimigo, navegação)
   usam o mesmo mundo. */
(function (OE) {
  const CELL = 4;
  class CollisionWorld {
    constructor() { this.cells = new Map(); this.stamp = 1; this.count = 0; }
    _key(i, j) { return i * 73856093 ^ j * 19349663; }
    _bounds(c) {
      if (c.t === 'c') { c.minx = c.x - c.r; c.maxx = c.x + c.r; c.minz = c.z - c.r; c.maxz = c.z + c.r; c.miny = c.y0; c.maxy = c.y1; return; }
      const ex = Math.abs(c.hx * c.c) + Math.abs(c.hz * c.s), ez = Math.abs(c.hx * c.s) + Math.abs(c.hz * c.c);
      c.minx = c.x - ex; c.maxx = c.x + ex; c.minz = c.z - ez; c.maxz = c.z + ez; c.miny = c.y - c.hy; c.maxy = c.y + c.hy;
    }
    // Caixa: centro (x,y,z), meias-medidas, giro yaw.
    box(x, y, z, hx, hy, hz, yaw, tag) {
      const c = { t: 'b', x, y, z, hx, hy, hz, yaw: yaw || 0, c: Math.cos(yaw || 0), s: Math.sin(yaw || 0), tag: tag || '', _s: 0, cells: null };
      return this.add(c);
    }
    cyl(x, z, r, y0, y1, tag) { return this.add({ t: 'c', x, z, r, y0, y1, tag: tag || '', _s: 0, cells: null }); }
    add(c) {
      this._bounds(c); c.cells = [];
      const i0 = Math.floor(c.minx / CELL), i1 = Math.floor(c.maxx / CELL), j0 = Math.floor(c.minz / CELL), j1 = Math.floor(c.maxz / CELL);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const k = this._key(i, j); let a = this.cells.get(k); if (!a) { a = []; this.cells.set(k, a); }
        a.push(c); c.cells.push(a);
      }
      this.count++; return c;
    }
    remove(c) {
      if (!c.cells) return;
      for (const a of c.cells) { const i = a.indexOf(c); if (i >= 0) a.splice(i, 1); }
      c.cells = null; this.count--;
    }
    // Move uma caixa (portas, caixas empurráveis).
    setBox(c, x, z, yaw) { this.remove(c); c.x = x; c.z = z; c.yaw = yaw; c.c = Math.cos(yaw); c.s = Math.sin(yaw); this.add(c); }
    query(minx, minz, maxx, maxz, fn) {
      const st = ++this.stamp, i0 = Math.floor(minx / CELL), i1 = Math.floor(maxx / CELL), j0 = Math.floor(minz / CELL), j1 = Math.floor(maxz / CELL);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const a = this.cells.get(this._key(i, j)); if (!a) continue;
        for (let n = 0; n < a.length; n++) { const c = a[n]; if (c._s === st || c.off) continue; c._s = st; if (c.maxx < minx || c.minx > maxx || c.maxz < minz || c.minz > maxz) continue; fn(c); }
      }
    }
    // Empurra um círculo (x,z,r) para fora de c. Devolve true se mexeu.
    _push(c, p, r) {
      if (c.t === 'c') {
        const dx = p.x - c.x, dz = p.z - c.z, d2 = dx * dx + dz * dz, R = r + c.r;
        if (d2 >= R * R) return false;
        const d = Math.sqrt(d2) || 1e-4; p.x = c.x + dx / d * R; p.z = c.z + dz / d * R; return true;
      }
      const dx = p.x - c.x, dz = p.z - c.z, lx = dx * c.c - dz * c.s, lz = dx * c.s + dz * c.c;
      const qx = OE.clamp(lx, -c.hx, c.hx), qz = OE.clamp(lz, -c.hz, c.hz);
      let ex = lx - qx, ez = lz - qz, d2 = ex * ex + ez * ez;
      if (d2 >= r * r) return false;
      let nx, nz;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); nx = lx + ex / d * (r - d) ; nz = lz + ez / d * (r - d); }
      else { // centro dentro da caixa: sai pelo lado mais próximo
        const px = c.hx - Math.abs(lx), pz = c.hz - Math.abs(lz);
        if (px < pz) { nx = Math.sign(lx || 1) * (c.hx + r); nz = lz; } else { nz = Math.sign(lz || 1) * (c.hz + r); nx = lx; }
      }
      p.x = c.x + nx * c.c + nz * c.s; p.z = c.z - nx * c.s + nz * c.c; return true;
    }
    // Resolve o cilindro do personagem. feet = altura dos pés; corpo ocupa [feet+step, feet+h].
    collide(p, feet, r, h, step) {
      let hit = false;
      for (let it = 0; it < 4; it++) {
        let moved = false;
        this.query(p.x - r - 0.1, p.z - r - 0.1, p.x + r + 0.1, p.z + r + 0.1, c => {
          if (c.maxy <= feet + step || c.miny >= feet + h) return;
          if (this._push(c, p, r)) moved = true;
        });
        if (!moved) break; hit = true;
      }
      return hit;
    }
    // Maior "chão" sob (x,z) com topo <= maxY.
    ground(x, z, maxY, r) {
      let best = -1e9, tag = ''; const rr = r * 0.55;
      this.query(x - rr, z - rr, x + rr, z + rr, c => {
        if (c.maxy > maxY + 1e-3 || c.maxy <= best || c.nowalk) return;
        if (c.t === 'c') { const dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz > (c.r + rr) ** 2) return; }
        else { const dx = x - c.x, dz = z - c.z, lx = dx * c.c - dz * c.s, lz = dx * c.s + dz * c.c;
          if (Math.abs(lx) > c.hx + rr || Math.abs(lz) > c.hz + rr) return; }
        best = c.maxy; tag = c.tag;
      });
      this.lastGroundTag = tag;
      return best;
    }
    // Algum colisor ocupa o cilindro? (sair de esconderijo, ficar em pé, fechar porta)
    overlaps(x, z, r, y0, y1, ignore) {
      let hit = null; const p = { x, z };
      this.query(x - r, z - r, x + r, z + r, c => {
        if (hit || c === ignore || c.maxy <= y0 || c.miny >= y1) return;
        p.x = x; p.z = z; if (this._push(c, p, r)) hit = c;
      });
      return hit;
    }
    // Segmento a->b bloqueado? skip(c) ignora colisores (ex.: grades para a visão).
    blocked(a, b, skip) {
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1e-6;
      let res = false;
      const steps = Math.ceil(len / (CELL * 0.5));
      const st = ++this.stamp;
      for (let s = 0; s <= steps && !res; s++) {
        const t = s / steps, x = a.x + dx * t, z = a.z + dz * t;
        const i = Math.floor(x / CELL), j = Math.floor(z / CELL);
        for (let oi = -1; oi <= 1 && !res; oi++) for (let oj = -1; oj <= 1 && !res; oj++) {
          const arr = this.cells.get(this._key(i + oi, j + oj)); if (!arr) continue;
          for (let n = 0; n < arr.length; n++) { const c = arr[n]; if (c._s === st || c.off) continue; c._s = st;
            if (skip && skip(c)) continue; if (this._segHit(c, a, dx, dy, dz)) { res = c; break; } }
        }
      }
      return res;
    }
    _segHit(c, a, dx, dy, dz) {
      if (c.t === 'c') { // aproximação: círculo em 2D + faixa de altura
        const fx = a.x - c.x, fz = a.z - c.z, A = dx * dx + dz * dz, B = 2 * (fx * dx + fz * dz), C = fx * fx + fz * fz - c.r * c.r;
        const disc = B * B - 4 * A * C; if (disc < 0 || A < 1e-9) return false;
        const t = (-B - Math.sqrt(disc)) / (2 * A); if (t < 0 || t > 1) return false;
        const y = a.y + dy * t; return y > c.y0 && y < c.y1;
      }
      const ox = a.x - c.x, oz = a.z - c.z;
      const o = [ox * c.c - oz * c.s, a.y - c.y, ox * c.s + oz * c.c], d = [dx * c.c - dz * c.s, dy, dx * c.s + dz * c.c], h = [c.hx, c.hy, c.hz];
      let t0 = 0, t1 = 1;
      for (let k = 0; k < 3; k++) {
        if (Math.abs(d[k]) < 1e-9) { if (Math.abs(o[k]) > h[k]) return false; continue; }
        let ta = (-h[k] - o[k]) / d[k], tb = (h[k] - o[k]) / d[k]; if (ta > tb) { const q = ta; ta = tb; tb = q; }
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return false;
      }
      return true;
    }
  }
  OE.CollisionWorld = CollisionWorld;
})(window.OE);

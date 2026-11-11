'use strict';
/* Builder: monta a geometria estática de um setor e a MESCLA por (material, nível de detalhe,
   célula de 24 m). Resultado: poucas draw calls, cada pedaço com bounding sphere própria
   (o frustum culling do Three descarta o que está fora da tela) e níveis de detalhe:
     struct  – estrutura, sempre visível enquanto o setor está carregado
     detail  – móveis e objetos médios, somem a ~55 m
     clutter – miudezas, somem a ~22 m
   UV em metros (a textura mantém a escala real) com deslocamento aleatório por peça e cor por
   vértice com sujeira perto do chão: o mesmo material não parece repetido. */
(function (OE) {
  const CELL = 40, M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(1, 1, 1), Pv = new THREE.Vector3();
  const NM = new THREE.Matrix3(), tmpV = new THREE.Vector3(), tmpN = new THREE.Vector3();
  // struct some a 100 m (a neblina já apagou tudo); detail e clutter bem antes
  const LOD_DIST = { struct: OE.Q.lodStruct, detail: OE.Q.lodDetail, clutter: OE.Q.lodClutter };
  OE.LOD_DIST = LOD_DIST;

  function tintOf(t) {
    if (!t) return [1, 1, 1];
    if (typeof t === 'number') return [((t >> 16) & 255) / 255, ((t >> 8) & 255) / 255, (t & 255) / 255];
    return t;
  }
  class Bucket { constructor(mat, lod) { this.mat = mat; this.lod = lod; this.pos = []; this.nor = []; this.uv = []; this.col = []; this.idx = []; this.n = 0; } }

  class Builder {
    constructor(name, world, rnd) {
      this.name = name; this.world = world; this.buckets = new Map(); this.colliders = []; this.r = rnd || OE.rng(name.length * 977 + 13);
      this.lod = 'struct'; this.layer = 'shell';
    }
    _bucket(mat, lod, x, z) {
      if (lod === 'detail') lod = 'struct';          // médio vai junto da estrutura: menos draw calls
      const k = mat.name + '|' + lod + '|' + this.layer + '|' + Math.floor(x / CELL) + ',' + Math.floor(z / CELL);
      let b = this.buckets.get(k); if (!b) { b = new Bucket(mat, lod); b.layer = this.layer; this.buckets.set(k, b); } return b;
    }
    _color(tint, y, grime, jit) {
      const g = grime === false ? 1 : 0.62 + 0.38 * OE.clamp((y - (OE._floorY || 0)) / 1.1, 0, 1);
      return [tint[0] * g * jit, tint[1] * g * jit, tint[2] * g * jit];
    }
    // ------- Caixa com UV em metros. (x,z) centro, y = base. -------
    box(mat, x, y, z, w, h, d, o) {
      o = o || {};
      const lod = o.lod || this.lod, tile = (o.tile || mat.userData.tile || 1), tint = tintOf(o.tint), r = this.r;
      E.set(o.rx || 0, o.yaw || 0, o.rz || 0, 'YXZ'); Q.setFromEuler(E); Pv.set(x, y + h / 2, z);
      M4.compose(Pv, Q, S); NM.getNormalMatrix(M4);
      const b = this._bucket(mat, lod, x, z), hw = w / 2, hh = h / 2, hd = d / 2;
      const ou = r() * 3, ov = o.uvLock ? 0 : r() * 3, jit = 0.9 + r() * 0.16;
      // faces: [normal, eixoU, eixoV, tamanhoU, tamanhoV]
      const F = [[1, 0, 0, 0, 0, -1, 0, 1, 0, d, h, hw], [-1, 0, 0, 0, 0, 1, 0, 1, 0, d, h, hw], [0, 1, 0, 1, 0, 0, 0, 0, -1, w, d, hh],
        [0, -1, 0, 1, 0, 0, 0, 0, 1, w, d, hh], [0, 0, 1, 1, 0, 0, 0, 1, 0, w, h, hd], [0, 0, -1, -1, 0, 0, 0, 1, 0, w, h, hd]];
      for (let f = 0; f < 6; f++) {
        if (o.skip && o.skip.indexOf(f) >= 0) continue;
        const q = F[f], n = [q[0], q[1], q[2]], U = [q[3], q[4], q[5]], V = [q[6], q[7], q[8]], su = q[9] / 2, sv = q[10] / 2, off = q[11];
        tmpN.set(n[0], n[1], n[2]).applyMatrix3(NM).normalize();
        const base = b.n;
        for (let k = 0; k < 4; k++) {
          const cu = k === 0 || k === 3 ? -1 : 1, cv = k < 2 ? -1 : 1;
          tmpV.set(n[0] * off + U[0] * su * cu + V[0] * sv * cv, n[1] * off + U[1] * su * cu + V[1] * sv * cv, n[2] * off + U[2] * su * cu + V[2] * sv * cv).applyMatrix4(M4);
          b.pos.push(tmpV.x, tmpV.y, tmpV.z); b.nor.push(tmpN.x, tmpN.y, tmpN.z);
          if (o.uv01) b.uv.push(o.uv01[0] + (cu + 1) / 2 * o.uv01[2], o.uv01[1] + (cv + 1) / 2 * o.uv01[3]);
          else b.uv.push(ou + (cu * su + su) / tile, ov + (cv * sv + sv) / tile);
          const c = this._color(tint, tmpV.y, o.grime, jit); b.col.push(c[0], c[1], c[2]);
        }
        b.idx.push(base, base + 1, base + 2, base, base + 2, base + 3); b.n += 4;
      }
      if (o.col !== false && !o.rx && !o.rz) {
        const c = this.world.box(x, y + h / 2, z, w / 2 + (o.pad || 0), h / 2, d / 2 + (o.pad || 0), o.yaw || 0, o.tag);
        if (o.nowalk) c.nowalk = true; if (o.see) c.see = true;
        this.colliders.push(c);
      }
      return this;
    }
    // ------- Geometria qualquer (cilindros, extrusões, tornos) -------
    geo(mat, g, x, y, z, o) {
      o = o || {};
      const lod = o.lod || this.lod, tint = tintOf(o.tint), r = this.r, uvs = o.uvScale || 1;
      E.set(o.rx || 0, o.yaw || 0, o.rz || 0, o.order || 'YXZ'); Q.setFromEuler(E); Pv.set(x, y, z);
      if (o.scale) S.set(o.scale[0], o.scale[1], o.scale[2]); M4.compose(Pv, Q, S); S.set(1, 1, 1); NM.getNormalMatrix(M4);
      const b = this._bucket(mat, lod, x, z), P = g.attributes.position, N = g.attributes.normal, UV = g.attributes.uv, base = b.n, jit = 0.9 + r() * 0.16;
      const ou = o.atlas ? 0 : r(), ov = o.atlas ? 0 : r();
      for (let i = 0; i < P.count; i++) {
        tmpV.set(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(M4); b.pos.push(tmpV.x, tmpV.y, tmpV.z);
        tmpN.set(N.getX(i), N.getY(i), N.getZ(i)).applyMatrix3(NM).normalize(); b.nor.push(tmpN.x, tmpN.y, tmpN.z);
        if (UV) b.uv.push(ou + UV.getX(i) * (o.uvU || uvs), ov + UV.getY(i) * (o.uvV || uvs)); else b.uv.push(0, 0);
        const c = this._color(tint, tmpV.y, o.grime, jit); b.col.push(c[0], c[1], c[2]);
      }
      if (g.index) { const I = g.index.array; for (let i = 0; i < I.length; i++) b.idx.push(base + I[i]); }
      else for (let i = 0; i < P.count; i++) b.idx.push(base + i);
      b.n += P.count; return this;
    }
    // Cilindro de pé (base em y). col: cria colisor cilíndrico.
    cyl(mat, x, y, z, rt, rb, h, seg, o) {
      o = o || {};
      const g = OE.G.cyl(rt, rb, h, seg || 8, o.open);
      this.geo(mat, g, x, y + h / 2, z, Object.assign({ uvU: (Math.max(rt, rb) * 6.28) / (mat.userData.tile || 1), uvV: h / (mat.userData.tile || 1) }, o));
      if (o.col && !o.rx && !o.rz) this.colliders.push(this.world.cyl(x, z, Math.max(rt, rb), y, y + h, o.tag));
      return this;
    }
    // Barra entre dois pontos (vigas inclinadas, cabos, corrimãos).
    bar(mat, a, b, t, o) {
      o = o || {};
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
      if (len < 1e-4) return this;
      const g = o.round ? OE.G.cyl(t / 2, t / 2, len, o.seg || 5) : OE.G.box(t, len, t);
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      tmpV.set(dx, dy, dz).normalize(); Q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmpV); E.setFromQuaternion(Q, 'XYZ');
      this.geo(mat, g, mid[0], mid[1], mid[2], Object.assign({}, o, { rx: E.x, yaw: E.y, rz: E.z, order: 'XYZ', uvV: len / (mat.userData.tile || 1) }));
      return this;
    }
    colBox(x, y, z, w, h, d, yaw, tag) { const c = this.world.box(x, y + h / 2, z, w / 2, h / 2, d / 2, yaw || 0, tag); this.colliders.push(c); return c; }
    colCyl(x, z, r, y0, y1, tag) { const c = this.world.cyl(x, z, r, y0, y1, tag); this.colliders.push(c); return c; }

    // Gera as malhas mescladas.
    finalize(group) {
      const meshes = [];
      for (const b of this.buckets.values()) {
        if (!b.n) continue;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
        g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
        g.setIndex(b.n > 65535 ? new THREE.Uint32BufferAttribute(b.idx, 1) : new THREE.Uint16BufferAttribute(b.idx, 1));
        g.computeBoundingSphere();
        const m = new THREE.Mesh(g, b.mat); m.matrixAutoUpdate = false; m.updateMatrix(); m.userData.lod = b.lod; m.userData.layer = b.layer;
        m.userData.lodDist = LOD_DIST[b.lod]; m.userData.center = g.boundingSphere.center.clone(); m.userData.radius = g.boundingSphere.radius;
        group.add(m); meshes.push(m);
      }
      this.buckets.clear();
      return meshes;
    }
  }
  OE.Builder = Builder;

  // Geometrias base compartilhadas (cache): uma só instância por forma.
  const GC = {};
  OE.G = {
    cyl: (rt, rb, h, seg, open) => { const k = 'c' + rt + ',' + rb + ',' + h + ',' + seg + ',' + !!open; return GC[k] || (GC[k] = new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!open)); },
    box: (w, h, d) => { const k = 'b' + w + ',' + h + ',' + d; return GC[k] || (GC[k] = new THREE.BoxGeometry(w, h, d)); },
    sphere: (r, ws, hs) => { const k = 's' + r + ',' + ws + ',' + hs; return GC[k] || (GC[k] = new THREE.SphereGeometry(r, ws || 8, hs || 6)); },
    torus: (R, r, rs, ts, arc) => { const k = 't' + [R, r, rs, ts, arc]; return GC[k] || (GC[k] = new THREE.TorusGeometry(R, r, rs, ts, arc || Math.PI * 2)); },
    // Extrusão de um perfil 2D (lista [x,y]) com espessura depth, centrada em z.
    extrude: (key, pts, depth, bevel) => {
      const k = 'e' + key; if (GC[k]) return GC[k];
      const sh = new THREE.Shape(); pts.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])));
      const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: !!bevel, bevelSize: bevel || 0, bevelThickness: bevel || 0, bevelSegments: 1, curveSegments: 6 });
      g.translate(0, 0, -depth / 2); return (GC[k] = g);
    },
    custom: (key, fn) => GC['x' + key] || (GC['x' + key] = fn())
  };

  // Plano simples (cartazes, decalques) com uv numa região do atlas.
  OE.quad = function (b, mat, x, y, z, w, h, yaw, uvRect, o) {
    o = o || {};
    const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv;
    if (uvRect) for (let i = 0; i < uv.count; i++) uv.setXY(i, uvRect[0] + uv.getX(i) * uvRect[2], uvRect[1] + uv.getY(i) * uvRect[3]);
    b.geo(mat, g, x, y, z, Object.assign({ yaw, grime: false, atlas: !!uvRect }, o));
  };
})(window.OE);

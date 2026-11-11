'use strict';
/* HidingSpots — esconderijos funcionais.
   Cada esconderijo tem: ponto de entrada, animação de entrada (porta/tampa), pose da câmera lá
   dentro com limites de olhar, ponto de saída validado contra colisões, ocupação, exposição
   (quanto o inimigo percebe) e regras com o inimigo:
     - viu você entrar  -> vai direto ao esconderijo e te puxa para fora;
     - fechado          -> quase invisível, mas lanterna acesa ou correr para dentro denuncia;
     - aberto/improvisado -> se ele passar muito perto e olhar, pode te ver.
   Categorias: 'fechado' (guarda-roupa, armário, armário metálico, baú, cabine),
               'aberto' (debaixo de cama/mesa/banco, atrás de cortina/caixas/palco),
               'improvisado' (lixeira, caçamba, caixote, contêiner, feno, debaixo da arquibancada). */
(function (OE) {
  const H = { spots: [], active: null, seq: null };
  OE.Hiding = H;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // Exposição padrão por categoria
  const EXPO = { fechado: 0.08, aberto: 0.42, improvisado: 0.22 };
  const NAMES = { wardrobe: 'guarda-roupa', cabinet: 'armário', locker: 'armário metálico', trunk: 'baú', stall: 'cabine', bed: 'cama', table: 'mesa', bench: 'banco',
    curtain: 'cortina', crates: 'caixas', stage: 'estrutura do palco', trash: 'lixeira', dumpster: 'caçamba', crate: 'caixote', container: 'contêiner', hay: 'feno', bleacher: 'arquibancada', gondola: 'gôndola caída', equipment: 'equipamentos', pipes: 'tubulação' };

  /* spot = {
       kind, cat, x,z,y (centro do objeto), yaw (frente do objeto aponta para +z local),
       entry:{x,z} (onde o jogador fica para entrar), cam:{x,y,z,yaw,pitch,yawR,pitchR},
       anim:{obj (Object3D), prop:'rotation.y'|'position.y'..., from, to} (porta/tampa), overlay, exposure } */
  H.add = function (s) {
    s.cat = s.cat || 'aberto'; s.exposure = s.exposure !== undefined ? s.exposure : EXPO[s.cat]; s.occupied = false; s.name = s.name || NAMES[s.kind] || s.kind;
    s.pos = V(s.entry.x, (s.y || 0) + 1.0, s.entry.z); s.radius = 1.9; s.label = () => (s.occupied ? null : 'Esconder-se: ' + s.name); s.use = () => H.enter(s);
    s.colliders = s.colliders || [];
    H.spots.push(s); OE.Interact.add(s); return s;
  };
  function setAnim(s, k) { if (!s.anim) return; if (s.anim.axis === 'fn') return s.anim.fn(k); const a = s.anim, v = OE.lerp(a.from, a.to, k); if (a.axis === 'ry') a.obj.rotation.y = a.base + v; else if (a.axis === 'rx') a.obj.rotation.x = a.base + v; else if (a.axis === 'py') a.obj.position.y = a.base + v; else if (a.axis === 'px') a.obj.position.x = a.base + v; a.obj.updateMatrixWorld(true); }

  H.enter = function (s) {
    const P = OE.game.player; if (H.seq || s.occupied || P.hidden) return;
    const from = { x: P.cam.position.x, y: P.cam.position.y, z: P.cam.position.z, yaw: P.yaw, pitch: P.pitch };
    P.control = false; s.occupied = true; P.hidden = s; H.active = s; s.enteredAt = OE.state.time; s.uses = (s.uses || 0) + 1;
    s.enteredRunning = P.running;
    const c = s.cam, e = { x: s.entry.x, y: (s.y || 0) + (s.low ? 0.9 : 1.55), z: s.entry.z, yaw: c.yaw, pitch: s.low ? -0.25 : 0 };
    H.seq = { t: 0, dur: s.anim ? 1.5 : 1.15, from, mid: e, to: c, dir: 1, s };
    OE.Audio.play(s.cat === 'fechado' ? 'door' : 'step', V(s.x, 1, s.z), 0.4);
    OE.emit('noise', { pos: V(s.x, 1, s.z), radius: s.cat === 'fechado' ? 3 : 2, source: 'hide' });
  };
  H.exit = function () {
    const P = OE.game.player, s = H.active; if (!s || H.seq) return;
    // ponto de saída livre: entrada, depois laterais e um pouco mais longe
    const cands = [s.exit || s.entry]; const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw), rx = Math.cos(s.yaw), rz = -Math.sin(s.yaw);
    [[0, 0.4], [0.6, 0], [-0.6, 0], [0.6, 0.5], [-0.6, 0.5], [0, 0.9], [1.1, 0], [-1.1, 0]].forEach(([a, b]) => cands.push({ x: s.entry.x + rx * a + fx * b, z: s.entry.z + rz * a + fz * b }));
    let out = null, crouch = false;
    for (const c of cands) {
      const g = OE.world.ground(c.x, c.z, (s.y || 0) + 0.5, P.R); if (g < (s.y || 0) - 1) continue;
      if (!OE.world.overlaps(c.x, c.z, P.R, g + 0.3, g + 1.75)) { out = { x: c.x, z: c.z, y: g }; break; }
      if (!out && !OE.world.overlaps(c.x, c.z, P.R, g + 0.3, g + 1.0)) { out = { x: c.x, z: c.z, y: g }; crouch = true; break; }
    }
    if (!out) { OE.UI.msg('Não dá para sair por aqui agora.'); return; }
    const to = { x: out.x, y: out.y + (crouch ? OE.Player.EYE_CROUCH : OE.Player.EYE_STAND), z: out.z, yaw: s.cam.yaw + Math.PI, pitch: 0 };
    H.seq = { t: 0, dur: s.anim ? 1.2 : 0.9, from: { x: P.cam.position.x, y: P.cam.position.y, z: P.cam.position.z, yaw: P.yaw, pitch: P.pitch }, mid: { x: s.entry.x, y: (s.y || 0) + (s.low ? 0.9 : 1.5), z: s.entry.z, yaw: to.yaw, pitch: 0 }, to, dir: -1, s, out, crouch };
    OE.Audio.play(s.cat === 'fechado' ? 'door' : 'step', V(s.x, 1, s.z), 0.4);
  };
  // Inimigo arranca o jogador do esconderijo
  H.forceOut = function () { const s = H.active; if (!s) return; s.occupied = false; H.active = null; H.seq = null; const P = OE.game.player; P.hidden = null; setAnim(s, 1); document.body.classList.remove('hid-v', 'hid-h', 'hid-low', 'hid-gap'); };

  function lerpPose(a, b, k, cam) {
    cam.position.set(OE.lerp(a.x, b.x, k), OE.lerp(a.y, b.y, k), OE.lerp(a.z, b.z, k));
    let dy = b.yaw - a.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    return { yaw: a.yaw + dy * k, pitch: OE.lerp(a.pitch, b.pitch, k) };
  }
  H.update = function (dt, I) {
    const P = OE.game.player, cam = P.cam;
    if (H.seq) {
      const q = H.seq, s = q.s; q.t += dt; const k = Math.min(1, q.t / q.dur);
      // fases: 0-30% abre e vira, 30-75% entra, 75-100% fecha
      const a1 = OE.smooth(Math.min(1, k / 0.3)), a2 = OE.smooth(OE.clamp((k - 0.3) / 0.45, 0, 1));
      const pose = k < 0.3 ? lerpPose(q.from, q.mid, a1, cam) : lerpPose(q.mid, q.to, a2, cam);
      P.yaw = pose.yaw; P.pitch = pose.pitch; cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
      if (s.anim) setAnim(s, q.dir > 0 ? (k < 0.75 ? Math.min(1, k / 0.25) : 1 - OE.smooth((k - 0.75) / 0.25)) : (k < 0.6 ? Math.min(1, k / 0.25) : 1 - OE.smooth((k - 0.6) / 0.4)));
      if (k >= 1) {
        H.seq = null;
        if (q.dir > 0) { P.pos.set(s.cam.x, s.y || 0, s.cam.z); document.body.classList.add('hid-' + (s.overlay || 'none')); s.lookYaw = 0; s.lookPitch = 0; OE.UI.msg('Escondido. ' + (OE.Input.touch ? 'Toque em ✋' : 'E') + ' para sair.', 2.5); }
        else {
          s.occupied = false; H.active = null; P.hidden = null; P.pos.set(q.out.x, q.out.y, q.out.z); P.crouch = q.crouch; P.eye = q.crouch ? OE.Player.EYE_CROUCH : OE.Player.EYE_STAND; P.eyeY = cam.position.y - (0);
          P.eyeY = q.out.y + P.eye; P.control = true; P.vy = 0; P.grounded = true;
          document.body.classList.remove('hid-v', 'hid-h', 'hid-low', 'hid-gap', 'hid-none');
        }
      }
      return;
    }
    const s = H.active; if (!s) return;
    // olhar limitado lá dentro
    s.lookYaw = OE.clamp((s.lookYaw || 0) - I.lookX, -(s.cam.yawR || 0.5), s.cam.yawR || 0.5);
    s.lookPitch = OE.clamp((s.lookPitch || 0) - I.lookY, -(s.cam.pitchR || 0.35), s.cam.pitchR || 0.35);
    P.yaw = s.cam.yaw + s.lookYaw; P.pitch = (s.cam.pitch || 0) + s.lookPitch;
    cam.position.set(s.cam.x, s.cam.y + Math.sin(OE.state.time * 1.3) * 0.006, s.cam.z); cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
    if (I.pressed('interact')) H.exit();
    s.breath = (s.breath || 0) - dt; if (s.breath < 0) { s.breath = 3.2; OE.Audio.play('breath', null, 0.6); }
  };
  // Quanto o jogador escondido aparece (0..1)
  H.exposure = function () {
    const s = H.active; if (!s) return 1;
    let e = s.exposure; if (OE.game.flashOn) e = Math.max(e, s.cat === 'fechado' ? 0.55 : 0.9);
    return e;
  };

  /* ----------- Construtores dos esconderijos (geometria + colisores + spot) -----------
     b = Builder do setor. (x,z) centro; yaw: a frente do móvel aponta para +z local girado. */
  function rot(x, z, yaw, lx, lz) { const c = Math.cos(yaw), s = Math.sin(yaw); return { x: x + lx * c + lz * s, z: z - lx * s + lz * c }; }
  H.rot = rot;
  function doorLeaf(mat, w, h, t, hingeSide, extra) {
    return OE.partMesh(b => { b.box(mat, hingeSide * -w / 2, 0, 0, w, h, t, { uvLock: true }); if (extra) extra(b, hingeSide * -w / 2); });
  }
  function addDyn(o) { (OE.currentDyn || OE.scene).add(o); }

  // Guarda-roupa / armário de madeira / armário metálico (fechados, com porta que abre e fecha)
  H.wardrobe = function (b, x, z, yaw, o) {
    o = o || {}; const y = o.y || 0, metal = o.kind === 'locker', W = o.w || (metal ? 0.6 : 1.1), D = o.d || (metal ? 0.55 : 0.65), Hh = o.h || (metal ? 1.95 : 2.05);
    const mat = o.mat || (metal ? OE.MAT.metalGreen : OE.MAT.woodDark), t = 0.035;
    // corpo: fundo, laterais, topo, base (oco por dentro)
    const P = (lx, lz) => rot(x, z, yaw, lx, lz);
    let p = P(0, -D / 2 + t / 2); b.box(mat, p.x, y, p.z, W, Hh, t, { yaw, col: false });
    p = P(-W / 2 + t / 2, 0); b.box(mat, p.x, y, p.z, t, Hh, D, { yaw, col: false });
    p = P(W / 2 - t / 2, 0); b.box(mat, p.x, y, p.z, t, Hh, D, { yaw, col: false });
    p = P(0, 0); b.box(mat, p.x, y + Hh - t, p.z, W, t, D, { yaw, col: false }); b.box(mat, p.x, y, p.z, W, 0.08, D, { yaw, col: false });
    if (!metal) { b.box(mat, p.x, y + Hh, p.z, W + 0.08, 0.06, D + 0.06, { yaw, col: false }); p = P(0, -0.05); b.box(OE.MAT.chrome, p.x, y + Hh - 0.25, p.z, W - 0.1, 0.02, 0.02, { yaw, col: false, lod: 'clutter' }); }
    // colisor sólido do móvel (o jogador entra pela interação, não andando)
    const col = b.colBox(x, y, z, W, Hh, D, yaw, 'hide');
    // portas (uma ou duas folhas)
    const leaves = metal ? 1 : 2, lw = W / leaves, front = P(0, D / 2 - t / 2), group = new THREE.Group();
    group.position.set(front.x, y + 0.08, front.z); group.rotation.y = yaw; addDyn(group);
    const anims = [];
    for (let i = 0; i < leaves; i++) {
      const hs = leaves === 1 ? -1 : i === 0 ? -1 : 1, piv = new THREE.Group(); piv.position.set(hs * W / 2, 0, 0);
      piv.add(doorLeaf(mat, lw - 0.01, Hh - 0.12, t, hs, (bb, cx) => {
        if (metal) for (let k = 0; k < 4; k++) bb.box(mat, cx, 1.35 + k * 0.06, 0.02, lw * 0.6, 0.025, 0.01, { tint: 0x111111 });
        bb.box(mat, cx - hs * (lw / 2 - 0.07), 1.0, 0.03, 0.02, 0.12, 0.02, { tint: 0x2a2826 });
      }));
      group.add(piv); anims.push(piv);
    }
    const yawEntry = yaw + Math.PI, ent = P(0, D / 2 + 0.6), camp = P(0, -0.02);
    const s = H.add({ kind: metal ? 'locker' : (o.kind || 'wardrobe'), cat: 'fechado', x, z, y, yaw, entry: ent, colliders: [col],
      cam: { x: camp.x, y: y + 1.5, z: camp.z, yaw: yaw, pitch: -0.05, yawR: 0.25, pitchR: 0.2 }, overlay: metal ? 'h' : 'v' });
    // animação: as folhas abrem em espelho, para fora
    s.anim = { axis: 'fn', fn: k => { anims.forEach((pv, i) => { const hs = leaves === 1 ? -1 : i === 0 ? -1 : 1; pv.rotation.y = hs * k * 1.6; pv.updateMatrix(); }); group.updateMatrixWorld(true); } };
    group.updateMatrixWorld(true);
    return s;
  };
  // Baú (fechado): tampa que levanta, câmera deitada olhando pela fresta
  H.trunk = function (b, x, z, yaw, o) {
    o = o || {}; const y = o.y || 0, W = 1.5, D = 0.8, Hh = 0.75, mat = OE.MAT.woodRed;
    const P = (lx, lz) => rot(x, z, yaw, lx, lz);
    let p = P(0, -D / 2 + 0.02); b.box(mat, p.x, y, p.z, W, Hh, 0.04, { yaw, col: false }); p = P(0, D / 2 - 0.02); b.box(mat, p.x, y, p.z, W, Hh, 0.04, { yaw, col: false });
    p = P(-W / 2 + 0.02, 0); b.box(mat, p.x, y, p.z, 0.04, Hh, D, { yaw, col: false }); p = P(W / 2 - 0.02, 0); b.box(mat, p.x, y, p.z, 0.04, Hh, D, { yaw, col: false });
    p = P(0, 0); b.box(mat, p.x, y, p.z, W, 0.04, D, { yaw, col: false });
    [-0.6, 0.6].forEach(lx => { const q = P(lx, D / 2); b.box(OE.MAT.rust, q.x, y + 0.05, q.z, 0.06, Hh - 0.1, 0.03, { yaw, col: false, lod: 'detail' }); });
    const col = b.colBox(x, y, z, W, Hh, D, yaw, 'hide');
    const back = P(0, -D / 2), lid = new THREE.Group(); lid.position.set(back.x, y + Hh, back.z); lid.rotation.y = yaw; addDyn(lid);
    const leaf = OE.partMesh(bb => { bb.box(mat, 0, 0, D / 2, W + 0.04, 0.05, D + 0.04); bb.box(OE.MAT.rust, 0, -0.06, D, 0.12, 0.1, 0.02); }); lid.add(leaf);
    const ent = P(0, D / 2 + 0.65), camp = P(0, 0.05);
    const s = H.add({ kind: 'trunk', cat: 'fechado', x, z, y, yaw, entry: ent, colliders: [col], low: true,
      cam: { x: camp.x, y: y + 0.55, z: camp.z, yaw, pitch: 0.12, yawR: 0.3, pitchR: 0.1 }, overlay: 'gap', exposure: 0.1 });
    s.anim = { obj: leaf, axis: 'fn', from: 0, to: 1, fn: k => { leaf.rotation.x = -k * 1.25; leaf.updateMatrix(); lid.updateMatrixWorld(true); } };
    lid.updateMatrixWorld(true); return s;
  };
  // Cabine (banheiro, vestiário, bilheteria): porta de cabine que fecha
  H.stall = function (b, x, z, yaw, o) {
    o = o || {}; const y = o.y || 0, W = o.w || 0.95, D = o.d || 1.3, mat = o.mat || OE.MAT.metalBlue;
    const P = (lx, lz) => rot(x, z, yaw, lx, lz);
    let p = P(-W / 2, 0); b.box(mat, p.x, y + 0.15, p.z, 0.04, 1.9, D, { yaw }); p = P(W / 2, 0); b.box(mat, p.x, y + 0.15, p.z, 0.04, 1.9, D, { yaw });
    // vaso
    p = P(0, -D / 2 + 0.35); b.box(OE.MAT.ceramic, p.x, y, p.z, 0.38, 0.42, 0.5, { yaw, lod: 'detail' }); p = P(0, -D / 2 + 0.1); b.box(OE.MAT.ceramic, p.x, y + 0.42, p.z, 0.42, 0.35, 0.17, { yaw, lod: 'detail', col: false });
    const front = P(0, D / 2), group = new THREE.Group(); group.position.set(front.x, y + 0.15, front.z); group.rotation.y = yaw; addDyn(group);
    const piv = new THREE.Group(); piv.position.set(-W / 2 + 0.02, 0, 0); group.add(piv);
    piv.add(doorLeaf(mat, W - 0.06, 1.75, 0.035, -1));
    const col = b.colBox(front.x, y + 0.15, front.z, W, 1.75, 0.06, yaw, 'hide');
    const ent = P(0, D / 2 + 0.6), camp = P(0, -D / 2 + 0.45);
    const s = H.add({ kind: 'stall', cat: 'fechado', x, z, y, yaw, entry: ent, colliders: [col], exposure: 0.15,
      cam: { x: camp.x, y: y + 1.2, z: camp.z, yaw, pitch: -0.1, yawR: 0.45, pitchR: 0.3 }, overlay: 'gap' });
    s.anim = { obj: piv, axis: 'fn', from: 0, to: 1, fn: k => { piv.rotation.y = -k * 1.5; piv.updateMatrix(); group.updateMatrixWorld(true); } };
    group.updateMatrixWorld(true); return s;
  };
  // Debaixo de cama / mesa / banco (aberto): a câmera fica rente ao chão
  H.under = function (kind, x, z, yaw, y, clear, o) {
    o = o || {}; const ent = rot(x, z, yaw, 0, (o.depth || 0.5) + 0.55), camp = rot(x, z, yaw, 0, o.camOff || -0.05);
    return H.add({ kind, cat: o.cat || 'aberto', x, z, y: y || 0, yaw, entry: ent, low: true, exposure: o.exposure,
      cam: { x: camp.x, y: (y || 0) + Math.min(0.32, clear * 0.55), z: camp.z, yaw, pitch: o.pitch || 0.02, yawR: 0.7, pitchR: 0.12 }, overlay: 'low' });
  };
  // Atrás de algo (cortina, caixas, palco, equipamentos): de pé ou agachado, olhando pela borda
  H.behind = function (kind, x, z, yaw, y, o) {
    o = o || {}; const ent = rot(x, z, yaw, o.side || 0.9, 0.6), camp = rot(x, z, yaw, 0, 0);
    return H.add({ kind, cat: o.cat || 'aberto', x, z, y: y || 0, yaw, entry: ent, low: !!o.crouch, exposure: o.exposure,
      cam: { x: camp.x, y: (y || 0) + (o.crouch ? 0.85 : 1.5), z: camp.z, yaw: yaw + (o.peek || 0), pitch: 0, yawR: 0.6, pitchR: 0.3 }, overlay: o.overlay || null });
  };
  // Dentro de algo com tampa (lixeira, caçamba, caixote): improvisado
  H.inside = function (kind, x, z, yaw, y, o) {
    o = o || {}; const ent = rot(x, z, yaw, 0, (o.depth || 0.6) + 0.6), camp = rot(x, z, yaw, 0, 0);
    const s = H.add({ kind, cat: 'improvisado', x, z, y: y || 0, yaw, entry: ent, low: true, exposure: o.exposure,
      cam: { x: camp.x, y: (y || 0) + (o.camY || 0.7), z: camp.z, yaw, pitch: 0, yawR: 0.4, pitchR: 0.15 }, overlay: o.overlay || 'gap' });
    if (o.lid) s.anim = { obj: o.lid, axis: 'fn', from: 0, to: 1, fn: o.lidFn };
    return s;
  };
})(window.OE);

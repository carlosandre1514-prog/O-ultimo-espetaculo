'use strict';
/* Modo online cooperativo (até 6 jogadores, um adolescente cada).
   - Conexão P2P (WebRTC) via PeerJS; o serviço de "apresentação" é o público e gratuito do PeerJS
     (sem conta, sem servidor próprio). Topologia em estrela: quem CRIA a sala é o anfitrião.
   - O anfitrião manda no Mestre de Cerimônias (IA), e repassa estados e eventos para todos.
   - Cada jogador manda sua posição/olhar/agachado/lanterna/esconderijo ~12x por segundo.
   - Eventos compartilhados: portas (abrir/fechar/destrancar), itens (inventário do grupo), energia,
     documentos lidos, final e fim de jogo, e mortes (todos veem quem foi pego, em 3ª pessoa).
   - O Mestre escolhe a vítima: o jogador visível mais próximo. */
(function (OE) {
  const N = { on: false, host: false, me: null, peers: new Map(), remotes: new Map(), roster: [], code: null };
  OE.Net = N;
  const $ = id => document.getElementById(id), V = (x, y, z) => new THREE.Vector3(x, y, z);
  const PREFIX = 'oe-espetaculo-v1-';
  const peerOpts = () => { const m = location.search.match(/peerhost=([^&:]+):?(\d+)?/); return m ? { host: m[1], port: +(m[2] || 9000), path: '/', secure: false, debug: 1 } : { debug: 1 }; };
  const code4 = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += A[(Math.random() * A.length) | 0]; return s; };

  /* ---------------- sala ---------------- */
  N.create = function () {
    return new Promise((res, rej) => {
      N.code = code4(); const peer = new Peer(PREFIX + N.code, peerOpts()); N.peer = peer; N.host = true; N.on = true;
      peer.on('open', id => { N.me = id; N.roster = [{ id, char: OE.charId(), host: true }]; N.renderLobby(); res(N.code); });
      peer.on('connection', c => N.attach(c));
      peer.on('error', e => { if (e.type === 'unavailable-id') { peer.destroy(); N.create().then(res, rej); } else { N.status('Erro de conexão: ' + e.type); rej(e); } });
    });
  };
  N.join = function (code) {
    return new Promise((res, rej) => {
      const peer = new Peer(undefined, peerOpts()); N.peer = peer; N.host = false; N.on = true; N.code = code.toUpperCase();
      peer.on('open', id => { N.me = id; const c = peer.connect(PREFIX + N.code, { reliable: true }); N.attach(c);
        c.on('open', () => { c.send({ t: 'hello', char: OE.charId() }); res(); }); setTimeout(() => { if (!c.open) { N.status('Sala não encontrada. Confira o código.'); rej(new Error('timeout')); } }, 12000); });
      peer.on('error', e => { N.status(e.type === 'peer-unavailable' ? 'Sala não encontrada. Confira o código.' : 'Erro de conexão: ' + e.type); rej(e); });
    });
  };
  N.attach = function (c) {
    c.on('open', () => { N.peers.set(c.peer, c); });
    c.on('data', d => N.recv(d, c.peer));
    c.on('close', () => { N.peers.delete(c.peer); N.dropRemote(c.peer); if (N.host) { N.roster = N.roster.filter(r => r.id !== c.peer); N.bcast({ t: 'roster', r: N.roster }); N.renderLobby(); } else if (c.peer.startsWith(PREFIX)) { OE.UI && OE.UI.msg('O anfitrião saiu da sala.', 4); } });
  };
  N.send = (d, to) => { if (!N.on) return; if (to) { const c = N.peers.get(to); if (c && c.open) c.send(d); return; } for (const c of N.peers.values()) if (c.open) c.send(d); };
  N.bcast = (d, except) => { for (const [id, c] of N.peers) if (id !== except && c.open) c.send(d); };
  // evento compartilhado: o anfitrião aplica e repassa; o cliente manda para o anfitrião
  N.event = function (ev) { if (!N.on || N.applying) return; ev.t = 'ev'; ev.from = N.me; N.send(ev); };

  N.recv = function (d, from) {
    if (d.t === 'hello' && N.host) {
      // personagem único por jogador: se já estiver em uso, pega o próximo livre
      const used = new Set(N.roster.map(r => r.char)), all = ((OE.Models.manifest && OE.Models.manifest.characters) || []).map(c => c.id);
      let ch = d.char; if (used.has(ch)) ch = all.find(x => !used.has(x)) || ch;
      if (N.roster.length >= 6 || N.started) { N.send({ t: 'full', started: N.started }, from); return; }
      N.roster.push({ id: from, char: ch }); N.bcast({ t: 'roster', r: N.roster }); N.renderLobby(); return;
    }
    if (d.t === 'full') { N.status(d.started ? 'A partida já começou.' : 'A sala está cheia (6 jogadores).'); return; }
    if (d.t === 'roster') { N.roster = d.r; const mine = N.roster.find(r => r.id === N.me); if (mine && mine.char !== OE.charId()) { try { localStorage.setItem('oe.char', mine.char); } catch (e) {} } N.renderLobby(); return; }
    if (d.t === 'start') { N.startGame(); return; }
    if (d.t === 'st') { if (N.host) N.bcast(d, from); N.applyState(d); return; }
    if (d.t === 'en') { N.applyEnemy(d); return; }
    if (d.t === 'ev') { if (N.host) N.bcast(d, from); N.applyEvent(d); return; }
  };

  /* ---------------- saguão (na tela inicial) ---------------- */
  N.status = t => { const e = $('netSt'); if (e) e.textContent = t; };
  N.renderLobby = function () {
    const e = $('netList'); if (!e) return; const m = OE.Models.manifest, nome = id => ((m && m.characters || []).find(c => c.id === id) || {}).nome || id;
    e.innerHTML = N.roster.map(r => '<span' + (r.id === N.me ? ' class="me"' : '') + '>' + nome(r.char) + (r.host ? ' ★' : '') + '</span>').join('');
    N.status(N.host ? 'Sala ' + N.code + ' · passe o código para os amigos · ' + N.roster.length + '/6' : 'Na sala ' + N.code + ' · aguardando o anfitrião começar');
    const go = $('netGo'); if (go) go.style.display = N.host ? '' : 'none';
  };
  N.begin = function () { if (!N.host) return; N.started = true; N.bcast({ t: 'start' }); N.startGame(); };
  N.startGame = function () {
    N.started = true; const G = OE.game;
    if (!G.running) { $('splash').classList.add('off'); G.coop = true; G.start(); }
    // remotos: carrega o personagem de cada um
    N.roster.filter(r => r.id !== N.me).forEach(r => N.ensureRemote(r.id, r.char));
    if (!N.host) G.enemyRemote = true;                // a IA roda só no anfitrião
  };

  /* ---------------- jogadores remotos ---------------- */
  N.ensureRemote = async function (id, char) {
    if (N.remotes.has(id)) return N.remotes.get(id);
    const R = { id, char, pos: V(0, 0, 98), cam: { position: V(0, 1.6, 98) }, yaw: 0, target: V(0, 0, 98), tyaw: 0, mv: 0, crouch: false, flashOn: false, hidden: null, dead: false, local: false, spectator: false, loaded: false };
    N.remotes.set(id, R);
    const c = await OE.Models.loadCharacter(char); if (!c || !N.remotes.has(id)) return R;
    R.obj = c.obj; R.mixer = c.mixer; R.act = c.actions; R.info = c.info; OE.scene.add(R.obj);
    ['idle', 'walk', 'run', 'crouch', 'torch'].forEach(k => { const a = R.act[k]; if (a) { a.play(); a.setEffectiveWeight(k === 'idle' ? 1 : 0); } });
    // feixe de lanterna visível (sem luz real: o número de luzes não muda)
    const bm = OE.Lights.beam.clone(); bm.material = OE.Lights.beamMat.clone(); bm.position.set(0.25, 1.35, 0.3); bm.rotation.set(0, Math.PI, 0); R.beam = bm; R.obj.add(bm);
    R.tag = N.nameTag(R.info ? R.info.nome : char); R.tag.position.y = 2.05; R.obj.add(R.tag);
    R.loaded = true; return R;
  };
  N.nameTag = function (txt) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 48; const x = cv.getContext('2d');
    x.font = 'bold 28px Georgia'; x.textAlign = 'center'; x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(48, 6, 160, 36); x.fillStyle = '#f0d8a0'; x.fillText(txt, 128, 34);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true, fog: false })); s.scale.set(0.9, 0.17, 1); return s;
  };
  N.dropRemote = function (id) { const R = N.remotes.get(id); if (R && R.obj) OE.scene.remove(R.obj); N.remotes.delete(id); };
  N.applyState = function (d) {
    const R = N.remotes.get(d.id) || (N.started ? null : null); if (!R) { const r = N.roster.find(x => x.id === d.id); if (r && N.started) N.ensureRemote(d.id, r.char); return; }
    R.target.set(d.p[0], d.p[1], d.p[2]); R.tyaw = d.y; R.mv = d.mv; R.crouch = d.c; R.run = d.r; R.flashOn = d.f; R.dead = d.dead;
    R.hidden = d.h >= 0 ? OE.Hiding.spots[d.h] : null;
    if (R.hidden) R.hidden.remoteOcc = d.id; OE.Hiding.spots.forEach(s => { if (s.remoteOcc === d.id && s !== R.hidden) s.remoteOcc = null; });
  };
  N.updateRemotes = function (dt) {
    for (const R of N.remotes.values()) {
      R.pos.lerp(R.target, Math.min(1, dt * 10)); let dy = R.tyaw - R.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; R.yaw += dy * Math.min(1, dt * 10);
      R.cam.position.set(R.pos.x, R.pos.y + (R.crouch ? 0.86 : 1.62), R.pos.z);
      if (!R.loaded) continue; const o = R.obj; o.visible = !R.hidden && !R.gone;
      if (!R.killAnim) { o.position.copy(R.pos); o.rotation.y = R.yaw + Math.PI; }
      const a = R.act, mv = R.mv || 0, k = Math.min(1, dt * 8);
      const want = R.killAnim ? {} : { idle: mv < 0.2 && !R.crouch ? 1 : 0, walk: mv >= 0.2 && mv < 3.4 && !R.crouch && !R.flashOn ? 1 : 0, torch: mv >= 0.2 && mv < 3.4 && !R.crouch && R.flashOn ? 1 : 0, run: mv >= 3.4 ? 1 : 0, crouch: R.crouch ? 1 : 0 };
      for (const n of ['idle', 'walk', 'run', 'crouch', 'torch']) if (a[n]) a[n].setEffectiveWeight(a[n].getEffectiveWeight() + ((want[n] || 0) - a[n].getEffectiveWeight()) * k);
      if (a.walk) a.walk.timeScale = Math.max(0.6, mv / 2.2);
      R.mixer.update(dt); R.beam.visible = R.flashOn && !R.dead; R.beam.material.uniforms.uStr.value = 0.22;
    }
  };

  /* ---------------- envio do meu estado ---------------- */
  N.tick = function (dt) {
    if (!N.on || !N.started) return; const G = OE.game, P = G.player; N.acc = (N.acc || 0) + dt; N.updateRemotes(dt);
    if (N.acc < 1 / 12) return; N.acc = 0;
    const h = P.hidden ? OE.Hiding.spots.indexOf(P.hidden) : -1;
    N.send({ t: 'st', id: N.me, p: [+P.pos.x.toFixed(2), +P.pos.y.toFixed(2), +P.pos.z.toFixed(2)], y: +P.yaw.toFixed(3), mv: +(P.moving || 0).toFixed(2), c: P.crouch, r: P.running, f: G.flashOn, h, dead: !!G.dying });
    if (N.host && G.enemy) { const E = G.enemy; N.bcast({ t: 'en', p: [+E.pos.x.toFixed(2), +E.pos.y.toFixed(2), +E.pos.z.toFixed(2)], y: +E.yaw.toFixed(3), s: E.state, v: E.lastSpeed || 0, o: E.oneShotName || null }); }
  };
  // cliente: o Mestre vem do anfitrião (interpolado)
  N.applyEnemy = function (d) { const E = OE.game.enemy; if (!E) return; E.netTarget = V(d.p[0], d.p[1], d.p[2]); E.netYaw = d.y; E.state = d.s; E.netSpeed = d.v; if (d.o && d.o !== E.netOne) { E.netOne = d.o; E.playOnce(d.o); } else if (!d.o) E.netOne = null; };
  N.driveEnemy = function (dt) {
    const E = OE.game.enemy; if (!E || !E.netTarget || OE.game.dying) return;
    const before = E.pos.clone(); E.pos.lerp(E.netTarget, Math.min(1, dt * 8)); let dy = E.netYaw - E.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; E.yaw += dy * Math.min(1, dt * 8);
    E.moved = before.distanceTo(E.pos); E.animate(dt, E.netSpeed || 0);
  };

  /* ---------------- eventos compartilhados ---------------- */
  N.applyEvent = function (d) {
    N.applying = true;
    try {
      const S = OE.Story;
      if (d.k === 'door') { const door = OE.doors[d.i]; if (door) { door.lock = d.lock; if (door.toggle && d.open !== door.open) { if (d.open) { door.opens = d.dir || door.opens; door.target = door.maxAng; door.open = true; } else { door.target = 0; door.open = false; } OE.Audio.play(door.kind === 'metal' || door.kind === 'bars' ? 'metal' : 'door', door.pos, 0.7); } else if (door.setOpen && d.open !== door.open) door.setOpen(d.open); } }
      else if (d.k === 'item') { OE.state.items.add(d.id); OE.UI.inventory(); OE.UI.msg((d.nome || 'Alguém') + ' pegou: ' + (OE.ITEMS[d.id] || d.id), 3); }
      else if (d.k === 'itemDel') { OE.state.items.delete(d.id); OE.UI.inventory(); }
      else if (d.k === 'power') { if (!OE.state.power) { OE.state.power = true; OE.emit('power', true); OE.UI.msg('Alguém ligou o gerador. As luzes voltaram.', 4); } }
      else if (d.k === 'doc') { if (!S.found.has(d.id)) { S.found.add(d.id); S.renderJournal(); OE.UI.msg('Documento encontrado pelo grupo: ' + (S.docs.get(d.id) || {}).title, 3); } }
      else if (d.k === 'final') { if (!S.final) S.breakBox(true); }
      else if (d.k === 'end') { if (!S.ended) S.ending(d.good); }
      else if (d.k === 'kill') N.onKill(d);
    } finally { N.applying = false; }
  };
  // Morte: a vítima vê a sequência em 1ª pessoa; os outros veem em 3ª pessoa.
  N.onKill = function (d) {
    const G = OE.game;
    if (d.victim === N.me) { G.caught(); return; }
    const R = N.remotes.get(d.victim); if (!R || !R.loaded) return;
    R.killAnim = true; const a = R.act; Object.values(a).forEach(x => x.setEffectiveWeight(0));
    if (a.strangled) { a.strangled.reset(); a.strangled.setEffectiveWeight(1); a.strangled.play(); }
    OE.Audio.play('crack', { x: R.pos.x, y: 1.5, z: R.pos.z }, 1);
    setTimeout(() => { if (a.dead) { a.strangled && a.strangled.setEffectiveWeight(0); a.dead.reset(); a.dead.setEffectiveWeight(1); a.dead.play(); } for (let i = 0; i < 5; i++) setTimeout(() => OE.Audio.play('stab', { x: R.pos.x, y: 0.5, z: R.pos.z }, 0.9), 400 + i * 700); }, 2200);
    setTimeout(() => { R.killAnim = false; if (a.dead) a.dead.setEffectiveWeight(0); }, 9000);
    OE.UI.msg((R.info ? R.info.nome : 'Alguém') + ' foi pego pelo Mestre de Cerimônias.', 4);
  };
  // Alvos do Mestre: eu + remotos vivos
  N.targets = function () {
    const G = OE.game, list = [Object.assign(G.player, { local: true, id: N.me || 'local', flashOn: G.flashOn, dead: G.dying })];
    if (N.on) for (const R of N.remotes.values()) if (!R.dead && !R.killAnim) list.push(R);
    return list;
  };
  N.leave = function () { try { N.peer && N.peer.destroy(); } catch (e) {} N.on = false; };
})(window.OE);

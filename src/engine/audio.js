'use strict';
/* Áudio 100% sintetizado (WebAudio): vento, zumbido grave, caixinha de música distante,
   rangidos, passos, metal, gerador e respiração. Sons posicionais com PannerNode. */
(function (OE) {
  const A = { ctx: null, master: null, ok: false };
  OE.Audio = A;
  let noiseBuf = null;
  A.init = function () {
    if (A.ctx) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = A.ctx = new AC(); A.master = ctx.createGain(); A.master.gain.value = 0.8; A.master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    A.ok = true; ambience();
  };
  function noise(loop) { const s = A.ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = !!loop; return s; }
  function out(pos, vol) {
    const g = A.ctx.createGain(); g.gain.value = vol;
    if (pos) { const p = A.ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 2; p.rolloffFactor = 1.4; p.maxDistance = 80;
      p.positionX ? (p.positionX.value = pos.x, p.positionY.value = pos.y, p.positionZ.value = pos.z) : p.setPosition(pos.x, pos.y, pos.z);
      g.connect(p); p.connect(A.master); } else g.connect(A.master);
    return g;
  }
  function ambience() {
    const ctx = A.ctx;
    // vento: ruído filtrado com varredura lenta
    const w = noise(true), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 380; f.Q.value = 0.6;
    const wg = ctx.createGain(); wg.gain.value = 0.05; const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 220;
    lfo.connect(lg); lg.connect(f.frequency); w.connect(f); f.connect(wg); wg.connect(A.master); w.start(); lfo.start(); A.wind = wg;
    // zumbido grave
    const dg = ctx.createGain(); dg.gain.value = 0.035; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160; lp.connect(dg); dg.connect(A.master);
    [41.2, 41.7, 61.7].forEach(fr => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(lp); o.start(); });
    A.drone = dg;
    setInterval(() => { if (A.ctx.state === 'running' && Math.random() < 0.35) musicBox(); }, 26000);
    setInterval(() => { if (A.ctx.state === 'running' && Math.random() < 0.5 && OE.game) { const p = OE.game.player.pos; A.play('creak', { x: p.x + (Math.random() - 0.5) * 30, y: 2, z: p.z + (Math.random() - 0.5) * 30 }, 0.5); } }, 9000);
  }
  // Melodia de caixinha de música, desafinada, vindo de um ponto aleatório distante.
  function musicBox() {
    const ctx = A.ctx, p = OE.game ? OE.game.player.pos : { x: 0, z: 0 }, ang = Math.random() * 6.28;
    const g = out({ x: p.x + Math.cos(ang) * 25, y: 3, z: p.z + Math.sin(ang) * 25 }, 0.5);
    const notes = [76, 74, 72, 74, 76, 76, 76, 74, 74, 74, 76, 79, 79], t0 = ctx.currentTime + 0.1;
    notes.forEach((n, i) => { const t = t0 + i * 0.42 * (1 + i * 0.03); const o = ctx.createOscillator(), e = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 440 * Math.pow(2, (n - 69) / 12) * (1 - i * 0.004); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.18, t + 0.01); e.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      o.connect(e); e.connect(g); o.start(t); o.stop(t + 1.3); });
  }
  A.play = function (name, pos, vol) {
    if (!A.ok || A.ctx.state !== 'running') return; const ctx = A.ctx, t = ctx.currentTime, v = vol === undefined ? 1 : vol;
    const env = (node, a, d, peak) => { node.gain.setValueAtTime(0, t); node.gain.linearRampToValueAtTime(peak, t + a); node.gain.exponentialRampToValueAtTime(0.001, t + a + d); };
    if (name === 'step' || name === 'stepMetal' || name === 'stepWood' || name === 'enemyStep') {
      const s = noise(), f = ctx.createBiquadFilter(), e = ctx.createGain(); f.type = name === 'stepMetal' ? 'bandpass' : 'lowpass';
      f.frequency.value = name === 'stepMetal' ? 1800 : name === 'enemyStep' ? 220 : name === 'stepWood' ? 700 : 450; f.Q.value = 2;
      env(e, 0.005, name === 'enemyStep' ? 0.25 : 0.12, (name === 'enemyStep' ? 0.9 : 0.3) * v); s.connect(f); f.connect(e); e.connect(out(pos, 1)); s.start(t, Math.random()); s.stop(t + 0.4);
    } else if (name === 'creak' || name === 'door') {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), e = ctx.createGain(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(70 + Math.random() * 40, t); o.frequency.linearRampToValueAtTime(140 + Math.random() * 120, t + 0.6); o.frequency.linearRampToValueAtTime(90, t + 1.0);
      f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 8; env(e, 0.08, 1.0, 0.22 * v); o.connect(f); f.connect(e); e.connect(out(pos, 1)); o.start(t); o.stop(t + 1.2);
    } else if (name === 'metal' || name === 'can' || name === 'locked') {
      const g = out(pos, 1); [1, 2.76, 5.4, 8.9].forEach((m, i) => { const o = ctx.createOscillator(), e = ctx.createGain(); o.frequency.value = (name === 'can' ? 900 : 320) * m;
        env(e, 0.002, name === 'locked' ? 0.2 : 0.9 / (i + 1), 0.12 * v / (i + 1)); o.connect(e); e.connect(g); o.start(t); o.stop(t + 1.2); });
      if (name === 'locked') { const o = ctx.createOscillator(), e = ctx.createGain(); o.type = 'square'; o.frequency.value = 60; env(e, 0.01, 0.15, 0.06 * v); o.connect(e); e.connect(g); o.start(t + 0.1); o.stop(t + 0.4); }
    } else if (name === 'click' || name === 'switch') {
      const s = noise(), e = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2000; env(e, 0.001, 0.05, 0.4 * v); s.connect(f); f.connect(e); e.connect(out(pos, 1)); s.start(t); s.stop(t + 0.1);
    } else if (name === 'generator') {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), e = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = 48; o2.type = 'square'; o2.frequency.value = 24;
      f.type = 'lowpass'; f.frequency.value = 400; e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.25 * v, t + 1.5);
      o.connect(f); o2.connect(f); f.connect(e); e.connect(out(pos, 1)); o.start(t); o2.start(t); A.genLoop = { o, o2, e };
    } else if (name === 'sting') { // susto sonoro discreto quando o inimigo te vê
      const g = out(null, 1); [55, 58.3, 82.4].forEach(fr => { const o = ctx.createOscillator(), e = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = fr * 2; env(e, 0.05, 2.5, 0.08 * v); o.connect(e); e.connect(g); o.start(t); o.stop(t + 2.6); });
    } else if (name === 'heart') {
      const g = out(null, 1); [0, 0.22].forEach(dt => { const o = ctx.createOscillator(), e = ctx.createGain(); o.frequency.value = 52; e.gain.setValueAtTime(0, t + dt); e.gain.linearRampToValueAtTime(0.5 * v, t + dt + 0.02); e.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.18); o.connect(e); e.connect(g); o.start(t + dt); o.stop(t + dt + 0.2); });
    } else if (name === 'breath') {
      const s = noise(), f = ctx.createBiquadFilter(), e = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 0.8;
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.05 * v, t + 0.7); e.gain.linearRampToValueAtTime(0, t + 1.6); s.connect(f); f.connect(e); e.connect(out(null, 1)); s.start(t); s.stop(t + 1.7);
    }
  };
  A.listener = function (cam) {
    if (!A.ok) return; const l = A.ctx.listener, p = cam.position, f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    if (l.positionX) { l.positionX.value = p.x; l.positionY.value = p.y; l.positionZ.value = p.z; l.forwardX.value = f.x; l.forwardY.value = f.y; l.forwardZ.value = f.z; l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0; }
    else { l.setPosition(p.x, p.y, p.z); l.setOrientation(f.x, f.y, f.z, 0, 1, 0); }
  };
})(window.OE);

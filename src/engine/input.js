'use strict';
/* Entrada.
   PC: teclado + mouse (pointer lock).
   Celular — jogo SEMPRE na horizontal: se o aparelho estiver em pé, a tela do jogo é girada 90° (não
   pedimos para virar o telefone). Toques são convertidos para as coordenadas do jogo.
   Analógico flutuante: a zona é 60% da metade esquerda da tela (30% da largura). Onde o dedo tocar,
   a base aparece e FICA PARADA; só a bolinha acompanha o dedo (limitada à borda da base).
   Levar a bolinha até a borda = correr (como nos jogos de tiro mobile). O resto da tela olha. */
(function (OE) {
  const I = { keys: {}, move: { x: 0, y: 0 }, lookX: 0, lookY: 0, edges: new Set(), run: false, touch: false, sens: 0.0022, touchSens: 0.0062, stickRun: false };
  OE.Input = I;
  const KEYMAP = { KeyE: 'interact', KeyF: 'light', KeyC: 'crouch', ControlLeft: 'crouch', Space: 'jump', KeyV: 'spectator', F3: 'debug', KeyM: 'debugMap', Escape: 'pause' };
  I.press = a => I.edges.add(a);
  I.pressed = a => { if (I.edges.has(a)) { I.edges.delete(a); return true; } return false; };
  I.endFrame = () => { I.edges.clear(); I.lookX = 0; I.lookY = 0; };
  const STICK_ZONE = 0.30, R = 58;

  /* ---- tela sempre deitada ---- */
  const V = OE.view = { w: innerWidth, h: innerHeight, rot: false };
  function layout() {
    const root = document.getElementById('root'), portrait = innerHeight > innerWidth && (I.touch || matchMedia('(pointer: coarse)').matches);
    V.rot = portrait; V.w = portrait ? innerHeight : innerWidth; V.h = portrait ? innerWidth : innerHeight;
    root.style.width = V.w + 'px'; root.style.height = V.h + 'px';
    root.style.transform = portrait ? `translateX(${innerWidth}px) rotate(90deg)` : '';
    OE.emit('viewResize', V);
  }
  I.layout = layout;
  // cliente (tela física) -> coordenadas do jogo
  I.toGame = (cx, cy) => (V.rot ? { x: cy, y: innerWidth - cx } : { x: cx, y: cy });
  I.lockLandscape = function () {
    const el = document.documentElement;
    const lock = () => { try { const p = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
    try { const p = el.requestFullscreen && el.requestFullscreen({ navigationUI: 'hide' }); if (p && p.then) p.then(lock).catch(() => {}); else lock(); } catch (e) {}
  };

  I.init = function (canvas) {
    addEventListener('resize', layout); addEventListener('orientationchange', () => setTimeout(layout, 120)); layout();
    addEventListener('keydown', e => {
      if (e.repeat) return; I.keys[e.code] = true;
      const a = KEYMAP[e.code]; if (a) { I.press(a); if (e.code === 'F3' || e.code === 'Space') e.preventDefault(); }
    });
    addEventListener('keyup', e => { I.keys[e.code] = false; });
    addEventListener('blur', () => { I.keys = {}; });
    canvas.addEventListener('click', () => { if (!I.touch && OE.game && OE.game.running && document.pointerLockElement !== canvas) canvas.requestPointerLock && canvas.requestPointerLock(); });
    addEventListener('mousemove', e => { if (document.pointerLockElement === canvas) { I.lookX += e.movementX * I.sens; I.lookY += e.movementY * I.sens; } });

    // ----- toque -----
    const stick = document.getElementById('stick'), knob = document.getElementById('knob'), zone = document.getElementById('stickZone');
    let stickId = null, sx = 0, sy = 0, lookId = null, lx = 0, ly = 0;
    const setTouch = () => { if (!I.touch) { I.touch = true; document.body.classList.add('touch'); layout(); } };
    canvas.addEventListener('touchstart', e => {
      setTouch();
      for (const t of e.changedTouches) {
        const g = I.toGame(t.clientX, t.clientY);
        if (g.x < V.w * STICK_ZONE && stickId === null) {
          stickId = t.identifier; sx = g.x; sy = g.y;
          stick.style.left = (sx - 70) + 'px'; stick.style.top = (sy - 70) + 'px'; stick.classList.add('on'); knob.style.transform = '';
        } else if (lookId === null) { lookId = t.identifier; lx = g.x; ly = g.y; }
      }
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        const g = I.toGame(t.clientX, t.clientY);
        if (t.identifier === stickId) {
          let dx = g.x - sx, dy = g.y - sy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
          I.move.x = dx / R; I.move.y = -dy / R; I.stickRun = d > R * 1.25;            // passou da borda: corre
          knob.style.transform = `translate(${dx}px,${dy}px)`; stick.classList.toggle('run', I.stickRun);
        } else if (t.identifier === lookId) { I.lookX += (g.x - lx) * I.touchSens; I.lookY += (g.y - ly) * I.touchSens; lx = g.x; ly = g.y; }
      }
      e.preventDefault();
    }, { passive: false });
    const end = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) { stickId = null; I.move.x = I.move.y = 0; I.stickRun = false; knob.style.transform = ''; stick.classList.remove('on', 'run'); }
        if (t.identifier === lookId) lookId = null;
      }
    };
    canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
    if (zone) zone.style.width = (STICK_ZONE * 100) + '%';
    document.querySelectorAll('[data-act]').forEach(b => {
      b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); setTouch(); const a = b.dataset.act;
        if (a === 'run') { I.runToggle = !I.runToggle; b.classList.toggle('on', I.runToggle); } else I.press(a); }, { passive: false });
      b.addEventListener('click', e => { if (I.touch) return; const a = b.dataset.act; if (a !== 'run') I.press(a); });
    });
  };
  // Vetor de movimento do frame (teclado ou analógico)
  I.axes = function () {
    let x = I.move.x, y = I.move.y;
    if (I.keys.KeyW || I.keys.ArrowUp) y += 1; if (I.keys.KeyS || I.keys.ArrowDown) y -= 1;
    if (I.keys.KeyD || I.keys.ArrowRight) x += 1; if (I.keys.KeyA || I.keys.ArrowLeft) x -= 1;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y, run: I.keys.ShiftLeft || I.keys.ShiftRight || I.stickRun || (I.runToggle && Math.hypot(I.move.x, I.move.y) > 0.6) };
  };
})(window.OE);

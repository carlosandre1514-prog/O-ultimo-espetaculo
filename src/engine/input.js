'use strict';
/* Entrada: teclado + mouse (pointer lock) no PC; analógico virtual + arrastar para olhar + botões no celular. */
(function (OE) {
  const I = { keys: {}, move: { x: 0, y: 0 }, lookX: 0, lookY: 0, edges: new Set(), run: false, touch: false, sens: 0.0022, touchSens: 0.0058 };
  OE.Input = I;
  const KEYMAP = { KeyE: 'interact', KeyF: 'light', KeyC: 'crouch', ControlLeft: 'crouch', KeyV: 'spectator', F3: 'debug', KeyM: 'debugMap', Escape: 'pause' };
  I.press = a => I.edges.add(a);
  I.pressed = a => { if (I.edges.has(a)) { I.edges.delete(a); return true; } return false; };
  I.endFrame = () => { I.edges.clear(); I.lookX = 0; I.lookY = 0; };

  I.init = function (canvas) {
    addEventListener('keydown', e => {
      if (e.repeat) return; I.keys[e.code] = true;
      const a = KEYMAP[e.code]; if (a) { I.press(a); if (e.code === 'F3') e.preventDefault(); }
    });
    addEventListener('keyup', e => { I.keys[e.code] = false; });
    addEventListener('blur', () => { I.keys = {}; });
    canvas.addEventListener('click', () => { if (!I.touch && OE.game && OE.game.running && document.pointerLockElement !== canvas) canvas.requestPointerLock && canvas.requestPointerLock(); });
    addEventListener('mousemove', e => { if (document.pointerLockElement === canvas) { I.lookX += e.movementX * I.sens; I.lookY += e.movementY * I.sens; } });

    // ----- toque -----
    const stick = document.getElementById('stick'), knob = document.getElementById('knob');
    let stickId = null, sx = 0, sy = 0, lookId = null, lx = 0, ly = 0;
    const R = 56;
    canvas.addEventListener('touchstart', e => {
      I.touch = true; document.body.classList.add('touch');
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth * 0.42 && stickId === null) { stickId = t.identifier; sx = t.clientX; sy = t.clientY;
          stick.style.left = (sx - 70) + 'px'; stick.style.top = (sy - 70) + 'px'; stick.classList.add('on'); }
        else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
      }
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) {
          let dx = t.clientX - sx, dy = t.clientY - sy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
          I.move.x = dx / R; I.move.y = -dy / R; I.run = d > R * 0.98 && I.runToggle; knob.style.transform = `translate(${dx}px,${dy}px)`;
        } else if (t.identifier === lookId) { I.lookX += (t.clientX - lx) * I.touchSens; I.lookY += (t.clientY - ly) * I.touchSens; lx = t.clientX; ly = t.clientY; }
      }
      e.preventDefault();
    }, { passive: false });
    const end = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) { stickId = null; I.move.x = I.move.y = 0; knob.style.transform = ''; stick.classList.remove('on'); }
        if (t.identifier === lookId) lookId = null;
      }
    };
    canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
    document.querySelectorAll('[data-act]').forEach(b => {
      b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); const a = b.dataset.act;
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
    return { x, y, run: I.keys.ShiftLeft || I.keys.ShiftRight || (I.runToggle && Math.hypot(I.move.x, I.move.y) > 0.9) };
  };
})(window.OE);

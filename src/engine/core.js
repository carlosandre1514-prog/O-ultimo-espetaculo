'use strict';
/* O Último Espetáculo · núcleo: namespace, aleatório com semente, ruído, utilidades. */
window.OE = window.OE || {};
(function (OE) {
  OE.V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  OE.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  OE.lerp = (a, b, t) => a + (b - a) * t;
  OE.smooth = t => t * t * (3 - 2 * t);
  OE.DEG = Math.PI / 180;

  // Gerador com semente: o mapa sai idêntico a cada carga (colisões e navegação previsíveis).
  OE.rng = function (seed) {
    let s = seed >>> 0;
    const f = function () { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.range = (a, b) => a + (b - a) * f();
    f.int = (a, b) => Math.floor(a + (b - a + 1) * f());
    f.pick = arr => arr[Math.floor(f() * arr.length)];
    f.chance = p => f() < p;
    return f;
  };
  OE.R = OE.rng(1997);

  // Ruído de valor periódico (as texturas se repetem sem emenda).
  OE.makeNoise = function (seed, period) {
    const r = OE.rng(seed), P = period, g = new Float32Array(P * P);
    for (let i = 0; i < g.length; i++) g[i] = r();
    const at = (x, y) => g[((y % P + P) % P) * P + ((x % P + P) % P)];
    return function (x, y) {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = OE.smooth(xf), v = OE.smooth(yf);
      const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  };
  // fbm periódico: x,y em [0,1)
  OE.fbm = function (seed, baseFreq, oct) {
    const ns = [];
    for (let o = 0; o < oct; o++) ns.push(OE.makeNoise(seed + o * 131, baseFreq << o));
    return function (x, y) {
      let s = 0, a = 0.5, n = 0;
      for (let o = 0; o < oct; o++) { const f = baseFreq << o; s += a * ns[o](x * f, y * f); n += a; a *= 0.5; }
      return s / n;
    };
  };

  // Eventos simples entre sistemas (ruído, energia, captura).
  const listeners = {};
  OE.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
  OE.emit = (ev, data) => { (listeners[ev] || []).forEach(fn => fn(data)); };

  OE.log = (...a) => { if (OE.debug) console.log('[OE]', ...a); };
  OE.state = { time: 0, power: false, items: new Set() };
})(window.OE);

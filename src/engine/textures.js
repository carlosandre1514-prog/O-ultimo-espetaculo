'use strict';
/* Texturas procedurais (canvas) e materiais compartilhados.
   Tudo é gerado na carga: nenhum download, ladrilhamento sem emenda, deterioração pintada
   (ferrugem, tinta descascando, umidade, rachaduras, rasgos). Um material por superfície,
   reaproveitado pelo mapa inteiro; a variação por objeto vem das cores por vértice. */
(function (OE) {
  const TEX = {};
  const S_HI = OE.Q.tex, S_LO = Math.min(256, OE.Q.tex);   // nível de gráfico decide o tamanho

  function canvas(S) { const c = document.createElement('canvas'); c.width = c.height = S; return c; }
  function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  // Preenche pixel a pixel. fn(u,v) -> [r,g,b] ou [r,g,b,a] (0..255)
  function paint(S, fn) {
    const c = canvas(S), ctx = c.getContext('2d'), img = ctx.createImageData(S, S), d = img.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const p = fn(x / S, y / S), i = (y * S + x) * 4;
      d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = p.length > 3 ? p[3] : 255;
    }
    ctx.putImageData(img, 0, 0); return c;
  }
  function cracks(ctx, S, n, seed, color, width) {
    const r = OE.rng(seed); ctx.strokeStyle = color; ctx.lineCap = 'round';
    for (let k = 0; k < n; k++) {
      let x = r() * S, y = r() * S, a = r() * 6.28; ctx.lineWidth = width * (0.5 + r());
      ctx.beginPath(); ctx.moveTo(x, y);
      const len = 6 + r() * 14;
      for (let s = 0; s < len; s++) { a += (r() - 0.5) * 1.2; x += Math.cos(a) * S * 0.02; y += Math.sin(a) * S * 0.02; ctx.lineTo(x, y);
        if (r() < 0.12) { ctx.moveTo(x, y); } }
      ctx.stroke();
    }
  }

  const P = {}; // pintores
  P.wood = (S, tone) => {
    const g = OE.fbm(11, 2, 4), grain = OE.fbm(12, 4, 3), base = hex(tone || '#6e5c48');
    const c = paint(S, (u, v) => {
      const board = Math.floor(v * 8), bv = v * 8 - board, seam = bv < 0.035 || bv > 0.965 ? 0.45 : 1;
      const knot = grain((u * 0.25 + board * 0.37) % 1, (v * 4 + board * 0.13) % 1);
      const gr = 0.75 + 0.35 * Math.sin((u * 40 + knot * 9 + board * 3) * 1.0) * 0.5 + 0.25 * g(u, v);
      const weather = 0.8 + 0.4 * g((u + board * 0.21) % 1, v);
      const b = (0.88 + ((board * 37) % 7) * 0.035) * gr * weather * seam;
      const gray = mix(base, [118, 112, 104], 0.35 * g(v, u));
      return [gray[0] * b, gray[1] * b, gray[2] * b];
    });
    cracks(c.getContext('2d'), S, 10, 3, 'rgba(20,14,8,0.5)', 1.2);
    return c;
  };
  P.paintedWood = (S, paintHex, seed) => {
    const wood = P.wood(S), wd = wood.getContext('2d').getImageData(0, 0, S, S).data;
    const peel = OE.fbm(seed || 21, 3, 5), dirt = OE.fbm((seed || 21) + 5, 2, 4), col = hex(paintHex);
    return paint(S, (u, v) => {
      const i = ((v * S | 0) * S + (u * S | 0)) * 4, w = [wd[i], wd[i + 1], wd[i + 2]];
      const p = peel(u, v), board = (v * 8) % 1, seam = board < 0.03 || board > 0.97 ? 0.55 : 1;
      if (p < 0.43) return w;                                    // tinta caiu: madeira exposta
      const edge = p < 0.47 ? 0.7 : 1, d = 0.72 + 0.4 * dirt(u, v) - 0.25 * Math.max(0, v - 0.7);
      const pc = mix(col, [200, 190, 170], 0.15);
      return [pc[0] * edge * d * seam, pc[1] * edge * d * seam, pc[2] * edge * d * seam];
    });
  };
  P.rust = (S) => {
    const g = OE.fbm(31, 3, 5), s = OE.fbm(32, 6, 3);
    return paint(S, (u, v) => {
      const r = g(u, v), streak = s(u * 1, v * 0.15 % 1);
      let c = mix([62, 60, 58], [92, 86, 80], s(u, v));
      if (r > 0.5) c = mix(c, [128, 62, 28], OE.clamp((r - 0.5) * 4, 0, 1));
      if (r > 0.62) c = mix(c, [86, 40, 18], OE.clamp((r - 0.62) * 5, 0, 1));
      c = mix(c, [110, 55, 25], OE.clamp((streak - 0.55) * 2, 0, 0.6) * v);
      return c;
    });
  };
  P.paintedMetal = (S, paintHex, seed) => {
    const rust = P.rust(S), rd = rust.getContext('2d').getImageData(0, 0, S, S).data;
    const peel = OE.fbm(seed, 4, 5), col = hex(paintHex), dirt = OE.fbm(seed + 3, 2, 3);
    return paint(S, (u, v) => {
      const i = ((v * S | 0) * S + (u * S | 0)) * 4, p = peel(u, v);
      if (p < 0.4) return [rd[i], rd[i + 1], rd[i + 2]];
      const d = 0.75 + 0.35 * dirt(u, v), e = p < 0.44 ? 0.75 : 1;
      return [col[0] * d * e, col[1] * d * e, col[2] * d * e];
    });
  };
  P.concrete = (S, tone, seed) => {
    const g = OE.fbm(seed || 41, 4, 5), st = OE.fbm((seed || 41) + 1, 2, 3), base = hex(tone || '#7a7874');
    const c = paint(S, (u, v) => {
      const n = 0.8 + 0.3 * g(u, v), stain = OE.clamp((st(u, v) - 0.55) * 3, 0, 0.5) + OE.clamp((v - 0.75) * 1.6, 0, 0.35);
      const k = n * (1 - stain * 0.6);
      return [base[0] * k, base[1] * k * 0.99, base[2] * k * 0.96];
    });
    cracks(c.getContext('2d'), S, 7, seed || 41, 'rgba(25,25,25,0.6)', 1.4);
    return c;
  };
  P.plaster = (S, tone, seed) => {
    const g = OE.fbm(seed, 3, 5), damp = OE.fbm(seed + 2, 2, 4), peel = OE.fbm(seed + 4, 5, 4), base = hex(tone);
    const c = paint(S, (u, v) => {
      let col = mix(base, [base[0] * 0.85, base[1] * 0.85, base[2] * 0.8], g(u, v));
      const wet = OE.clamp((v - 0.55) * 2.2 + (damp(u, v) - 0.5) * 1.6, 0, 1);       // umidade subindo do chão
      col = mix(col, [96, 82, 60], wet * 0.7);
      const tide = Math.abs(wet - 0.5) < 0.04 ? 0.8 : 1; col = [col[0] * tide, col[1] * tide, col[2] * tide];
      if (peel(u, v) > 0.68) col = mix(col, [120, 116, 108], 0.8);                     // reboco exposto
      return col;
    });
    cracks(c.getContext('2d'), S, 6, seed, 'rgba(40,32,24,0.55)', 1);
    return c;
  };
  P.wallpaper = (S, a, b, seed) => {
    const pl = P.plaster(S, '#a99c84', seed), pd = pl.getContext('2d').getImageData(0, 0, S, S).data;
    const tear = OE.fbm(seed + 9, 3, 5), dirt = OE.fbm(seed + 7, 2, 3), ca = hex(a), cb = hex(b);
    return paint(S, (u, v) => {
      const i = ((v * S | 0) * S + (u * S | 0)) * 4;
      if (tear(u, v) > 0.66 && v > 0.15) return [pd[i], pd[i + 1], pd[i + 2]];
      const x = (u * 6) % 1, y = (v * 6) % 1;
      const motif = Math.abs(Math.sin((x - 0.5) * 3.14) * 0.32 - Math.abs(y - 0.5)) < 0.06 || ((x - 0.5) ** 2 + (y - 0.5) ** 2 < 0.012);
      const stripe = Math.abs(((u * 12) % 1) - 0.5) < 0.03;
      let col = motif ? cb : ca; if (stripe) col = mix(col, cb, 0.5);
      const d = 0.7 + 0.35 * dirt(u, v) - OE.clamp((v - 0.7), 0, 0.3);
      return [col[0] * d, col[1] * d, col[2] * d];
    });
  };
  P.tiles = (S, tone, n, seed) => {
    const dirt = OE.fbm(seed, 3, 4), base = hex(tone);
    const c = paint(S, (u, v) => {
      const x = (u * n) % 1, y = (v * n) % 1, grout = x < 0.05 || y < 0.05;
      const tile = Math.floor(u * n) * 7 + Math.floor(v * n) * 13, var_ = 0.9 + (tile % 5) * 0.025;
      const d = 0.75 + 0.3 * dirt(u, v);
      if (grout) return [70 * d, 66 * d, 58 * d];
      return [base[0] * var_ * d, base[1] * var_ * d, base[2] * var_ * d];
    });
    cracks(c.getContext('2d'), S, 4, seed, 'rgba(30,30,30,0.6)', 1);
    return c;
  };
  P.brick = (S) => {
    const g = OE.fbm(51, 4, 4);
    return paint(S, (u, v) => {
      const row = Math.floor(v * 8), x = (u * 4 + (row % 2) * 0.5) % 1, y = (v * 8) % 1;
      if (y < 0.08 || x < 0.04) return [88, 84, 78];
      const id = (Math.floor(u * 4 + (row % 2) * 0.5) * 17 + row * 31) % 9, k = (0.75 + id * 0.04) * (0.8 + 0.3 * g(u, v));
      return [128 * k, 62 * k, 46 * k];
    });
  };
  // Lona listrada (vermelho/creme). alpha=true abre rasgos e buracos.
  P.canvasStripes = (S, alpha, seed) => {
    const g = OE.fbm(seed, 3, 5), holes = OE.fbm(seed + 1, 4, 5), mold = OE.fbm(seed + 2, 2, 4);
    return paint(S, (u, v) => {
      const st = Math.floor(u * 4) % 2 === 0;
      let col = st ? [150, 38, 34] : [196, 180, 148];
      const d = 0.7 + 0.4 * g(u, v); col = [col[0] * d, col[1] * d, col[2] * d];
      col = mix(col, [60, 58, 40], OE.clamp((mold(u, v) - 0.55) * 2.5, 0, 0.7));
      col = mix(col, [70, 50, 30], OE.clamp(v - 0.7, 0, 0.3));
      let a = 255;
      if (alpha) { const h = holes(u, v); if (h > 0.69) a = 0; else if (h > 0.665) col = [40, 30, 22]; }
      return [col[0], col[1], col[2], a];
    });
  };
  P.fabric = (S, seed) => {
    const g = OE.fbm(seed, 4, 4);
    return paint(S, (u, v) => {
      const w = (Math.sin(u * S * 1.6) * Math.sin(v * S * 1.6)) * 0.06, k = 0.78 + 0.25 * g(u, v) + w;
      return [200 * k, 196 * k, 188 * k];
    });
  };
  P.velvet = (S) => {
    const g = OE.fbm(61, 2, 4), mold = OE.fbm(62, 3, 4);
    return paint(S, (u, v) => {
      const fold = 0.55 + 0.45 * Math.pow(Math.abs(Math.sin(u * Math.PI * 6 + g(u, v) * 2)), 0.7);
      let c = [118 * fold, 18 * fold, 24 * fold];
      c = mix(c, [60, 50, 40], OE.clamp((mold(u, v) - 0.55) * 2, 0, 0.6) + OE.clamp(v - 0.8, 0, 0.2));
      return c;
    });
  };
  P.ground = (S, a, b, seed, pebbles) => {
    const g = OE.fbm(seed, 3, 5), h = OE.fbm(seed + 1, 8, 3), ca = hex(a), cb = hex(b);
    const c = paint(S, (u, v) => {
      const t = g(u, v), k = 0.75 + 0.4 * h(u, v);
      const col = mix(ca, cb, OE.clamp((t - 0.35) * 2, 0, 1));
      return [col[0] * k, col[1] * k, col[2] * k];
    });
    if (pebbles) { const ctx = c.getContext('2d'), r = OE.rng(seed);
      for (let i = 0; i < pebbles; i++) { const x = r() * S, y = r() * S, s = 1 + r() * 3, l = 60 + r() * 70;
        ctx.fillStyle = `rgb(${l},${l * 0.95},${l * 0.88})`; ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.7, r() * 3, 0, 6.3); ctx.fill(); } }
    return c;
  };
  P.asphalt = (S) => {
    const c = P.ground(S, '#2c2c2c', '#3d3b38', 71, 900);
    cracks(c.getContext('2d'), S, 9, 71, 'rgba(10,10,10,0.8)', 2); return c;
  };
  P.chainlink = (S) => {
    const c = canvas(S), ctx = c.getContext('2d'); ctx.strokeStyle = '#8a8378'; ctx.lineWidth = S / 64;
    const n = 8, st = S / n;
    for (let i = -n; i < 2 * n; i++) { ctx.beginPath(); ctx.moveTo(i * st, 0); ctx.lineTo(i * st + S, S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * st + S, 0); ctx.lineTo(i * st, S); ctx.stroke(); }
    const r = OE.rng(81); ctx.fillStyle = 'rgba(120,58,26,0.6)';
    for (let i = 0; i < 40; i++) ctx.fillRect(r() * S, r() * S, 4, 4);
    return c;
  };
  P.leaves = (S) => {
    const c = canvas(S), ctx = c.getContext('2d'), r = OE.rng(91);
    for (let i = 0; i < 260; i++) { const x = S / 2 + (r() - 0.5) * S * 0.9 * Math.sqrt(r()), y = S / 2 + (r() - 0.5) * S * 0.9 * Math.sqrt(r()), l = 25 + r() * 35;
      ctx.fillStyle = `rgb(${l * 0.9},${l * 1.15},${l * 0.6})`; ctx.beginPath(); ctx.ellipse(x, y, 5 + r() * 6, 2 + r() * 3, r() * 3, 0, 6.3); ctx.fill(); }
    return c;
  };
  P.grassBlades = (S) => {
    const c = canvas(S), ctx = c.getContext('2d'), r = OE.rng(93);
    for (let i = 0; i < 70; i++) { const x = r() * S, h = S * (0.45 + r() * 0.55), lean = (r() - 0.5) * S * 0.25, l = 45 + r() * 40, dry = r() < 0.5;
      ctx.strokeStyle = dry ? `rgb(${l * 1.5},${l * 1.35},${l * 0.7})` : `rgb(${l * 0.8},${l * 1.2},${l * 0.5})`; ctx.lineWidth = 2 + r() * 2;
      ctx.beginPath(); ctx.moveTo(x, S); ctx.quadraticCurveTo(x + lean * 0.3, S - h * 0.6, x + lean, S - h); ctx.stroke(); }
    return c;
  };
  P.sprite = (S, inner, outer) => {
    const c = canvas(S), ctx = c.getContext('2d'), g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, inner); g.addColorStop(1, outer); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); return c;
  };
  P.cardboard = (S) => {
    const g = OE.fbm(101, 3, 4);
    const c = paint(S, (u, v) => { const k = 0.8 + 0.3 * g(u, v) + (Math.abs(((u * 40) % 1) - 0.5) < 0.1 ? -0.04 : 0); return [150 * k, 112 * k, 72 * k]; });
    const ctx = c.getContext('2d'); ctx.fillStyle = 'rgba(160,140,100,0.85)'; ctx.fillRect(0, S * 0.46, S, S * 0.08); return c;
  };
  P.mattress = (S) => {
    const st = OE.fbm(111, 2, 4);
    return paint(S, (u, v) => {
      let c = Math.floor(u * 10) % 2 ? [180, 176, 160] : [150, 160, 170];
      const s = OE.clamp((st(u, v) - 0.5) * 2.5, 0, 0.8); c = mix(c, [120, 95, 50], s); return c;
    });
  };

  // ---------- Cartazes e placas (texto desenhado) ----------
  function posterAtlas() {
    const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
    const posters = [
      { bg: '#7a1414', fg: '#f1d48a', t1: 'GRAN CIRCO', t2: 'ESTRELA', t3: 'O ÚLTIMO ESPETÁCULO', face: 1 },
      { bg: '#1d2f5a', fg: '#e8c25a', t1: 'O PALHAÇO', t2: 'RISONHO', t3: 'SÓ ESTA NOITE', face: 1 },
      { bg: '#d8c49a', fg: '#5a1010', t1: 'LEÕES', t2: 'FEROZES', t3: 'DOMADOS AO VIVO', face: 2 },
      { bg: '#2a4a2a', fg: '#f0e0b0', t1: 'TRAPÉZIO', t2: 'DA MORTE', t3: 'SEM REDE!', face: 3 },
      { bg: '#4a1a4a', fg: '#ffd27a', t1: 'MULHER', t2: 'SEM ROSTO', t3: 'VENHA VER', face: 1 },
      { bg: '#b07a20', fg: '#2a0a0a', t1: 'GLOBO', t2: 'DA MORTE', t3: 'MOTOS!', face: 3 },
      { bg: '#101010', fg: '#c03030', t1: 'DESAPARECIDOS', t2: '1987', t3: 'ALGUÉM VIU?', face: 4 },
      { bg: '#efe6d0', fg: '#333', t1: 'ESPETÁCULO', t2: 'CANCELADO', t3: 'POR ORDEM JUDICIAL', face: 0 }
    ];
    posters.forEach((p, i) => {
      const x = (i % 4) * 256, y = Math.floor(i / 4) * 256, w = 256, h = 256;
      ctx.fillStyle = p.bg; ctx.fillRect(x, y, w, h); ctx.fillStyle = p.fg; ctx.textAlign = 'center';
      ctx.font = 'bold 30px Georgia,serif'; ctx.fillText(p.t1, x + w / 2, y + 40); ctx.font = 'bold 38px Georgia,serif'; ctx.fillText(p.t2, x + w / 2, y + 80);
      ctx.font = 'bold 16px Georgia,serif'; ctx.fillText(p.t3, x + w / 2, y + 240);
      const cx = x + w / 2, cy = y + 160;
      if (p.face === 1) { ctx.fillStyle = '#f2ece0'; ctx.beginPath(); ctx.ellipse(cx, cy, 46, 56, 0, 0, 6.3); ctx.fill(); ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.ellipse(cx - 17, cy - 12, 8, 13, 0, 0, 6.3); ctx.ellipse(cx + 17, cy - 12, 8, 13, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#b01010'; ctx.beginPath(); ctx.arc(cx, cy + 6, 9, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#b01010'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy + 14, 28, 0.25, 2.9); ctx.stroke(); }
      if (p.face === 2) { ctx.fillStyle = '#8a5a1a'; ctx.beginPath(); ctx.arc(cx, cy, 52, 0, 6.3); ctx.fill(); ctx.fillStyle = '#c99040'; ctx.beginPath(); ctx.arc(cx, cy + 6, 32, 0, 6.3); ctx.fill(); ctx.fillStyle = '#111'; ctx.fillRect(cx - 16, cy - 6, 6, 6); ctx.fillRect(cx + 10, cy - 6, 6, 6); }
      if (p.face === 3) { ctx.strokeStyle = p.fg; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 60, cy - 50); ctx.lineTo(cx - 20, cy + 30); ctx.moveTo(cx + 60, cy - 50); ctx.lineTo(cx + 20, cy + 30); ctx.moveTo(cx - 20, cy + 30); ctx.lineTo(cx + 20, cy + 30); ctx.stroke(); ctx.fillStyle = p.fg; ctx.beginPath(); ctx.arc(cx, cy + 5, 10, 0, 6.3); ctx.fill(); }
      if (p.face === 4) { ctx.fillStyle = '#ddd'; for (let k = 0; k < 4; k++) { ctx.fillRect(x + 22 + k * 56, y + 110, 46, 60); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x + 45 + k * 56, y + 135, 12, 0, 6.3); ctx.fill(); ctx.fillStyle = '#ddd'; } }
      // envelhecimento: manchas, rasgos e dobras
      const r = OE.rng(i * 7 + 3); ctx.globalCompositeOperation = 'multiply';
      for (let k = 0; k < 14; k++) { ctx.fillStyle = `rgba(${120 + r() * 60},${100 + r() * 40},${60},${0.25 + r() * 0.3})`; ctx.beginPath(); ctx.ellipse(x + r() * w, y + r() * h, 10 + r() * 50, 8 + r() * 30, r() * 3, 0, 6.3); ctx.fill(); }
      ctx.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < 3; k++) { ctx.beginPath(); const ex = x + (r() < 0.5 ? 0 : w), ey = y + r() * h; ctx.moveTo(ex, ey); for (let s = 0; s < 6; s++) ctx.lineTo(ex + (r() - 0.5) * 80, ey + (r() - 0.5) * 80); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
    });
    return c;
  }
  // Placas: cada linha é uma faixa de 1024x64 no atlas (8 placas)
  OE.SIGNS = ['GRAN CIRCO ESTRELA', 'BILHETERIA', 'CAMARINS · SOMENTE ARTISTAS', 'DEPÓSITO', 'PERIGO · ANIMAIS', 'ALOJAMENTO', 'PROIBIDA A ENTRADA', 'SAÍDA'];
  function signAtlas() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const ctx = c.getContext('2d');
    OE.SIGNS.forEach((t, i) => {
      const y = i * 64; ctx.fillStyle = i === 7 ? '#0d3a1a' : i === 4 || i === 6 ? '#8a6a10' : '#5a1212'; ctx.fillRect(0, y, 1024, 64);
      ctx.strokeStyle = '#d8c080'; ctx.lineWidth = 4; ctx.strokeRect(4, y + 4, 1016, 56);
      ctx.fillStyle = i === 7 ? '#5aff8a' : '#f0dfa0'; ctx.font = 'bold 44px Georgia,serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      // letras faltando nas placas velhas
      const r = OE.rng(i + 50); const s = t.split('').map(ch => (r() < 0.08 && ch !== ' ' ? ' ' : ch)).join('');
      ctx.fillText(i === 0 ? t : s, 512, y + 34);
      ctx.globalCompositeOperation = 'multiply'; for (let k = 0; k < 18; k++) { ctx.fillStyle = `rgba(110,60,20,${0.2 + r() * 0.4})`; ctx.fillRect(r() * 1024, y + r() * 64, 20 + r() * 80, 4 + r() * 20); }
      ctx.globalCompositeOperation = 'source-over';
    });
    return c;
  }

  function mkTex(cv, srgb) {
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = OE.maxAniso || 4;
    if (srgb !== false) t.encoding = THREE.sRGBEncoding; return t;
  }

  /* ---------- Materiais compartilhados ----------
     tile = metros cobertos por uma repetição da textura (UV em metros no Builder). */
  const MAT = {};
  OE.MAT = MAT;
  // Alto: PBR (MeshStandardMaterial). Suave/Padrão: Phong (bem mais barato por pixel no celular).
  function std(name, opts) {
    const p = Object.assign({ vertexColors: true, roughness: 0.9, metalness: 0 }, opts.p || {});
    if (!OE.Q.bump) { delete p.bumpMap; delete p.bumpScale; }
    let m;
    if (OE.Q.pbr) m = new THREE.MeshStandardMaterial(p);
    else {
      const rough = p.roughness, metal = p.metalness; delete p.roughness; delete p.metalness;
      p.shininess = Math.max(2, (1 - rough) * 60); p.specular = new THREE.Color(metal > 0.3 ? 0x2a2a2a : 0x0c0c0c);
      m = new THREE.MeshPhongMaterial(p);
    }
    m.userData.tile = opts.tile || 2; m.name = name; MAT[name] = m; return m;
  }
  OE.buildMaterials = function (renderer) {
    OE.maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const T = (k, fn) => (TEX[k] = mkTex(fn()));
    const t0 = performance.now();
    std('wood', { tile: 2.4, p: { map: T('wood', () => P.wood(S_HI)), bumpMap: TEX.wood, bumpScale: 0.015 } });
    std('woodDark', { tile: 1.5, p: { map: T('woodDark', () => P.wood(S_LO, '#3e2a1c')), roughness: 0.75 } });
    std('woodRed', { tile: 2.4, p: { map: T('woodRed', () => P.paintedWood(S_HI, '#8e1f1c', 23)), bumpMap: TEX.woodRed, bumpScale: 0.01 } });
    std('woodCream', { tile: 2.4, p: { map: T('woodCream', () => P.paintedWood(S_HI, '#cfc3a2', 25)) } });
    std('woodGreen', { tile: 2.4, p: { map: T('woodGreen', () => P.paintedWood(S_LO, '#3e5a40', 27)) } });
    std('rust', { tile: 1.6, p: { map: T('rust', () => P.rust(S_HI)), roughness: 0.7, metalness: 0.5, bumpMap: TEX.rust, bumpScale: 0.01 } });
    std('metalGreen', { tile: 2, p: { map: T('metalGreen', () => P.paintedMetal(S_LO, '#3d5c4a', 33)), roughness: 0.6, metalness: 0.4 } });
    std('metalRed', { tile: 2, p: { map: T('metalRed', () => P.paintedMetal(S_HI, '#8a1a18', 35)), roughness: 0.6, metalness: 0.35 } });
    std('metalBlue', { tile: 2, p: { map: T('metalBlue', () => P.paintedMetal(S_LO, '#28406a', 37)), roughness: 0.6, metalness: 0.35 } });
    std('metalYellow', { tile: 2, p: { map: T('metalYellow', () => P.paintedMetal(S_LO, '#b08a1a', 39)), roughness: 0.6, metalness: 0.35 } });
    std('metalGray', { tile: 2, p: { map: T('metalGray', () => P.paintedMetal(S_LO, '#6e737a', 43)), roughness: 0.5, metalness: 0.5 } });
    std('iron', { tile: 1, p: { color: 0x2a2826, roughness: 0.55, metalness: 0.7 } });
    std('chrome', { tile: 1, p: { color: 0x8a8a8a, roughness: 0.35, metalness: 0.9 } });
    std('concrete', { tile: 3, p: { map: T('concrete', () => P.concrete(S_HI, '#7a7874', 41)), bumpMap: TEX.concrete, bumpScale: 0.02 } });
    std('concreteDark', { tile: 3, p: { map: T('concreteDark', () => P.concrete(S_HI, '#53524f', 45)) } });
    std('plaster', { tile: 3, p: { map: T('plaster', () => P.plaster(S_HI, '#c7bc9e', 47)) } });
    std('plasterGreen', { tile: 3, p: { map: T('plasterGreen', () => P.plaster(S_HI, '#8fa48a', 49)) } });
    std('plasterBlue', { tile: 3, p: { map: T('plasterBlue', () => P.plaster(S_LO, '#8996a6', 53)) } });
    std('wallpaperRed', { tile: 2.6, p: { map: T('wallpaperRed', () => P.wallpaper(S_HI, '#6a2a2c', '#a8865a', 55)) } });
    std('wallpaperGreen', { tile: 2.6, p: { map: T('wallpaperGreen', () => P.wallpaper(S_HI, '#3c4a34', '#a89a6a', 57)) } });
    std('tiles', { tile: 1.2, p: { map: T('tiles', () => P.tiles(S_HI, '#c9c6bc', 8, 59)), roughness: 0.4 } });
    std('tilesFloor', { tile: 1.6, p: { map: T('tilesFloor', () => P.tiles(S_LO, '#7c766a', 6, 61)), roughness: 0.6 } });
    std('checker', { tile: 2, p: { map: T('checker', () => paint(S_LO, (u, v) => { const k = (Math.floor(u * 8) + Math.floor(v * 8)) % 2 ? 190 : 40; const d = 0.8 + 0.2 * OE.fbm(63, 3, 3)(u, v); return [k * d, k * d * 0.97, k * d * 0.9]; })), roughness: 0.5 } });
    std('brick', { tile: 2.4, p: { map: T('brick', () => P.brick(S_LO)) } });
    std('canvas', { tile: 6, p: { map: T('canvas', () => P.canvasStripes(S_HI, false, 65)), side: THREE.DoubleSide } });
    std('canvasTorn', { tile: 6, p: { map: T('canvasTorn', () => P.canvasStripes(S_HI, true, 67)), alphaTest: 0.5, side: THREE.DoubleSide } });
    std('canvasPlain', { tile: 3, p: { map: T('canvasPlain', () => P.ground(S_LO, '#a8987a', '#7a6c55', 69)), side: THREE.DoubleSide } });
    std('tarp', { tile: 2.5, p: { map: T('tarp', () => P.ground(S_LO, '#4a5560', '#2f3a40', 73)), roughness: 0.6, side: THREE.DoubleSide } });
    std('velvet', { tile: 2.5, p: { map: T('velvet', () => P.velvet(S_LO)), side: THREE.DoubleSide } });
    std('fabric', { tile: 1, p: { map: T('fabric', () => P.fabric(S_LO, 75)), side: THREE.DoubleSide } });
    std('mattress', { tile: 1.4, p: { map: T('mattress', () => P.mattress(S_LO)) } });
    std('cardboard', { tile: 0.8, p: { map: T('cardboard', () => P.cardboard(S_LO)) } });
    std('dirt', { tile: 6, p: { map: T('dirt', () => P.ground(S_HI, '#3e3426', '#5a4a36', 77, 500)) } });
    std('grassGround', { tile: 7, p: { map: T('grassGround', () => P.ground(S_HI, '#2c3420', '#4a4630', 79, 150)) } });
    std('sawdust', { tile: 3, p: { map: T('sawdust', () => P.ground(S_HI, '#8a7048', '#5e4a30', 83, 1400)) } });
    std('gravel', { tile: 3, p: { map: T('gravel', () => P.ground(S_HI, '#4e4a44', '#6a645a', 85, 2600)) } });
    std('asphalt', { tile: 5, p: { map: T('asphalt', () => P.asphalt(S_HI)) } });
    std('hay', { tile: 1.5, p: { map: T('hay', () => P.ground(S_LO, '#8a7434', '#5e4e20', 87, 0)) } });
    std('chainlink', { tile: 1.2, p: { map: T('chainlink', () => P.chainlink(S_LO)), alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.6, transparent: false } });
    std('leaves', { tile: 1, p: { map: T('leaves', () => P.leaves(S_LO)), alphaTest: 0.45, side: THREE.DoubleSide } });
    std('grassBlades', { tile: 1, p: { map: T('grassBlades', () => P.grassBlades(S_LO)), alphaTest: 0.4, side: THREE.DoubleSide } });
    std('poster', { tile: 1, p: { map: T('poster', posterAtlas), alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.95 } });
    std('sign', { tile: 1, p: { map: T('sign', signAtlas), roughness: 0.8 } });
    std('rubber', { tile: 1, p: { color: 0x151515, roughness: 0.95 } });
    std('paint', { tile: 1, p: { color: 0xffffff, roughness: 0.7 } });            // cor só por vértice
    std('ceramic', { tile: 1, p: { color: 0xd8d4c8, roughness: 0.25 } });
    std('glass', { tile: 1, p: { color: 0x334044, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide } });
    std('mirror', { tile: 1, p: { map: T('mirror', () => P.ground(S_LO, '#4a5054', '#22272a', 89, 0)), roughness: 0.12, metalness: 0.85 } });
    std('bone', { tile: 1, p: { color: 0xd8ccb0, roughness: 0.6 } });
    // Emissivos (lâmpadas). As que piscam ganham material próprio no EnvironmentLighting.
    MAT.bulbWarm = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
    MAT.bulbDead = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.2, metalness: 0.1 });
    MAT.emergency = new THREE.MeshBasicMaterial({ color: 0xff2a1a });
    MAT.exitGreen = new THREE.MeshBasicMaterial({ color: 0x2aff6a });
    MAT.fluor = new THREE.MeshBasicMaterial({ color: 0xd8f0ff });
    MAT.candle = new THREE.MeshBasicMaterial({ color: 0xffb040 });
    for (const k in MAT) if (!MAT[k].userData.tile) MAT[k].userData.tile = 1;
    OE.TEX = TEX;
    OE.SPRITE = { dust: mkTex(P.sprite(64, 'rgba(255,240,220,0.9)', 'rgba(255,240,220,0)')), glow: mkTex(P.sprite(128, 'rgba(255,220,160,1)', 'rgba(255,200,120,0)')) };
    OE.log('texturas', (performance.now() - t0).toFixed(0) + 'ms');
  };
})(window.OE);

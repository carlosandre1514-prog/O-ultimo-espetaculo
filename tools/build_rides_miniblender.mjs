#!/usr/bin/env node
/* Modela os brinquedos do parque NO MINIBLENDER (../Miniblender) e exporta GLB.
   Abre o MiniBlender num Chromium automatizado e usa a API dele (window.MiniBlender.run):
   add_primitive, transform, set_material, add_modifier (Array, Mirror), project new/export_glb.
   Para cada brinquedo grava assets/models/brinquedos/<nome>.glb e anota colisores e esconderijos
   (coordenadas locais) em assets/models/brinquedos/rides.json.
   Uso: node tools/build_rides_miniblender.mjs [nome ...]   (depois: node tools/optimize_models.cjs) */
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright/index.js')); }
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '..');
const MB = path.resolve(process.env.MINIBLENDER || path.join(root, '..', 'Miniblender')), out = path.join(root, 'assets', 'models', 'brinquedos');
fs.mkdirSync(out, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.gz': 'application/octet-stream' };
const srv = http.createServer((q, r) => { const p = path.join(MB, decodeURIComponent(q.url.split('?')[0])) + (q.url.split('?')[0].endsWith('/') ? 'index.html' : ''); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); }).listen(8150);

// ----------------- código que roda DENTRO do MiniBlender -----------------
const PAGE = String.raw`
window.RIDE = (() => {
  const run = (n, a) => MiniBlender.run(n, a), D = Math.PI / 180;
  let cols = [], hides = [], n = 0;
  const idOf = r => JSON.parse((Array.isArray(r) ? r : r.content || [r])[0].text).created.id;
  async function prim(type, pos, rot, scale, color, mat) {
    const r = await run('add_primitive', { type, position: pos, rotation_deg: rot || [0, 0, 0], scale, color }); const id = idOf(r); n++;
    if (mat) await run('set_material', Object.assign({ id }, mat)); return id;
  }
  const M = { metal: { metalness: 0.7, roughness: 0.45 }, rust: { metalness: 0.4, roughness: 0.8 }, paint: { metalness: 0.1, roughness: 0.7 }, wood: { metalness: 0, roughness: 0.9 } };
  const box = (c, s, col, rot, mat) => prim('cube', c, rot, [s[0] / 1.2, s[1] / 1.2, s[2] / 1.2], col, mat || M.paint);
  const cyl = (c, r, h, col, rot, mat) => prim('cylinder', c, rot, [r / 0.5, h / 1.4, r / 0.5], col, mat || M.paint);
  const sph = (c, s, col, mat) => prim('sphere', c, [0, 0, 0], [s[0] / 0.8, s[1] / 0.8, s[2] / 0.8], col, mat || M.paint);
  const tor = (c, R, t, col, rot, mat) => prim('torus', c, rot, [R / 0.6, t / 0.22, R / 0.6], col, mat || M.paint);
  // barra entre dois pontos (cubo esticado)
  function bar(a, b, t, col, mat) {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(); d.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d), e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
    return prim('cube', [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [e.x / D, e.y / D, e.z / D], [t / 1.2, len / 1.2, t / 1.2], col, mat || M.metal);
  }
  const mod = (id, type, params) => run('add_modifier', { id, type, params });
  const cbox = (x, y, z, w, h, d, yaw) => cols.push({ box: [x, y, z, w, h, d, yaw || 0] });
  const ccyl = (x, z, r, y0, y1) => cols.push({ cyl: [x, z, r, y0, y1] });
  const hide = h => hides.push(h);
  const R = {};

  // ---------- MONTANHA-RUSSA: circuito oval com subida, quedas e morros; trem parado na subida, carrinho descarrilado ----------
  R.montanha_russa = async () => {
    const N = 96, pts = [];
    const hgt = s => s < 0.28 ? 1.2 + 12.5 * (s / 0.28) : s < 0.38 ? 13.7 - 11.5 * ((s - 0.28) / 0.1) : s < 0.5 ? 2.2 + 6 * Math.sin(Math.PI * (s - 0.38) / 0.12) : s < 0.62 ? 2.2 + 4.5 * Math.sin(Math.PI * (s - 0.5) / 0.12) : s < 0.9 ? 2.2 + 3 * Math.sin(Math.PI * (s - 0.62) / 0.28) : 2.2 - 1.0 * ((s - 0.9) / 0.1);
    for (let i = 0; i <= N; i++) { const s = i / N, a = s * Math.PI * 2; pts.push([Math.cos(a) * 6.5, hgt(s), Math.sin(a) * 16.5]); }
    for (let i = 0; i < N; i++) {
      const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz), px = -dz / L * 0.55, pz = dx / L * 0.55;
      if (i === 70 || i === 71) continue;                                        // trecho de trilho arrancado
      await bar([a[0] + px, a[1], a[2] + pz], [b[0] + px, b[1], b[2] + pz], 0.12, '#7a2a1a', M.rust);
      await bar([a[0] - px, a[1], a[2] - pz], [b[0] - px, b[1], b[2] - pz], 0.12, '#7a2a1a', M.rust);
      await bar([a[0] + px * 1.1, a[1] - 0.12, a[2] + pz * 1.1], [a[0] - px * 1.1, a[1] - 0.12, a[2] - pz * 1.1], 0.14, '#3a2a1e', M.wood);
      if (i % 3 === 0) {
        const h = a[1] - 0.2; await bar([a[0], 0, a[2]], [a[0], h, a[2]], 0.26, '#b8b0a0', M.paint);
        if (h > 3) await bar([a[0] + px * 3, 0, a[2] + pz * 3], [a[0], h * 0.7, a[2]], 0.12, '#a8a090', M.paint);
        ccyl(a[0], a[2], 0.2, 0, h);
      }
      if (a[1] < 2.4) cbox(a[0], a[1] - 0.25, a[2], 1.4, 0.4, L + 0.1, -Math.atan2(dz, dx) + Math.PI / 2);
    }
    // trem parado no alto da subida (3 carrinhos)
    for (let k = 0; k < 3; k++) { const p = pts[18 - k * 2], q = pts[19 - k * 2], yaw = Math.atan2(q[0] - p[0], q[2] - p[2]) / D, pitch = Math.atan2(q[1] - p[1], Math.hypot(q[0] - p[0], q[2] - p[2])) / D;
      await box([p[0], p[1] + 0.55, p[2]], [1.3, 0.7, 1.8], k ? '#1e3a7a' : '#a01818', [-pitch, yaw, 0]); await box([p[0], p[1] + 0.95, p[2]], [1.1, 0.25, 0.5], '#2a2a2a', [-pitch, yaw, 0]); }
    // carrinho descarrilado no chão
    await box([3.2, 0.45, -10], [1.3, 0.7, 1.8], '#a01818', [0, 40, 75]); cbox(3.2, 0, -10, 1.6, 1.0, 2.0, 0.7);
    // estação de embarque (plataforma coberta)
    const st = pts[94]; await box([st[0] - 2.2, 0.5, st[2]], [2.6, 1.0, 7], '#6a5a48', [0, 0, 0], M.wood);
    for (const z of [-3, 0, 3]) await cyl([st[0] - 3.3, 1.6, st[2] + z], 0.1, 3.2, '#a01818');
    await box([st[0] - 2.2, 3.3, st[2]], [3.4, 0.15, 7.6], '#c8b890', [0, 0, 6]);
    cbox(st[0] - 2.2, 0, st[2], 2.6, 1.0, 7);
    hide({ kind: 'stage', cat: 'aberto', x: st[0] - 3.7, z: st[2] + 1, yaw: -Math.PI / 2, low: true, clear: 0.9 });
  };
  // ---------- BARCO VIKING ----------
  R.barco_viking = async () => {
    await box([0, 0.15, 0], [9, 0.3, 14], '#4a4a4a', [0, 0, 0], M.rust); cbox(0, 0, 0, 9, 0.3, 14);
    // cavaletes em A (um lado + Mirror no X)
    for (const sz of [-1, 1]) { const leg = await bar([3.4, 0.3, sz * 5.5], [2.6, 10.5, 0], 0.4, '#c8a020', M.paint); await mod(leg, 'mirror', { axis: 'x' }); ccyl(3.3, sz * 5.3, 0.3, 0, 3); ccyl(-3.3, sz * 5.3, 0.3, 0, 3); }
    await cyl([0, 10.5, 0], 0.35, 6, '#3a3a3a', [0, 0, 90], M.metal);
    const tilt = 14;
    for (const sx of [-1.6, 1.6]) await bar([sx, 10.5, 0], [sx, 3.2, -Math.tan(tilt * D) * 7.3], 0.3, '#c8a020', M.paint);
    // casco em tábuas curvas
    const cz = -Math.tan(tilt * D) * 7.3;
    for (let k = -4; k <= 4; k++) { const th = k * 20 * D, L = 12 * (0.55 + 0.45 * Math.cos(th));
      await box([Math.sin(th) * 2.2, 2.4 - Math.cos(th) * 1.4, cz], [0.15, 0.62, L], k % 2 ? '#8a1a14' : '#c89a28', [tilt, 0, -k * 20], M.wood); }
    // proa e popa com cabeças de dragão
    for (const s of [-1, 1]) { const zz = cz + s * 6.2; await bar([0, 2.2, zz], [0, 5.2, zz + s * 1.2], 0.45, '#2a6a3a', M.paint); await sph([0, 5.4, zz + s * 1.5], [0.45, 0.4, 0.75], '#2a6a3a'); }
    // bancos (Array)
    const seat = await box([0, 2.7, cz - 4.5], [3.6, 0.15, 0.5], '#5a3a20', [tilt, 0, 0], M.wood); await mod(seat, 'array', { count: 8, ox: 0, oy: 0, oz: 2.1, relative: true });
    cbox(0, 1.0, cz, 4.4, 2.2, 12, 0);
    hide({ kind: 'stage', cat: 'aberto', x: 3.2, z: cz, yaw: Math.PI / 2, low: true, clear: 0.8, name: 'embaixo do barco' });
  };
  // ---------- CHAPÉU MEXICANO ----------
  R.chapeu_mexicano = async () => {
    await cyl([0, 0.15, 0], 7.5, 0.3, '#5a5a5a', null, M.rust); ccyl(0, 0, 7.5, 0, 0.3);
    await cyl([0, 5.3, 0], 0.55, 10, '#c8c0b0'); ccyl(0, 0, 0.6, 0.3, 10.3);
    await box([0, 1.2, 0], [2.2, 1.8, 2.2], '#7a1a1a'); cbox(0, 0.3, 0, 2.2, 1.8, 2.2);
    for (let k = 0; k < 6; k++) await cyl([0, 10.3 + k * 0.32, 0], 6.5 - k * 1.05, 0.34, k % 2 ? '#c8a020' : '#a01818');
    await sph([0, 12.4, 0], [0.5, 0.5, 0.5], '#c8a020');
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2, x = Math.cos(a) * 6.2, z = Math.sin(a) * 6.2, sway = (i % 5) * 4;
      await bar([Math.cos(a) * 0.6, 10.2, Math.sin(a) * 0.6], [x, 9.6, z], 0.12, '#8a8a8a', M.metal);
      if (i % 7 === 3) { await box([x * 1.15, 0.45, z * 1.15], [0.6, 0.12, 0.6], '#2a5a9a', [70, a / D, 0]); continue; }  // cadeira caída
      const seatY = 1.5; await bar([x, 9.6, z], [x + Math.sin(sway * D), seatY + 0.6, z], 0.03, '#6a6a6a', M.metal);
      await box([x + Math.sin(sway * D), seatY, z], [0.6, 0.12, 0.6], i % 2 ? '#2a5a9a' : '#c8a020'); await box([x + Math.sin(sway * D), seatY + 0.35, z + 0.28], [0.6, 0.6, 0.08], '#3a3a3a');
      cbox(x, seatY - 0.1, z, 0.7, 0.9, 0.7);
    }
    hide({ kind: 'equipment', cat: 'aberto', x: 1.6, z: 0, yaw: Math.PI / 2, low: true, clear: 1.2, name: 'atrás da casa de máquinas' });
  };
  // ---------- XÍCARAS MALUCAS ----------
  R.xicaras = async () => {
    await cyl([0, 0.2, 0], 7.2, 0.4, '#b8a888', null, M.wood); ccyl(0, 0, 7.2, 0, 0.4);
    await cyl([0, 1.4, 0], 0.9, 2.2, '#d8c8b0'); await sph([0, 2.7, 0], [1.3, 1.0, 1.3], '#a8c8c8'); await bar([1.0, 2.5, 0], [1.9, 3.2, 0], 0.25, '#a8c8c8', M.paint); ccyl(0, 0, 1.3, 0.4, 3.6);
    const cols3 = ['#d898a8', '#88b8d8', '#e8d070', '#a8d898', '#c898d8', '#e8a870'];
    for (let g = 0; g < 3; g++) { const ga = g / 3 * Math.PI * 2 + 0.3, gx = Math.cos(ga) * 4.3, gz = Math.sin(ga) * 4.3;
      await cyl([gx, 0.45, gz], 2.6, 0.12, '#8a7a68', null, M.wood);
      for (let c = 0; c < 2; c++) { const ca = ga + c * Math.PI, x = gx + Math.cos(ca) * 1.35, z = gz + Math.sin(ca) * 1.35, col = cols3[g * 2 + c];
        await cyl([x, 1.0, z], 1.0, 1.0, col); await tor([x, 1.5, z], 1.0, 0.1, col); await cyl([x, 0.58, z], 1.15, 0.08, '#e8e0d0');
        await cyl([x, 1.25, z], 0.15, 0.5, '#8a8a8a', null, M.metal); await tor([x, 1.4, z], 0.25, 0.06, '#3a3a3a', [90, 0, 0], M.metal);
        await tor([x + Math.cos(ca) * 1.05, 1.1, z + Math.sin(ca) * 1.05], 0.3, 0.08, col, [90, -ca / D + 90, 0]);
        ccyl(x, z, 1.05, 0.4, 1.55);
        if (g === 1 && c === 0) hide({ kind: 'crate', cat: 'improvisado', x, z, yaw: Math.atan2(x, z), low: true, camY: 1.05, depth: 0.75, name: 'dentro da xícara' }); } }
  };
  // ---------- TORRE DE QUEDA ----------
  R.torre_queda = async () => {
    const H = 30, w = 1.2;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) await bar([sx * w, 0, sz * w], [sx * w, H, sz * w], 0.22, '#2a4a8a', M.paint);
    // um anel de travessas em X e Array para cima (12 andares)
    const faces = [[[-w, -w], [w, -w]], [[w, -w], [w, w]], [[w, w], [-w, w]], [[-w, w], [-w, -w]]];
    for (const [a, b] of faces) { const id1 = await bar([a[0], 0.3, a[1]], [b[0], 2.6, b[1]], 0.08, '#c8c8c8', M.metal); await mod(id1, 'array', { count: 12, ox: 0, oy: 1.0, oz: 0, relative: true });
      const id2 = await bar([b[0], 0.3, b[1]], [a[0], 2.6, a[1]], 0.08, '#c8c8c8', M.metal); await mod(id2, 'array', { count: 12, ox: 0, oy: 1.0, oz: 0, relative: true }); }
    await box([0, H + 0.6, 0], [3.4, 1.2, 3.4], '#a01818'); await cyl([0, H + 2.2, 0], 0.08, 2.4, '#8a8a8a', null, M.metal); await sph([0, H + 3.4, 0], [0.25, 0.25, 0.25], '#ff4020');
    // gôndola caída lá embaixo, anel de assentos
    await tor([0, 1.0, 0], 2.4, 0.5, '#c8a020', [0, 0, 0]); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; await box([Math.cos(a) * 2.6, 1.5, Math.sin(a) * 2.6], [0.6, 1.0, 0.25], '#2a2a2a', [0, -a / D + 90, 0]); }
    await box([3.8, 1.0, 0], [1.6, 2.0, 2.6], '#5a5a5a', [0, 0, 0], M.rust); cbox(3.8, 0, 0, 1.6, 2.0, 2.6);
    ccyl(0, 0, 3.1, 0, 2.0);
    hide({ kind: 'equipment', cat: 'aberto', x: 3.8, z: 2.2, yaw: 0, low: true, clear: 1.2, name: 'atrás do painel da torre' });
  };
  // ---------- TRENZINHO INFANTIL ----------
  R.trenzinho = async () => {
    const r = 6.3;
    for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, b = (i + 1) / 36 * Math.PI * 2;
      for (const rr of [r - 0.35, r + 0.35]) await bar([Math.cos(a) * rr, 0.08, Math.sin(a) * rr], [Math.cos(b) * rr, 0.08, Math.sin(b) * rr], 0.07, '#5a4a40', M.rust);
      await box([Math.cos(a) * r, 0.03, Math.sin(a) * r], [1.0, 0.06, 0.2], '#3a2a1e', [0, -a / D, 0], M.wood); }
    // locomotiva
    const la = 0.2, lx = Math.cos(la) * r, lz = Math.sin(la) * r, ly = -la / D;
    await box([lx, 0.65, lz], [1.0, 0.7, 2.2], '#a01818', [0, ly, 0]); await cyl([lx, 1.2, lz + 0.3 * Math.cos(la)], 0.38, 1.3, '#1a1a1a', [90, ly, 0], M.metal);
    await box([lx - 0.2 * Math.sin(la), 1.4, lz - 0.7], [1.0, 1.1, 0.8], '#2a5a2a', [0, ly, 0]); await cyl([lx, 2.0, lz + 0.7], 0.14, 0.7, '#1a1a1a', null, M.metal);
    for (const s of [-1, 1]) for (const f of [-0.6, 0.6]) await cyl([lx + s * 0.55, 0.32, lz + f], 0.3, 0.12, '#c8a020', [0, ly, 90], M.metal);
    cbox(lx, 0, lz, 1.3, 2.0, 2.4, la);
    // 3 vagões
    for (let k = 1; k <= 3; k++) { const a = la - k * 0.42, x = Math.cos(a) * r, z = Math.sin(a) * r, y = -a / D, col = ['#2a5a9a', '#c8a020', '#7a2a7a'][k - 1];
      await box([x, 0.55, z], [1.0, 0.5, 1.8], col, [0, y, 0]); await box([x, 0.9, z], [0.9, 0.08, 0.4], '#3a2a1e', [0, y, 0], M.wood);
      for (const s of [-1, 1]) await cyl([x + s * 0.55 * Math.cos(a), 0.28, z - s * 0.55 * Math.sin(a)], 0.25, 0.1, '#2a2a2a', [0, y, 90], M.metal);
      cbox(x, 0, z, 1.1, 1.0, 1.9, a);
      if (k === 3) hide({ kind: 'crate', cat: 'improvisado', x, z, yaw: a + Math.PI / 2, low: true, camY: 0.75, depth: 0.6, name: 'dentro do vagão' }); }
    // bilheteria/placa
    await box([0, 1.0, 0], [1.6, 2.0, 1.6], '#c8b890', [0, 0, 0], M.wood); await box([0, 2.2, 0], [2.0, 0.3, 2.0], '#a01818'); cbox(0, 0, 0, 1.6, 2.0, 1.6);
  };
  // ---------- TOBOGÃ GIGANTE ----------
  R.toboga = async () => {
    const TH = 7;
    for (const [x, z] of [[-1.5, -7], [1.5, -7], [-1.5, -4.5], [1.5, -4.5]]) { await bar([x, 0, z], [x, TH, z], 0.25, '#e8e0d0', M.paint); ccyl(x, z, 0.18, 0, TH); }
    await box([0, TH, -5.75], [3.6, 0.2, 3.0], '#6a5a48', [0, 0, 0], M.wood); await box([0, TH + 1.1, -5.75], [3.8, 0.12, 3.2], '#a01818');
    // escada (degraus com Array) subindo pela lateral
    const step = await box([-2.6, 0.15, -1.2], [1.0, 0.3, 0.35], '#6a5a48', [0, 0, 0], M.wood); await mod(step, 'array', { count: 23, ox: 0, oy: 1.0, oz: -0.92, relative: true });
    for (let i = 0; i < 23; i++) cbox(-2.6, 0, -1.2 - i * 0.322, 1.0, 0.3 * (i + 1) + 0.0, 0.33);
    await bar([-3.15, 1.0, -1.2], [-3.15, TH + 1, -8.2], 0.06, '#a8a8a8', M.metal);
    // três pistas onduladas descendo para +z
    const lanes = ['#d8b020', '#2a6aba', '#c83030'];
    for (let l = 0; l < 3; l++) { const x = -1.0 + l * 1.0;
      for (let i = 0; i < 14; i++) { const z0 = -4.2 + i * 1.0, z1 = z0 + 1.0, h = s => TH * Math.pow(1 - s, 1.3) + 0.35 * Math.sin(s * 9) * (1 - s), y0 = h(i / 14), y1 = h((i + 1) / 14);
        const pitch = Math.atan2(y0 - y1, 1.0) / D;
        await box([x, (y0 + y1) / 2, (z0 + z1) / 2], [0.9, 0.06, Math.hypot(1.0, y0 - y1)], lanes[l], [pitch, 0, 0]);
        if (l !== 1) await box([x + (l ? 0.45 : -0.45), (y0 + y1) / 2 + 0.15, (z0 + z1) / 2], [0.05, 0.3, Math.hypot(1.0, y0 - y1)], lanes[l], [pitch, 0, 0]);
        if (i % 3 === 0 && y0 > 0.8) await bar([x, 0, z0], [x, y0, z0], 0.1, '#bcb4a4', M.paint); } }
    cbox(0, 0, 2.8, 3.2, 3.0, 14);
    hide({ kind: 'stage', cat: 'aberto', x: 0, z: -5.75, yaw: 0, low: false, name: 'debaixo do tobogã' });
  };

  return {
    list: Object.keys(R),
    async build(name) { cols = []; hides = []; n = 0;
      await run('project', { action: 'new', name }); const c0 = S.objs[0]; if (c0) await run('delete_object', { id: c0.id });
      await R[name](); return { objects: n, colliders: cols, hides }; },
    exportGLB() { return run('project', { action: 'export_glb' }); }
  };
})();`;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 }, acceptDownloads: true });
page.on('dialog', d => d.accept()); page.on('pageerror', e => console.error('erro no MiniBlender:', e.message));
await page.goto('http://localhost:8150/index.html');
await page.waitForFunction(() => window.MiniBlender && typeof S !== 'undefined' && S.objs, null, { timeout: 120000 });
await page.evaluate(PAGE);
const names = process.argv.slice(2).length ? process.argv.slice(2) : await page.evaluate(() => RIDE.list);
const metaPath = path.join(out, 'rides.json'), meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};
for (const n of names) {
  const t0 = Date.now(); const info = await page.evaluate(n => RIDE.build(n), n);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.evaluate(() => RIDE.exportGLB())]);
  const file = path.join(out, n + '.glb'); await dl.saveAs(file);
  meta[n] = { colliders: info.colliders, hides: info.hides };
  console.log(n.padEnd(18), info.objects, 'peças no MiniBlender ->', (fs.statSync(file).size / 1024).toFixed(0), 'KB', ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 1));
await browser.close(); srv.close();

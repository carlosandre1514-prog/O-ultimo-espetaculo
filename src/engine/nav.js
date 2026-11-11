'use strict';
/* Navegação: grafo de pontos espalhados pelo mapa. As ligações no mesmo andar são feitas
   AUTOMATICAMENTE testando a passagem contra os colisores reais (três raios: centro e laterais,
   na altura do joelho e da cabeça) — se o mapa mudar, a navegação acompanha. Escadas e rampas
   são ligações explícitas. Portas no caminho ficam registradas na aresta: o inimigo abre as
   destrancadas e evita as trancadas. Dutos (crawl) são só para o jogador. */
(function (OE) {
  const N = { nodes: [], edges: [] };
  OE.Nav = N;
  N.add = function (x, y, z, o) { const n = Object.assign({ id: N.nodes.length, x, y, z, links: [], p: new THREE.Vector3(x, y, z) }, o || {}); N.nodes.push(n); return n; };
  N.link = function (a, b, o) { const e = Object.assign({ a, b, len: Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) }, o || {}); a.links.push({ to: b, e }); b.links.push({ to: a, e }); N.edges.push(e); return e; };
  // Cadeia de pontos (corredor, escada): liga em sequência sem testar
  N.chain = function (pts, o) { let prev = null; const out = []; pts.forEach(p => { const n = N.add(p[0], p[1], p[2], o); if (prev) N.link(prev, n, { forced: true }); prev = n; out.push(n); }); return out; };

  const skipNav = c => c.tag === 'door' || c.tag === 'push' || c.tag === 'hide' && false;
  function clear(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1, px = -dz / len * 0.3, pz = dx / len * 0.3;
    // alturas: logo acima do degrau (bancos, guarda do picadeiro passa), tampo de mesa, tronco, cabeça
    for (const h of [0.47, 0.73, 1.1, 1.6]) for (const o of [0, 1, -1]) {
      const A = { x: a.x + px * o, y: a.y + h, z: a.z + pz * o }, B = { x: b.x + px * o, y: b.y + h, z: b.z + pz * o };
      if (OE.world.blocked(A, B, skipNav)) return false;
    }
    return true;
  }
  function doorsOn(a, b) {
    const res = [];
    for (const d of OE.doors) {
      const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1;
      const t = OE.clamp(((d.x - a.x) * dx + (d.z - a.z) * dz) / L2, 0, 1), qx = a.x + dx * t - d.x, qz = a.z + dz * t - d.z;
      if (qx * qx + qz * qz < 0.36 && Math.abs((a.y + b.y) / 2 - d.y) < 1.5) res.push(d);
    }
    return res;
  }
  N.build = function () {
    const t0 = performance.now(), nodes = N.nodes; let made = 0;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j]; if (a.noAuto || b.noAuto) continue;
      if (Math.abs(a.y - b.y) > 0.3) continue; const d = Math.hypot(a.x - b.x, a.z - b.z); if (d > (a.reach || b.reach || 16)) continue;
      if (a.links.some(l => l.to === b)) continue;
      if (!clear(a, b)) continue;
      const ds = doorsOn(a, b); N.link(a, b, { doors: ds.length ? ds : null, crawl: a.crawl || b.crawl }); made++;
    }
    // portas também nas ligações forçadas
    N.edges.forEach(e => { if (e.forced && !e.doors) { const ds = doorsOn(e.a, e.b); if (ds.length) e.doors = ds; } if (e.a.crawl || e.b.crawl) e.crawl = true; });
    OE.log('nav', nodes.length, 'pontos', N.edges.length, 'ligações', (performance.now() - t0).toFixed(0) + 'ms');
  };
  N.passable = function (e, who) {
    if (who === 'enemy' && e.crawl) return false;
    if (e.doors) for (const d of e.doors) if (d.isLocked()) return false;
    if (e.blockedBy && e.blockedBy()) return false;
    return true;
  };
  N.nearest = function (p, maxDy, needClear) {
    let best = null, bd = 1e9; const list = [];
    for (const n of N.nodes) { const dy = Math.abs(n.y - p.y); if (dy > (maxDy || 1.4)) continue; const d = (n.x - p.x) ** 2 + (n.z - p.z) ** 2; list.push([d, n]); }
    list.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < Math.min(list.length, 8); i++) { const n = list[i][1]; if (!needClear || !OE.world.blocked({ x: p.x, y: p.y + 1, z: p.z }, { x: n.x, y: n.y + 1, z: n.z }, skipNav)) return n; if (!best) best = n; }
    return best || (list[0] && list[0][1]);
  };
  // A* simples (poucas centenas de pontos)
  N.path = function (from, to, who) {
    if (!from || !to) return null; if (from === to) return [to];
    const open = [from], g = new Map([[from, 0]]), f = new Map([[from, 0]]), came = new Map(), closed = new Set();
    const h = n => Math.hypot(n.x - to.x, n.y - to.y, n.z - to.z);
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (f.get(open[i]) < f.get(open[bi])) bi = i;
      const cur = open.splice(bi, 1)[0]; if (cur === to) { const out = [cur]; let c = cur; while (came.has(c)) { c = came.get(c); out.unshift(c); } return out; }
      closed.add(cur);
      for (const l of cur.links) {
        if (closed.has(l.to) || !N.passable(l.e, who)) continue;
        const ng = g.get(cur) + l.e.len * (l.e.doors ? 1.3 : 1);
        if (ng < (g.has(l.to) ? g.get(l.to) : 1e9)) { came.set(l.to, cur); g.set(l.to, ng); f.set(l.to, ng + h(l.to)); if (open.indexOf(l.to) < 0) open.push(l.to); }
      }
    }
    return null;
  };
  // Quantos pontos o inimigo alcança a partir de um ponto (teste de conectividade)
  N.reachable = function (from, who) {
    const seen = new Set([from]), q = [from];
    while (q.length) { const c = q.pop(); for (const l of c.links) if (!seen.has(l.to) && N.passable(l.e, who || 'test')) { seen.add(l.to); q.push(l.to); } }
    return seen;
  };
  N.edgeBetween = (a, b) => { const l = a.links.find(l => l.to === b); return l && l.e; };
})(window.OE);

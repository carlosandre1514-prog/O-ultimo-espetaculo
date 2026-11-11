#!/usr/bin/env node
/* Baixa os adolescentes (GLB com esqueleto + foto), as animações dos adolescentes e do palhaço, e escreve
   o manifesto (assets/models/manifest.json: "characters", "teenAnims", "enemy.anims").
   Depois: node tools/optimize_models.cjs assets/models/personagens  e  ...assets/models/anim */
import fs from 'fs'; import path from 'path';
const KEY = process.env.MESHY_API_KEY || 'proxy-injected', B = 'https://api.meshy.ai/openapi';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), M = path.join(root, 'assets', 'models');
const T = JSON.parse(fs.readFileSync(path.join(M, 'personagens', 'tasks.json'), 'utf8'));
const call = async u => { const r = await fetch(B + u, { headers: { Authorization: 'Bearer ' + KEY } }); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); };
const get = async (url, file) => { const r = await fetch(url); if (!r.ok) throw new Error('download ' + r.status); const b = Buffer.from(await r.arrayBuffer()); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, b); return b.length; };
const INFO = {
  lucas: { nome: 'Lucas', idade: 17, desc: 'O líder do grupo. Jaqueta jeans, nunca larga a lanterna.', height: 1.74 },
  bia: { nome: 'Bia', idade: 16, desc: 'Curiosa e rápida. Moletom amarelo e mochila.', height: 1.64 },
  rafa: { nome: 'Rafa', idade: 17, desc: 'Atleta do time da escola. Corre mais que todo mundo.', height: 1.8 },
  julia: { nome: 'Júlia', idade: 16, desc: 'Gótica e calma. Nada assusta a Júlia... até hoje.', height: 1.64 },
  davi: { nome: 'Davi', idade: 15, desc: 'O mais novo. Óculos, camisa xadrez e medo de palhaço.', height: 1.62 },
  manu: { nome: 'Manu', idade: 17, desc: 'Cabelo cacheado, jaqueta vermelha, a mais corajosa.', height: 1.64 }
};
const man = JSON.parse(fs.readFileSync(path.join(M, 'manifest.json'), 'utf8'));
man.characters = [];
for (const [id, t] of Object.entries(T)) {
  if (!INFO[id] || !t.rig) continue;
  try {
    const rig = await call('/v1/rigging/' + t.rig), ref = await call('/v2/text-to-3d/' + t.refine);
    await get(rig.result.rigged_character_glb_url, path.join(M, 'personagens', id + '.glb'));
    if (ref.thumbnail_url) await get(ref.thumbnail_url, path.join(root, 'assets', 'retratos', id + '.png'));
    man.characters.push(Object.assign({ id, file: 'personagens/' + id + '.glb', foto: 'assets/retratos/' + id + '.png' }, INFO[id]));
    console.log('baixado', id);
  } catch (e) { console.error('falhou', id, e.message); }
}
const anims = async (set, prefix) => { const out = {};
  for (const [k, o] of Object.entries(T['anim_' + prefix] || {})) { if (!o.task) continue;
    try { const a = await call('/v1/animations/' + o.task), r = a.result || {}, url = r.animation_glb_url || r.glb_url || (r.animation_urls && r.animation_urls.glb);
      if (!url) { console.error('sem GLB', prefix, k, JSON.stringify(Object.keys(r))); continue; }
      await get(url, path.join(M, 'anim', prefix + '_' + k + '.glb')); out[k] = 'anim/' + prefix + '_' + k + '.glb'; console.log('animação', prefix, k);
    } catch (e) { console.error('animação falhou', prefix, k, e.message); } }
  return out; };
man.teenAnims = await anims(T, 'teen');
const clown = await anims(T, 'clown');
man.enemy.anims = Object.assign({ walk: 'palhaco_walk.glb', run: 'palhaco_run.glb' }, clown);
fs.writeFileSync(path.join(M, 'manifest.json'), JSON.stringify(man, null, 1));
console.log('manifesto:', man.characters.length, 'personagens,', Object.keys(man.teenAnims).length, 'animações de adolescente,', Object.keys(clown).length, 'do palhaço');

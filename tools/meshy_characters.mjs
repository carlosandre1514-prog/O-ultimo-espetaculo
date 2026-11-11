#!/usr/bin/env node
/* Gera os 6 adolescentes no Meshy (texto -> 3D -> refino -> remesh 25k -> esqueleto) e a biblioteca de
   animações (uma vez por esqueleto: os rigs do Meshy usam os mesmos 24 ossos, então os clipes servem a
   todos). Retomável: IDs em assets/models/personagens/tasks.json. Uso: MESHY_API_KEY=... node tools/meshy_characters.mjs */
import fs from 'fs'; import path from 'path';
const KEY = process.env.MESHY_API_KEY || 'proxy-injected', B = 'https://api.meshy.ai/openapi';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), dir = path.join(root, 'assets', 'models', 'personagens');
const tPath = path.join(dir, 'tasks.json'), T = fs.existsSync(tPath) ? JSON.parse(fs.readFileSync(tPath, 'utf8')) : {}; const save = () => fs.writeFileSync(tPath, JSON.stringify(T, null, 1));
const base = 'full body game character, standing in T-pose, arms straight out, realistic proportions, Brazilian teenager, detailed clothing, PBR textures, single character, no base, no props in hands';
const TEENS = {
  lucas: 'teenage boy 17 years old, short dark brown hair, faded blue denim jacket over black band t-shirt, dark jeans, worn white sneakers, ' + base,
  bia: 'teenage girl 16 years old, long brown hair in ponytail, yellow hoodie, small backpack straps, ripped light jeans, canvas sneakers, ' + base,
  rafa: 'athletic teenage boy 17 years old, black skin, short curly hair, backwards red cap, green soccer jersey, black shorts, running shoes, ' + base,
  julia: 'gothic teenage girl 16 years old, pale skin, straight black hair with bangs, black long sleeve top, dark plaid skirt, black tights, combat boots, ' + base,
  davi: 'nerdy teenage boy 15 years old, glasses, messy hair, red plaid flannel shirt over grey t-shirt, khaki pants, sneakers, ' + base,
  manu: 'teenage girl 17 years old, brown skin, big curly hair, red bomber jacket, white t-shirt, denim skirt, black leggings, high-top sneakers, ' + base
};
// clipes (action_id da biblioteca do Meshy)
const TEEN_ANIMS = { idle: 0, walk: 30, run: 16, jump: 466, crouch: 616, pickup: 276, door: 285, torch: 337, strangled: 186, dead: 8, scared: 391 };
const CLOWN_ANIMS = { idle: 0, stalk: 559, chase: 509, scream: 386, search: 341, grab: 389, stab: 237, door: 285 };
const call = async (m, u, b) => { const r = await fetch(B + u, { method: m, headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); if (!r.ok) throw new Error(m + ' ' + u + ' ' + r.status + ' ' + (await r.text())); return r.json(); };
const wait = async (u) => { for (;;) { const t = await call('GET', u); if (t.status === 'SUCCEEDED') return t; if (['FAILED', 'CANCELED', 'EXPIRED'].includes(t.status)) throw new Error(u + ' ' + t.status + ' ' + JSON.stringify(t.task_error || '')); await new Promise(r => setTimeout(r, 8000)); } };
async function step(obj, key, start, pollBase) { if (!obj[key]) { obj[key] = (await start()).result; save(); } return wait(pollBase + '/' + obj[key]); }
async function teen(name) {
  const t = T[name] = T[name] || {};
  await step(t, 'preview', () => call('POST', '/v2/text-to-3d', { mode: 'preview', prompt: TEENS[name], art_style: 'realistic', should_remesh: true, topology: 'triangle', target_polycount: 30000, symmetry_mode: 'on', pose_mode: 't-pose' }), '/v2/text-to-3d');
  await step(t, 'refine', () => call('POST', '/v2/text-to-3d', { mode: 'refine', preview_task_id: t.preview, enable_pbr: true }), '/v2/text-to-3d');
  await step(t, 'rig', () => call('POST', '/v1/rigging', { input_task_id: t.refine, height_meters: name === 'davi' ? 1.62 : name === 'rafa' ? 1.8 : name.match(/bia|julia|manu/) ? 1.64 : 1.74 }), '/v1/rigging');
  console.log('pronto', name);
}
async function anims(rigId, set, prefix) {
  const A = T['anim_' + prefix] = T['anim_' + prefix] || {};
  await Promise.all(Object.entries(set).map(async ([k, id]) => { try { const o = A[k] = A[k] || {}; await step(o, 'task', () => call('POST', '/v1/animations', { rig_task_id: rigId, action_id: id }), '/v1/animations'); console.log('animação', prefix, k); } catch (e) { console.error('animação falhou', prefix, k, e.message); } }));
}
const only = process.argv.slice(2);
const names = Object.keys(TEENS).filter(n => !only.length || only.includes(n));
await Promise.all(names.map(n => teen(n).catch(e => console.error('falhou', n, e.message))));
if (T.lucas && T.lucas.rig) await anims(T.lucas.rig, TEEN_ANIMS, 'teen');
const clownRig = JSON.parse(fs.readFileSync(path.join(root, 'assets/models/meshy_tasks.json'), 'utf8'))._inimigo_palhaco.rigging;
await anims(clownRig, CLOWN_ANIMS, 'clown');
const bal = await call('GET', '/v1/balance'); console.log('saldo', bal.balance);

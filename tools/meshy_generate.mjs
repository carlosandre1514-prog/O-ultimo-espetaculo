#!/usr/bin/env node
/* Gera modelos 3D no Meshy.ai (texto -> 3D) e registra no assets/models/manifest.json.
   Uso:  MESHY_API_KEY=... node tools/meshy_generate.mjs [nome ...]
   Sem nomes, gera todos da lista abaixo. Cada modelo: prévia (malha) -> refinamento (textura PBR)
   -> download do .glb -> entrada no manifesto com posição no mapa, altura e colisor.
   O jogo carrega o manifesto sozinho (src/engine/models.js); sem manifesto, usa os modelos procedurais. */
import fs from 'fs'; import path from 'path';
const KEY = process.env.MESHY_API_KEY; if (!KEY) { console.error('Defina MESHY_API_KEY'); process.exit(1); }
const API = 'https://api.meshy.ai/openapi/v2/text-to-3d';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), dir = path.join(root, 'assets', 'models');
const ASSETS = {
  cavalo_carrossel: { prompt: 'antique carousel horse, carved wood, chipped white and gold paint, rust on brass pole socket, abandoned, horror', sector: 'Parque', pos: [-58, 0.45, 13.5], yaw: 1.2, height: 1.7, collider: [1.4, 1.7, 0.4] },
  carrocinha_pipoca: { prompt: 'vintage 1980s popcorn cart, red and white, broken glass, rust, abandoned circus', sector: 'Entrada', pos: [-14, 0, 64], yaw: 0.4, height: 2.2, collider: [1.6, 2.2, 1.0] },
  estatua_palhaco: { prompt: 'life-size fiberglass clown statue holding balloons, faded paint, cracked face, creepy smile, abandoned amusement park', sector: 'Parque', pos: [-40, 0, 52], yaw: 2.4, height: 2.1, collider: [0.8, 2.1, 0.8] },
  canhao_circo: { prompt: 'old human cannonball circus cannon on wooden wheels, red and gold paint peeling, rust', sector: 'Deposito', pos: [52, 0, -44], yaw: 0.3, height: 1.9, collider: [3.2, 1.9, 1.4] },
  manequim_palhaco: { prompt: 'dressmaker mannequin wearing torn clown costume with ruffled collar, dusty, horror', sector: 'Bastidores', pos: [-20.5, 0, -61], yaw: 0.8, height: 1.8, collider: [0.5, 1.8, 0.5] },
  bilheteria_placa: { prompt: 'rusty vintage circus ticket sign board on wooden post, "TICKETS", bulbs broken', sector: 'Entrada', pos: [16, 0, 104], yaw: 0, height: 2.6, collider: [1.2, 2.6, 0.3] }
};
async function call(method, url, body) {
  const r = await fetch(url, { method, headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(method + ' ' + url + ' -> ' + r.status + ' ' + (await r.text()));
  return r.json();
}
async function wait(id) {
  for (;;) { const t = await call('GET', API + '/' + id); 
    if (t.status === 'SUCCEEDED') return t; if (t.status === 'FAILED' || t.status === 'CANCELED') throw new Error('tarefa ' + t.status);
    await new Promise(r => setTimeout(r, 6000)); }
}
// Gera tudo em paralelo; guarda os IDs em assets/models/meshy_tasks.json (retomável: rodar de novo
// só baixa o que já foi gerado, sem gastar créditos). --download apenas baixa.
const onlyDownload = process.argv.includes('--download');
const names = process.argv.slice(2).filter(a => !a.startsWith('--')).length ? process.argv.slice(2).filter(a => !a.startsWith('--')) : Object.keys(ASSETS);
fs.mkdirSync(dir, { recursive: true });
const manPath = path.join(dir, 'manifest.json'), man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : { props: [] };
const tPath = path.join(dir, 'meshy_tasks.json'), tasks = fs.existsSync(tPath) ? JSON.parse(fs.readFileSync(tPath, 'utf8')) : {};
const saveT = () => fs.writeFileSync(tPath, JSON.stringify(tasks, null, 2));
async function generate(name) {
  const a = ASSETS[name], t = tasks[name] = tasks[name] || {};
  if (!t.preview) { t.preview = (await call('POST', API, { mode: 'preview', prompt: a.prompt, art_style: 'realistic', topology: 'triangle', target_polycount: 12000, should_remesh: true })).result; saveT(); }
  await wait(t.preview);
  if (!t.refine) { t.refine = (await call('POST', API, { mode: 'refine', preview_task_id: t.preview, enable_pbr: true })).result; saveT(); }
  await wait(t.refine); t.done = true; saveT(); console.log('gerado', name);
}
async function download(name) {
  const a = ASSETS[name], t = tasks[name]; if (!t || !t.done) return false;
  const done = await call('GET', API + '/' + t.refine), url = done.model_urls && done.model_urls.glb; if (!url) throw new Error('sem GLB');
  const r = await fetch(url); if (!r.ok) throw new Error('download ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer()); fs.writeFileSync(path.join(dir, name + '.glb'), buf);
  man.props = (man.props || []).filter(p => p.file !== name + '.glb');
  man.props.push({ file: name + '.glb', sector: a.sector, pos: a.pos, yaw: a.yaw, height: a.height, collider: a.collider });
  fs.writeFileSync(manPath, JSON.stringify(man, null, 2)); console.log('baixado', name, (buf.length / 1024).toFixed(0), 'KB'); return true;
}
// Inimigo: o "Undead Killer Clown" da conta (remesh 30k + rigging) com clipes de andar/correr
async function downloadEnemy() {
  const t = tasks._inimigo_palhaco; if (!t || !t.rigging) return;
  const r = await call('GET', 'https://api.meshy.ai/openapi/v1/rigging/' + t.rigging), res = r.result || {}, anim = res.basic_animations || {};
  const get = async (url, file) => { const x = await fetch(url); if (!x.ok) throw new Error('download ' + x.status); const b = Buffer.from(await x.arrayBuffer()); fs.writeFileSync(path.join(dir, file), b); console.log('baixado', file, (b.length / 1024).toFixed(0), 'KB'); };
  await get(res.rigged_character_glb_url, 'palhaco.glb');
  if (anim.walking_glb_url) await get(anim.walking_glb_url, 'palhaco_walk.glb');
  if (anim.running_glb_url) await get(anim.running_glb_url, 'palhaco_run.glb');
  man.enemy = { file: 'palhaco.glb', height: 2.05, anims: { walk: 'palhaco_walk.glb', run: 'palhaco_run.glb' } };
  fs.writeFileSync(manPath, JSON.stringify(man, null, 2));
}
const valid = names.filter(n => ASSETS[n] || console.warn('desconhecido:', n));
if (!onlyDownload) await Promise.all(valid.map(n => generate(n).catch(e => console.error('falhou', n, e.message))));
try { await downloadEnemy(); } catch (e) { console.error('download pendente do palhaço -', e.message); }
for (const n of valid) { try { await download(n); } catch (e) { console.error('download pendente', n, '-', e.message); } }

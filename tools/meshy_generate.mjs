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
  for (;;) { const t = await call('GET', API + '/' + id); process.stdout.write(`\r  ${id} ${t.status} ${t.progress || 0}%   `);
    if (t.status === 'SUCCEEDED') { console.log(); return t; } if (t.status === 'FAILED' || t.status === 'CANCELED') throw new Error('tarefa ' + t.status);
    await new Promise(r => setTimeout(r, 6000)); }
}
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ASSETS);
fs.mkdirSync(dir, { recursive: true });
const manPath = path.join(dir, 'manifest.json'), man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : { props: [] };
for (const name of names) {
  const a = ASSETS[name]; if (!a) { console.warn('desconhecido:', name); continue; }
  console.log('Gerando', name);
  const prev = await call('POST', API, { mode: 'preview', prompt: a.prompt, art_style: 'realistic', topology: 'triangle', target_polycount: 12000, should_remesh: true });
  await wait(prev.result);
  const ref = await call('POST', API, { mode: 'refine', preview_task_id: prev.result, enable_pbr: true });
  const done = await wait(ref.result);
  const url = done.model_urls && done.model_urls.glb; if (!url) throw new Error('sem GLB');
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer()); fs.writeFileSync(path.join(dir, name + '.glb'), buf);
  man.props = (man.props || []).filter(p => p.file !== name + '.glb');
  man.props.push({ file: name + '.glb', sector: a.sector, pos: a.pos, yaw: a.yaw, height: a.height, collider: a.collider });
  fs.writeFileSync(manPath, JSON.stringify(man, null, 2)); console.log('  ok', (buf.length / 1024).toFixed(0), 'KB');
}

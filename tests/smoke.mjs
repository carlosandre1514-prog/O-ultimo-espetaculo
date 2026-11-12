// Teste de fumaça: abre o jogo, espera carregar, captura erros e uma imagem.
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright/index.js')); }
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.bin': 'application/octet-stream', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/json' };
export function serve(port) { return new Promise(res => { const s = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])) + (q.url.endsWith('/') ? 'index.html' : ''); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); }).listen(port, () => res(s)); }); }
export async function open(port, w = 1280, h = 720) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = []; page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning' || /NAN/.test(m.text())) errors.push(m.type() + ': ' + m.text()); else if (process.env.V) console.log(m.text()); });
  await page.goto(`http://localhost:${port}/index.html?debug${process.env.Q ? '&q=' + process.env.Q : ''}`);
  await page.waitForFunction(() => window.OE && (OE.ready || OE.loadError), null, { timeout: 240000 });
  return { browser, page, errors };
}
if (process.argv[1].endsWith('smoke.mjs')) {
  const srv = await serve(8123); const t0 = Date.now();
  const { browser, page, errors } = await open(8123);
  console.log('carregou em', ((Date.now() - t0) / 1000).toFixed(1), 's');
  const le = await page.evaluate(() => OE.loadError && OE.loadError.stack); if (le) { console.log('LOAD ERROR', le); console.log(errors.join('\n')); process.exit(1); }
  const info = await page.evaluate(() => { OE.noPointerLock = true; document.getElementById('start').click(); return { err: OE.loadError && OE.loadError.stack, sectors: OE.Sectors.list.map(s => s.name + ':' + (s.meshes||[]).length + ':' + (s.ms||0).toFixed(0) + 'ms'), colliders: OE.world.count, nav: OE.Nav.nodes.length, edges: OE.Nav.edges.length, spots: OE.Hiding.spots.length, doors: OE.doors.length }; });
  console.log(JSON.stringify(info, null, 1));
  await page.waitForTimeout(1500);
  const out = process.argv[2] || '/tmp/claude-0/smoke.png';
  await page.screenshot({ path: out });
  console.log(errors.slice(0, 30).join('\n'));
  await browser.close(); srv.close();
}

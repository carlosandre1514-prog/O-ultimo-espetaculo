'use strict';
// Versão PC: janela Electron que serve o jogo por um servidor HTTP local (127.0.0.1, porta livre),
// igual ao WebViewAssetLoader do Android -> os modelos .glb carregam via fetch sem restrição de file://.
const { app, BrowserWindow, Menu } = require('electron');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, 'www');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.txt': 'text/plain' };
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('force_high_performance_gpu');
function serve() {
  return new Promise(res => {
    const s = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const f = path.normalize(path.join(ROOT, p)); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
      fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' }); r.end(d); });
    });
    // porta fixa = mesma origem a cada abertura -> configurações (gráfico, personagem) ficam salvas
    s.once('error', () => s.listen(0, '127.0.0.1', () => res(s.address().port)));
    s.listen(47815, '127.0.0.1', () => res(s.address().port));
  });
}
app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  const port = await serve();
  const w = new BrowserWindow({ width: 1600, height: 900, fullscreen: true, backgroundColor: '#000000', autoHideMenuBar: true, title: 'O Último Espetáculo',
    webPreferences: { contextIsolation: true, backgroundThrottling: false } });
  w.webContents.on('before-input-event', (e, i) => { if (i.type === 'keyDown' && i.key === 'F11') { w.setFullScreen(!w.isFullScreen()); e.preventDefault(); } });
  w.loadURL('http://127.0.0.1:' + port + '/index.html');
});
app.on('window-all-closed', () => app.quit());

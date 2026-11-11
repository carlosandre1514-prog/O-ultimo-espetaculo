/* Service worker: guarda o jogo no aparelho para abrir sem internet. */
const CACHE = 'ultimo-espetaculo-v1';
const FILES = ["./", "index.html", "manifest.webmanifest", "icon.svg", "vendor/three.min.js", "vendor/GLTFLoader.js", "assets/enemy_body.bin", "assets/skin_m_suit.jpg", "assets/models/manifest.json", "src/engine/audio.js", "src/engine/builder.js", "src/engine/collision.js", "src/engine/core.js", "src/engine/enemy.js", "src/engine/hiding.js", "src/engine/input.js", "src/engine/interact.js", "src/engine/lighting.js", "src/engine/models.js", "src/engine/nav.js", "src/engine/player.js", "src/engine/sectors.js", "src/engine/textures.js", "src/game.js", "src/map/AbandonedPark.js", "src/map/AnimalArea.js", "src/map/Backstage.js", "src/map/CircusEntrance.js", "src/map/Dormitories.js", "src/map/MainCircusTent.js", "src/map/Underground.js", "src/map/Warehouse.js", "src/map/arch.js", "src/map/map.js", "src/map/props.js"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});

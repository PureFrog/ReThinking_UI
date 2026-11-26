// rethinking! 앱 서비스 워커 (PWA, 2026-11-26). Registered only in a production build (app/pwa.tsx).
// What it does, and nothing more:
//   - the page itself (a navigation): network first, so a new deploy shows at once; offline, the last copy of "/"
//   - /_next/static/ (file names carry a content hash): cache first, a changed file has a new name
//   - this site's other files (/assets/, /models/, /brand/, /game/, /arcade/: 3D models, art, sounds): the cached
//     copy at once, refreshed in the background, so the next visit has any change
//   - everything else, and every other site (Supabase, OpenAI, our server functions): straight to the network,
//     never cached, so sign-in, saves and live data are always fresh
const CACHE = 'rethinking-v1';
const SHELL = ['/', '/manifest.webmanifest', '/brand/icon-192.png', '/brand/icon-512.png'];
const HASHED = /^\/_next\/static\//;
const FILES = /^\/(?:assets|models|brand|game|arcade)\//;
const keep = (req, res) => { if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('rethinking-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => (url.pathname === '/' ? keep('/', res) : res))
      .catch(() => caches.match('/').then(r => r || new Response('<meta charset="utf-8"><h1>오프라인이에요</h1><p>인터넷에 연결되면 다시 열어 주세요.</p>',
        {headers: {'content-type': 'text/html; charset=utf-8'}}))));
    return;
  }
  if (HASHED.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => keep(req, res))));
    return;
  }
  if (FILES.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => {
      const fresh = fetch(req).then(res => keep(req, res)).catch(() => hit);
      if (hit) { e.waitUntil(fresh); return hit; }
      return fresh;
    }));
  }
});

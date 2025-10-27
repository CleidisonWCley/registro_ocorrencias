/* sw.js - Service Worker mínimo
   - Este arquivo demonstra como receber eventos 'push' (servidos por um backend push)
   - Em ambiente local sem servidor push, ele não será ativado
   - Para usar: hospede o site via HTTPS (ou localhost), registre o SW no cliente e siga passos VAPID (servidor)
*/
/* sw.js - Service Worker mínimo para PWA (cache offline)
   - Registre este arquivo no index.html (já feito)
   - Em produção, refine estratégia de cache, versãoamento e invalidação
*/
const CACHE_NAME = 'cbmpe-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
  // leaflet assets carregados via CDN não são cacheados aqui; você pode adicionar se necessário
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  // Simple cache-first for assets, fallback to network
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request).catch(()=> caches.match('/index.html')))
  );
});

/* Push example handler (server side needed to test) */
self.addEventListener('push', function(event) {
  let data = { title: 'CBMPE', body: 'Nova notificação' };
  try { data = event.data.json(); } catch(e){}
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body }));
});
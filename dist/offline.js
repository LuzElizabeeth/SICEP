const shellCache = 'sicep-shell-v2';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch('/', { cache: 'reload' });
    if (!response.ok) throw new Error('No se pudo guardar el inicio');
    const html = await response.clone().text();
    const assets = [...html.matchAll(/(?:src|href)="((?:app\.js|style\.css)[^"]*)"/g)]
      .map(([, path]) => '/' + path);
    const cache = await caches.open(shellCache);
    await cache.addAll(assets);
    await cache.put('/', response);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (!['/', '/index.html', '/app.js', '/style.css'].includes(url.pathname) && !url.pathname.startsWith('/assets/')) return;
  event.respondWith((async () => {
    const cache = await caches.open(shellCache);
    const key = event.request.mode === 'navigate' ? '/' : event.request;
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(key, response.clone());
      return response;
    } catch {
      return (await cache.match(key)) || Response.error();
    }
  })());
});

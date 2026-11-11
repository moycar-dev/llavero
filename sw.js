// Service worker de Traza Casa: red primero, caché como respaldo. Subir CACHE en cada publicación.
const CACHE = 'trazacasa-v29';
const FILES = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-180.png', 'favicon.svg', 'favicon-32.png', 'favicon-48.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});

/* Avisos push: el servidor manda un toque vacío; aquí se pide el texto y se muestra. */
function idbGet(k) { return new Promise((res, rej) => { const r = indexedDB.open('tc', 1); r.onupgradeneeded = () => r.result.createObjectStore('k'); r.onerror = () => rej(r.error); r.onsuccess = () => { const q = r.result.transaction('k').objectStore('k').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }; }); }
self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let titulo = 'Traza Casa', cuerpo = 'Abre la app para ver lo que tienes por hacer hoy.';
    try {
      const c = await idbGet('conn');
      if (c && c.u) {
        const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 9000);
        const r = await fetch(c.u, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'resumen', key: c.k, device: c.device, deviceName: c.deviceName || '' }), signal: ctl.signal, redirect: 'follow', credentials: 'omit' });
        clearTimeout(to);
        const j = await r.json();
        if (j && j.ok && j.titulo) { titulo = j.titulo; cuerpo = j.cuerpo || cuerpo; }
      }
    } catch (x) {}
    await self.registration.showNotification(titulo, { body: cuerpo, icon: 'icon-192.png', tag: 'tu-dia', lang: 'es' });
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => { const w = l.find(x => 'focus' in x); return w ? w.focus() : self.clients.openWindow('./'); }));
});

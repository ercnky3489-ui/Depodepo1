// BOOKFLIX servis çalışanı: uygulama kapalıyken gelen bildirimleri gösterir, dokununca ilgili sayfayı açar.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: 'BOOKFLIX', body: event.data ? event.data.text() : '' }; }
  const base = self.registration.scope;
  event.waitUntil(self.registration.showNotification(d.title || 'BOOKFLIX', {
    body: d.body || '',
    icon: base + 'icons/icon-192-v4.png',
    badge: base + 'icons/icon-192-v4.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: d.url || '' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url || '').replace(/^\//, ''), self.registration.scope).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) { await c.focus(); if ('navigate' in c) await c.navigate(target); return; } }
    await self.clients.openWindow(target);
  })());
});

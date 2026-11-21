import {
  cleanupOutdatedCaches,
  matchPrecache,
  precache
} from 'workbox-precaching';
import {
  isBuildBundlePrecached,
  isOnlyWindowClient
} from './pwaUpdatePolicy.js';

const RUNTIME_ASSET_CACHE = 'skillbridge-runtime-assets-v1';
const precacheEntries = self.__WB_MANIFEST;

precache(precacheEntries);
cleanupOutdatedCaches();

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
  if (url.pathname === '/socket.io' || url.pathname.startsWith('/socket.io/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(new Request(request, { cache: 'no-store' }));
      } catch {
        return await matchPrecache('/index.html') || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const precachedResponse = await matchPrecache(request);
    if (precachedResponse) return precachedResponse;

    if (
      url.pathname.startsWith('/assets/')
      && ['script', 'style', 'font', 'image'].includes(request.destination)
    ) {
      const cache = await caches.open(RUNTIME_ASSET_CACHE);
      const cachedResponse = await cache.match(request);
      if (cachedResponse) return cachedResponse;

      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    }

    return fetch(request);
  })());
});

self.addEventListener('message', (event) => {
  if (
    event.data?.type !== 'ACTIVATE_IF_SAFE'
    || !event.source?.id
    || !isBuildBundlePrecached(
      event.data.bundlePath,
      precacheEntries,
      self.location.href
    )
  ) {
    return;
  }

  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });
    if (!isOnlyWindowClient(windowClients, event.source.id)) return;
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith('skillbridge-runtime-assets-') && name !== RUNTIME_ASSET_CACHE)
      .map((name) => caches.delete(name)));
  })());
});

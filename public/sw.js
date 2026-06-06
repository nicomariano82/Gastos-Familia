// ============================================
// SERVICE WORKER — Gastos Familia PWA
// ============================================
const CACHE_NAME = 'gastos-familia-v1';
const CACHE_STATIC = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Instalación: guarda los archivos estáticos en caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_STATIC);
    })
  );
  self.skipWaiting();
});

// Activación: limpia cachés viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: estrategia Network First para Supabase, Cache First para estáticos
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Supabase y OpenAI: siempre red (datos en tiempo real)
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('openai.com') ||
    url.hostname.includes('anthropic.com')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Archivos estáticos: Cache First, con fallback a red
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // Guardamos en caché solo respuestas válidas
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Sin conexión y sin caché: página offline
      if (event.request.destination === 'document') {
        return caches.match('/index.html');
      }
    })
  );
});

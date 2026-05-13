const CACHE = 'bayars-crm-v1'
const STATIC_EXTS = ['.js', '.css', '.woff2', '.png', '.svg', '.ico']

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim())
))

self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // API calls: network-first, no cache
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(request).catch(() => new Response('{"error":"offline"}', {
      headers: { 'Content-Type': 'application/json' },
    })))
    return
  }

  // Static assets: cache-first
  const isStatic = STATIC_EXTS.some(ext => url.pathname.endsWith(ext))
    || url.pathname.startsWith('/_next/static/')
  if (isStatic) {
    e.respondWith(
      caches.match(request).then(cached => cached ?? fetch(request).then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(request, clone))
        return res
      }))
    )
    return
  }

  // Navigation: network-first, fall back to cache
  e.respondWith(
    fetch(request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(request, clone))
        return res
      })
      .catch(() => caches.match(request))
  )
})

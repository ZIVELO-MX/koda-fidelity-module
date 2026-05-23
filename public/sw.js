const CACHE_NAME = "koda-v1"
const STATIC_ASSETS = [
  "/dashboard",
  "/dashboard/cards",
  "/dashboard/qr-codes",
  "/dashboard/branding",
  "/dashboard/settings",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (url.origin !== self.location.origin) return

  if (request.method !== "GET") return

  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return response
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error()))
  )
})

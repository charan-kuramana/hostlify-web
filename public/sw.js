/* Hostlify service worker: shows push notifications (payment reminders, receipts, UPI checks). */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Hostlify', body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Hostlify', {
      body: data.body || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: data.url || '/' },
      tag: data.url || 'hostlify',
      renotify: true,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && 'focus' in c) {
          c.navigate(url)
          return c.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})

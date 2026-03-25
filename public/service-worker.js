// Service worker minimal pour valider l'installation PWA par Chrome
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Nécessaire pour que Chrome autorise l'installation
});

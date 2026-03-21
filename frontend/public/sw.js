// Kill-switch service worker: unregisters itself and clears all caches.
// Deployed to stop any previously-cached service worker from serving stale content.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", async () => {
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.navigate(client.url);
  }
  await self.registration.unregister();
});

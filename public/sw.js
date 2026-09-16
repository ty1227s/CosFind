const CACHE_PREFIX = "cosfind-";
const CACHE_VERSION = "pwa-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_VERSION).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

// 在庫・商品・店舗情報は鮮度を優先し、Service Workerには保存しません。
self.addEventListener("fetch", () => undefined);

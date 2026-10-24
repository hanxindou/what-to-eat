"use strict";

// 更新 APP_CACHE 版本号，可以让旧版本的离线缓存自动清理。
const APP_CACHE = "what-to-eat-static-v6";
const FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./assets/kitty.svg",
  "./assets/bow.svg",
  "./assets/heart.svg",
  "./assets/love-pattern.svg",
  "./assets/couple-feifei-fenfen.webp",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    await cache.addAll(FILES.map((file) => new URL(file, self.registration.scope).href));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("what-to-eat-static-") && key !== APP_CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  // 有网络时优先取最新文件；断网后回退至已保存的文件。
  event.respondWith((async () => {
    const cache = await caches.open(APP_CACHE);
    try {
      const fresh = await fetch(event.request);
      if (fresh.ok) await cache.put(event.request, fresh.clone());
      return fresh;
    } catch (_) {
      const saved = await cache.match(event.request);
      if (saved) return saved;
      if (event.request.mode === "navigate") {
        return (await cache.match(new URL("./index.html", self.registration.scope).href)) ?? Response.error();
      }
      return Response.error();
    }
  })());
});

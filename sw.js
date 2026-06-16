/* 沖繩 dashboard — Service Worker（離線快取 app 外殼）
   bump CACHE 同 ?v= 一齊升，就會自動清舊快取載新版。 */
const CACHE = "okinawa-v10";
const ASSETS = [
  "./", "./index.html",
  "./config.js?v=10", "./assets/app.js?v=10", "./assets/style.css?v=10",
  "./data/seed.json", "./manifest.webmanifest"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  // 跨域（gviz / script.google / Open-Meteo / iCloud）照走網絡，唔快取
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // network-first：有網攞新嘅順手更新快取；冇網先用快取
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => { });
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});

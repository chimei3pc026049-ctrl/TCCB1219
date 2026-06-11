/* 愛車支出管理 — Service Worker
   外殼快取，讓 App 可離線開啟；資料 API（Apps Script）一律走網路。
   ★ 每次更新 index.html 後，把 CACHE 版本號 +1（例 v1 → v2），手機才會抓到新版。 */

var CACHE = 'car-app-v8';
var SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;

  // 資料 API：不快取，直接走網路
  if (req.url.indexOf('script.google.com') !== -1) return;

  // 頁面導覽：優先抓最新，離線時回退快取
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (r) {
        var copy = r.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        return r;
      }).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }

  // 其他資源（圖示、字型、Chart.js）：快取優先
  e.respondWith(
    caches.match(req).then(function (cached) {
      return cached || fetch(req).then(function (r) {
        if (r && r.status === 200 && (req.method === 'GET')) {
          var copy = r.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return r;
      }).catch(function () { return cached; });
    })
  );
});

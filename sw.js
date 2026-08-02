/* ============================================================
   Life OS Service Worker
   - 缓存所有页面和资源
   - 离线优先策略
   - 文件协议（file://）下自动跳过（SW 需要 HTTPS 或 localhost）
   ============================================================ */

const CACHE_VERSION = 'lifeos-v7';
const RUNTIME_CACHE = 'lifeos-runtime-v3';

// 需要预缓存的核心资源
const PRECACHE_URLS = [
  './',
  './index.html',
  './space.html',
  './companion.html',
  './finance.html',
  './cycle.html',
  './inspiration.html',
  './decide.html',
  './profile.html',
  './app-framework.html',
  './manifest.json',
  './storage.js',
  './pwa.js',
  './app-nav.js',
  './app-detail.js',
  './theme-inline.js',
  './theme-runtime.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './icons/splash-1242x2688.png'
];

// ============ 安装 ============
self.addEventListener('install', (event) => {
  console.log('[SW] 安装中…');
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => {
        console.log('[SW] 预缓存核心资源');
        return cache.addAll(PRECACHE_URLS).catch(err => {
          // 单个文件失败不阻断整体安装
          console.warn('[SW] 部分预缓存失败:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// ============ 激活 ============
self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中…');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_VERSION && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[SW] 删除旧缓存:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ============ 拦截请求 ============
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== 'GET') return;

  // 跳过跨域请求（Google Fonts 等保持网络加载）
  if (url.origin !== location.origin && !url.protocol.startsWith('file')) {
    return;
  }

  // file:// 协议下 SW 不会真正拦截，只在 HTTP 下生效
  if (url.protocol === 'file:') {
    return;
  }

  // HTML 走「网络优先」：
  // 旧的 cache-first 会让已安装的 PWA 一直吃到旧页面，
  // 也会让 SPA 运行时 fetch 到的视图是过期的。静态资源仍保持缓存优先。
  const isHTML =
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    /\.html?$/i.test(url.pathname) ||
    url.pathname.endsWith('/');

  if (isHTML) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // 命中缓存，同时后台更新（stale-while-revalidate）
        fetch(request).then((response) => {
          if (response && response.status === 200) {
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, response.clone());
            });
          }
        }).catch(() => {});
        return cached;
      }

      // 未命中缓存，从网络获取
      return fetch(request).then((response) => {
        if (!response || response.status !== 200) return response;

        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      }).catch(() => {
        // 网络失败且无缓存：返回降级页面
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ============ 接收消息（用于强制更新） ============
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] 脚本加载完成');
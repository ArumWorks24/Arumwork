// =====================================================
// ARUM Website - Advanced Service Worker
// World-Class Performance Optimization
// =====================================================

const CACHE_NAME = 'arum-v3.0.0';
const RUNTIME_CACHE = 'arum-runtime-v3';
const OFFLINE_PAGE = '/offline.html';

// Static assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/critical.css',
  '/script.js',
  '/LOGO.png',
  '/LOGO.webp',
  '/Qr.jpeg',
  '/Aryan.webp',
  '/Umangjiii.webp',
  '/admin.html',
  '/my-work.html',
  '/blog.html',
  '/how-it-work.html',
  '/assignment-work.html',
  '/ppt-creation.html',
  '/college-project.html',
  '/video-editing.html',
  '/shorts-editing.html',
  '/photo-editing.html',
  '/thumbnail-design.html',
  '/homework-at-your-home.html',
  '/website-development.html'
];

// API endpoints that need network-first strategy
const API_ENDPOINTS = [
  'supabase.co',
  'firebase.googleapis.com',
  'firebaseio.com'
];

// =====================================================
// INSTALL EVENT - Precache Critical Assets
// =====================================================
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker v3.0.0 - Cache Fix...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching critical assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Precache failed:', err);
      })
  );
});

// =====================================================
// ACTIVATE EVENT - Cleanup Old Caches
// =====================================================
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker v3.0.0 - Cache Fix...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// =====================================================
// FETCH EVENT - Advanced Caching Strategies
// =====================================================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extensions and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle API calls with Network-First
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

// 🚀 CACHE FIX v3.0: HTML/CSS/JS network-first (fresh content)
function needsFreshContent(url) {
  const freshTypes = ['.html', '.css', '.js'];
  return freshTypes.some(type => url.pathname.endsWith(type));
}

if (needsFreshContent(url)) {
  event.respondWith(networkFirst(request));
  console.log('[SW v3.0] 🚀 Fresh fetch:', url.pathname);
  return;
}
  
  // Handle static assets (images/fonts) with Cache-First
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Handle navigation requests with Stale-While-Revalidate
  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default: Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// =====================================================
// CACHING STRATEGIES
// =====================================================

// CACHE-FIRST: For static assets (images, CSS, JS, fonts)
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    updateCache(request);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache-first failed, returning offline:', request.url);
    return caches.match('/index.html');
  }
}

// NETWORK-FIRST: For API calls
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network-first: serving from cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'You are currently offline' }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// STALE-WHILE-REVALIDATE: For navigation and dynamic content
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse.ok) {
        const cache = caches.open(RUNTIME_CACHE);
        cache.then(c => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch(() => {
      // If network fails and no cache, return offline page for navigation
      if (request.mode === 'navigate') {
        return caches.match('/index.html');
      }
      return new Response('Offline', { status: 503 });
    });

  return cachedResponse || fetchPromise;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function isStaticAsset(url) {
  const staticExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', 
    '.ico', '.woff', '.woff2', '.ttf', '.eot', '.otf', '.mp4', '.webm',
    '.pdf', '.doc', '.docx'
  ];
  
  const pathname = url.pathname;
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

function isApiRequest(url) {
  return API_ENDPOINTS.some(endpoint => url.hostname.includes(endpoint));
}

async function updateCache(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silently fail - we already have cached version
  }
}

// =====================================================
// BACKGROUND SYNC (for offline order submissions)
// =====================================================
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

async function syncOrders() {
  // Get pending orders from IndexedDB and sync
  console.log('[SW] Syncing pending orders...');
}

// =====================================================
// PUSH NOTIFICATIONS
// =====================================================
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New notification from ARUM',
    icon: '/LOGO.png',
    badge: '/LOGO.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('ARUM', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// =====================================================
// MESSAGE HANDLER (for cache updates from main thread)
// =====================================================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls;
    caches.open(CACHE_NAME).then(cache => {
      cache.addAll(urls);
    });
  }
});

console.log('[SW] Advanced Service Worker v3.0.0 loaded - 🚀 Cache Fix Active');


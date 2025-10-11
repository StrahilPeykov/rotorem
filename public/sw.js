const CACHE_NAME = 'rotorem-v1';
const STATIC_CACHE = 'rotorem-static-v1';
const DYNAMIC_CACHE = 'rotorem-dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/img/hero.webp',
  '/img/hero.avif',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/favicon-16x16.png'
];

// Assets to cache with different strategies
const CACHE_STRATEGIES = {
  images: /\.(jpg|jpeg|png|gif|webp|avif|svg)$/,
  fonts: /\.(woff|woff2|ttf|eot)$/,
  scripts: /\.(js|mjs)$/,
  styles: /\.css$/,
  pages: /\.(html|htm)$/
};

// Install event
self.addEventListener('install', function(event) {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(function(cache) {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

// Activate event
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

// Fetch event with different caching strategies
self.addEventListener('fetch', function(event) {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external requests (except fonts and analytics)
  if (url.origin !== location.origin && 
      !url.hostname.includes('fonts.gstatic.com') &&
      !url.hostname.includes('fonts.googleapis.com')) {
    return;
  }

  event.respondWith(
    getCachedResponse(request)
  );
});

async function getCachedResponse(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  try {
    // Strategy 1: Images - Cache First
    if (CACHE_STRATEGIES.images.test(pathname)) {
      return cacheFirst(request, STATIC_CACHE);
    }
    
    // Strategy 2: Fonts - Cache First (long term)
    if (CACHE_STRATEGIES.fonts.test(pathname) || url.hostname.includes('fonts')) {
      return cacheFirst(request, STATIC_CACHE);
    }
    
    // Strategy 3: Static assets - Cache First
    if (CACHE_STRATEGIES.scripts.test(pathname) || CACHE_STRATEGIES.styles.test(pathname)) {
      return cacheFirst(request, STATIC_CACHE);
    }
    
    // Strategy 4: Pages - Network First with fallback
    if (CACHE_STRATEGIES.pages.test(pathname) || pathname === '/' || pathname.endsWith('/')) {
      return networkFirst(request, DYNAMIC_CACHE);
    }
    
    // Default: Network First
    return networkFirst(request, DYNAMIC_CACHE);
    
  } catch (error) {
    console.error('[SW] Fetch error:', error);
    
    // Return offline fallback if available
    const offlineResponse = await caches.match('/offline.html');
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

// Cache First strategy
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Network error in cache first:', error);
    throw error;
  }
}

// Network First strategy
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Network failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Background sync for analytics when online
self.addEventListener('sync', function(event) {
  if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncAnalytics() {
  // Sync any pending analytics data when back online
  console.log('[SW] Syncing analytics data');
}

// Handle network errors for monitoring
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'NETWORK_ERROR') {
    // Log network errors for analytics
    console.warn('[SW] Network error reported:', event.data.url);
  }
});

// Periodic cleanup
setInterval(function() {
  cleanupCaches();
}, 24 * 60 * 60 * 1000); // Daily cleanup

async function cleanupCaches() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const requests = await cache.keys();
  
  // Remove old entries (older than 7 days)
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  for (const request of requests) {
    const response = await cache.match(request);
    const dateHeader = response.headers.get('date');
    
    if (dateHeader && new Date(dateHeader).getTime() < oneWeekAgo) {
      await cache.delete(request);
    }
  }
}

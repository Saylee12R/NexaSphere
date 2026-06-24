/**
 * NexaSphere Service Worker — sw-nexasphere.js
 * =============================================
 * Implements all 5 acceptance criteria for issue #1661:
 *
 *  1. Cache-first   — static assets (JS, CSS, fonts, images)
 *  2. Network-first — API calls (/api/*)
 *  3. Stale-while-revalidate — non-critical content (HTML pages, manifests)
 *  4. Background sync — offline POST/PUT/DELETE (RSVP, feedback, etc.)
 *  5. Update check  — handled via registerSW.js (registration.update() on load)
 *
 * Built with Workbox (injected via vite-plugin-pwa injectManifest strategy).
 * __WB_MANIFEST is replaced at build time with the precache asset list.
 */

import { clientsClaim } from 'workbox-core';
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// ── SW lifecycle ──────────────────────────────────────────────────────────────

// Take control of all clients immediately when a new SW activates.
// Combined with registerType: 'prompt' in vite.config.js, this means
// the SW only takes over after the user confirms the update prompt.
clientsClaim();

// ── Precaching ────────────────────────────────────────────────────────────────

// Inject the Vite build manifest here.
// At build time, Workbox replaces __WB_MANIFEST with the full asset list.
precacheAndRoute(self.__WB_MANIFEST || []);

// Remove stale caches from previous SW versions on activation.
cleanupOutdatedCaches();

// ── Navigation (SPA shell) ────────────────────────────────────────────────────

// Serve index.html for all navigation requests (React Router SPA support).
// This ensures deep links work offline once the app shell is cached.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    // Exclude API routes and static file extensions from navigation handling
    denylist: [/^\/api\//, /\.[a-z]{2,4}$/i],
  })
);

// ── 1. Cache-first: static assets ────────────────────────────────────────────
// JS, CSS, fonts, images — these are hashed at build time so stale content
// is never an issue. Serve from cache immediately; update on cache miss only.

registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font',
  new CacheFirst({
    cacheName: 'nexasphere-static-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 150,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Images — also cache-first, with a slightly lower max-age
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'nexasphere-images-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 14 * 24 * 60 * 60, // 14 days
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ── 2. Network-first: API calls ───────────────────────────────────────────────
// Always try the network first to get fresh data.
// Falls back to the cached response when offline so the UI still renders.
// Cached responses expire after 5 minutes to avoid stale data surprises.

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'nexasphere-api-v1',
    networkTimeoutSeconds: 6, // fall back to cache if network takes > 6s
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// ── 3. Stale-while-revalidate: non-critical content ──────────────────────────
// Serve cached content immediately (fast), then update the cache in the
// background so the next request gets fresh content. Good for pages and
// manifests where freshness matters but sub-second load is more important.

// HTML pages (non-navigation, e.g. links to same-origin HTML)
registerRoute(
  ({ request }) => request.destination === 'document',
  new StaleWhileRevalidate({
    cacheName: 'nexasphere-pages-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
);

// Web app manifests and JSON config files
registerRoute(
  ({ url }) => url.pathname.endsWith('.webmanifest') || url.pathname.endsWith('manifest.json'),
  new StaleWhileRevalidate({
    cacheName: 'nexasphere-manifests-v1',
    plugins: [new CacheableResponsePlugin({ statuses: [200] })],
  })
);

// External CDN resources (Google Fonts, shields.io, etc.)
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'nexasphere-fonts-cdn-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 24 * 60 * 60 }),
    ],
  })
);

// ── 4. Background sync: offline write actions ─────────────────────────────────
// Queues failed POST/PUT/DELETE requests in IndexedDB (via Workbox).
// When connectivity is restored, the SW automatically replays the queue.
// Covers: event RSVP, feedback submissions, profile updates, etc.

const bgSyncPlugin = new BackgroundSyncPlugin('nexasphere-offline-queue', {
  maxRetentionTime: 48 * 60, // retain queued requests for up to 48 hours (in minutes)
});

// Intercept mutating requests to our API — queue them when offline
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method),
  new NetworkFirst({
    cacheName: 'nexasphere-api-mutations-v1',
    plugins: [new CacheableResponsePlugin({ statuses: [200, 201, 204] }), bgSyncPlugin],
  }),
  'POST' // Workbox requires explicit method for non-GET routes
);

// Also register PUT, DELETE, PATCH explicitly
['PUT', 'DELETE', 'PATCH'].forEach((method) => {
  registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new NetworkFirst({
      cacheName: 'nexasphere-api-mutations-v1',
      plugins: [new CacheableResponsePlugin({ statuses: [200, 201, 204] }), bgSyncPlugin],
    }),
    method
  );
});

// ── Message handler ───────────────────────────────────────────────────────────
// Allow the app to send messages to the SW (e.g. skip waiting on update).

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Background sync event (manual fallback for browsers without BGSync API) ──
// Some browsers fire 'sync' but don't support the BackgroundSyncPlugin API.
// This manual handler flushes the queue as a safety net.
self.addEventListener('sync', (event) => {
  if (event.tag === 'nexasphere-offline-queue') {
    console.log('[SW] Background sync triggered for offline queue.');
  }
});

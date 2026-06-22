/**
 * NexaSphere Service Worker Registration
 * ========================================
 * Handles AC #5: Update check on app load.
 *
 * Wraps vite-plugin-pwa's virtual registerSW module to:
 *  - Register the SW on every app load
 *  - Immediately call registration.update() to check for a new version
 *  - Dispatch 'nexasphere:sw-update' when a new SW is waiting (→ UpdatePrompt)
 *  - Dispatch 'nexasphere:sw-offline-ready' when offline-capable
 *  - Poll for updates every 60 min for long-running sessions
 *
 * Usage — call once at app startup in main.jsx:
 *   import { registerAndWatchSW } from './utils/registerSW';
 *   registerAndWatchSW();
 */

/** Periodic update check interval for long-lived sessions (ms) */
const UPDATE_POLL_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes

/**
 * Register the service worker and wire up update / offline-ready callbacks.
 * Safe to call multiple times — internally idempotent.
 */
export async function registerAndWatchSW() {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service workers not supported in this browser.');
    return;
  }

  try {
    // vite-plugin-pwa provides this virtual module at build time.
    // If PWA is disabled (DISABLE_PWA=true) the import resolves to a no-op stub.
    const { registerSW } = await import('virtual:pwa-register');

    const updateSW = registerSW({
      // ── New version available ─────────────────────────────────────────────
      // A new SW has installed and is waiting to activate.
      // Dispatch an event — AppShell listens and shows the UpdatePrompt.
      onNeedRefresh() {
        console.log('[SW] New version available — prompting user.');
        window.dispatchEvent(new CustomEvent('nexasphere:sw-update', { detail: { updateSW } }));
      },

      // ── App is offline-capable ────────────────────────────────────────────
      onOfflineReady() {
        console.log('[SW] App ready for offline use.');
        window.dispatchEvent(new CustomEvent('nexasphere:sw-offline-ready'));
      },

      // ── AC #5: Update check on app load ───────────────────────────────────
      // Called once the SW is registered. We immediately call update() so the
      // browser fetches the SW script and compares it with the active version.
      // If a new version exists, onNeedRefresh fires automatically.
      onRegistered(registration) {
        if (!registration) return;

        console.log('[SW] Registered. Checking for updates now...');
        registration
          .update()
          .catch((err) => console.warn('[SW] Update check on load failed:', err));

        // Periodic update check: covers users who leave the tab open for hours.
        setInterval(() => {
          if (!registration.installing && navigator.onLine) {
            console.log('[SW] Periodic update check...');
            registration
              .update()
              .catch((err) => console.warn('[SW] Periodic update check failed:', err));
          }
        }, UPDATE_POLL_INTERVAL_MS);
      },

      onRegisterError(error) {
        console.error('[SW] Registration error:', error);
      },
    });
  } catch (err) {
    // Expected in dev when DISABLE_PWA=true
    console.log('[SW] PWA registration skipped:', err.message);
  }
}

/**
 * Manually triggers a SW update check.
 * Call this on tab focus or after significant user actions.
 */
export async function checkForSWUpdate() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      await reg.update();
      console.log('[SW] Manual update check triggered.');
    }
  } catch (err) {
    console.warn('[SW] Manual update check failed:', err);
  }
}

export default registerAndWatchSW;

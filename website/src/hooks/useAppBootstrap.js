import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient.js';
import {
  getLocalEvents,
  mergeEvents,
  subscribePublicContent,
  initStorageSyncBridge,
} from '../utils/publicContentStore.js';
import { initializeSocket, on, off, joinRoom } from '../utils/socketClient.js';
import { events as fallbackEvents } from '../data/eventsData';

/**
 * Custom hook to bootstrap global systems:
 * - Socket connection and rooms
 * - Cross-origin localStorage sync bridge
 * - Event data fetching and sync
 * - Push notifications initialization
 * - Service Worker update notifications
 */
export function useAppBootstrap(cinDone) {
  const [eventsData, setEventsData] = useState(() => getLocalEvents(fallbackEvents));
  const [swUpdateFn, setSwUpdateFn] = useState(null);

  // Socket + cross-origin localStorage sync
  useEffect(() => {
    const socket = initializeSocket();
    if (socket) {
      joinRoom('events-room');
      joinRoom('notifications-room');
    }
    initStorageSyncBridge();
    const onPostMessage = (e) => {
      if (e.data && e.data.type === 'ns-content-updated' && e.data.key) {
        window.dispatchEvent(new Event('ns-content-updated'));
      }
    };
    window.addEventListener('message', onPostMessage);
    return () => window.removeEventListener('message', onPostMessage);
  }, []);

  // Events data fetching
  useEffect(() => {
    let alive = true;
    const base = (import.meta?.env?.VITE_API_BASE || '').replace(/\/+$/, '');
    const applyLocalEvents = () => {
      if (alive) setEventsData(getLocalEvents(fallbackEvents));
    };

    if (!base) {
      applyLocalEvents();
      return subscribePublicContent(applyLocalEvents);
    }

    const url = `${base}/api/content/events`;
    const fetchEvents = () => {
      apiClient(url)
        .then((data) => {
          if (!alive) return;
          if (data && Array.isArray(data.events)) {
            setEventsData(
              data.events.length
                ? mergeEvents(fallbackEvents, data.events)
                : getLocalEvents(fallbackEvents)
            );
          } else if (Array.isArray(data)) {
            setEventsData(
              data.length ? mergeEvents(fallbackEvents, data) : getLocalEvents(fallbackEvents)
            );
          } else {
            setEventsData(getLocalEvents(fallbackEvents));
          }
        })
        .catch(() => {
          if (!alive) return;
          setEventsData((prev) => (prev?.length ? prev : getLocalEvents(fallbackEvents)));
        });
    };

    fetchEvents();
    // Re-fetch once when the tab becomes visible again after being backgrounded.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchEvents();
    };
    const onContentUpdated = (data) => {
      if (data?.type === 'events' || data?.type === 'activities') fetchEvents();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    on('content:updated', onContentUpdated);

    return () => {
      alive = false;
      off('content:updated', onContentUpdated);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Push notifications
  useEffect(() => {
    if (!cinDone) return;
    const initPush = async () => {
      try {
        const { initializePushNotifications } = await import('../utils/pushNotificationClient');
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
        if (vapidKey) await initializePushNotifications(vapidKey);
      } catch (err) {
        console.warn('Push notification initialization skipped:', err);
      }
    };
    const timer = setTimeout(initPush, 3500);
    return () => clearTimeout(timer);
  }, [cinDone]);

  // SW update prompt listener
  useEffect(() => {
    const handle = (e) => {
      if (e.detail?.updateSW) setSwUpdateFn(() => e.detail.updateSW);
    };
    window.addEventListener('nexasphere:sw-update', handle);
    return () => window.removeEventListener('nexasphere:sw-update', handle);
  }, []);

  return {
    eventsData,
    swUpdateFn,
  };
}

export default useAppBootstrap;

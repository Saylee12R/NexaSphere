export async function trackNotificationSent(payload = {}) {
  try {
    await fetch('/api/notifications/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'notification_sent', ...payload }),
    });
  } catch (e) {
    console.debug('analytics send failed', e.message);
  }
}

export async function trackNotificationOpened(payload = {}) {
  try {
    await fetch('/api/notifications/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'notification_opened', ...payload }),
    });
  } catch (e) {
    console.debug('analytics open failed', e.message);
  }
}

export async function trackNotificationAction(payload = {}) {
  try {
    await fetch('/api/notifications/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'notification_action', ...payload }),
    });
  } catch (e) {
    console.debug('analytics action failed', e.message);
  }
}

export default { trackNotificationSent, trackNotificationOpened, trackNotificationAction };

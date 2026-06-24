import { prefsGet, prefsSet } from '../../utils/indexedDB';

const API_BASE = '';
const LOCAL_KEY = 'ns_notification_preferences_local';

export async function fetchPreferences(userId = 'global') {
  try {
    const res = await fetch(
      `${API_BASE}/api/notifications/preferences?userId=${encodeURIComponent(userId)}`
    );
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    return data.preferences || [];
  } catch (err) {
    // fallback to indexedDB
    const local = await prefsGet(LOCAL_KEY, {});
    return local[userId] || [];
  }
}

export async function setPreference(userId = 'global', category, payload = {}) {
  try {
    const res = await fetch('/api/notifications/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, category, ...payload }),
    });
    if (!res.ok) throw new Error('Failed to save');
    const data = await res.json();
    return data.preference;
  } catch (err) {
    // persist locally
    const local = await prefsGet(LOCAL_KEY, {});
    local[userId] = local[userId] || [];
    const idx = local[userId].findIndex((p) => p.category === category);
    const entry = { category, ...payload };
    if (idx >= 0) local[userId][idx] = { ...local[userId][idx], ...entry };
    else local[userId].push(entry);
    await prefsSet(LOCAL_KEY, local);
    return entry;
  }
}

export async function setPreferencesBulk(userId = 'global', preferences = []) {
  try {
    const res = await fetch('/api/notifications/preferences/bulk', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, preferences }),
    });
    if (!res.ok) throw new Error('Failed to save bulk');
    const data = await res.json();
    return data.preferences || [];
  } catch (err) {
    const local = await prefsGet(LOCAL_KEY, {});
    local[userId] = preferences;
    await prefsSet(LOCAL_KEY, local);
    return preferences;
  }
}

export default { fetchPreferences, setPreference, setPreferencesBulk };

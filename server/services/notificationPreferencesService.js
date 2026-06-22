import { notificationPreferencesRepository } from '../repositories/notificationPreferencesRepository.js';

function timeToMinutes(t) {
  if (!t) return null;
  // t expected as 'HH:MM:SS' or 'HH:MM'
  const parts = String(t)
    .split(':')
    .map((p) => parseInt(p, 10));
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export async function shouldDeliver(
  userId = 'global',
  category = 'system',
  channel = 'push',
  isCritical = false
) {
  // Load user preferences
  const prefs = await notificationPreferencesRepository.list(userId);
  const map = {};
  for (const p of prefs || []) map[p.category] = p;

  const categoryPref = map[category] || map['global'] || null;
  const globalPref = map['global'] || null;

  // If critical, deliver unless explicitly disabled in category
  const effective = categoryPref || {};

  // Channel check
  const channelEnabled = (() => {
    if (channel === 'push') return effective.push ?? true;
    if (channel === 'email') return effective.email ?? true;
    if (channel === 'sms') return effective.sms ?? true;
    return true;
  })();

  if (!channelEnabled && !isCritical) return { deliver: false, reason: 'channel_disabled' };

  // DND check (global or per-user)
  const dnd = effective.dnd === true || (globalPref && globalPref.dnd === true);
  if (dnd && !isCritical) return { deliver: false, reason: 'dnd' };

  // Quiet hours
  const qs = effective.quiet_start || (globalPref && globalPref.quiet_start) || null;
  const qe = effective.quiet_end || (globalPref && globalPref.quiet_end) || null;
  const qStart = timeToMinutes(qs);
  const qEnd = timeToMinutes(qe);
  if (qStart !== null && qEnd !== null && !isCritical) {
    const now = nowMinutes();
    const within = qStart <= qEnd ? now >= qStart && now < qEnd : now >= qStart || now < qEnd;
    if (within) return { deliver: false, reason: 'quiet_hours' };
  }

  // Frequency: immediate vs digest — note: digest handling is handled elsewhere
  const freq = effective.frequency || (globalPref && globalPref.frequency) || 'immediate';

  return { deliver: true, frequency: String(freq || 'immediate') };
}

export default { shouldDeliver };

import { notificationAnalyticsRepository } from '../repositories/notificationAnalyticsRepository.js';
import { pushSubscriptionsRepository } from '../repositories/pushSubscriptionsRepository.js';
import { notificationsRepository } from '../repositories/notificationsRepository.js';
import { HAS_SUPABASE, supabaseRequest } from '../storage/supabaseClient.js';
import { createDigestPayload } from './notificationBatcher.js';
import webpush from 'web-push';
import { shouldDeliver } from './notificationPreferencesService.js';

/**
 * Orchestrates notification delivery based on user preferences and behavior.
 */
class NotificationsService {
  constructor() {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:admin@nexasphere.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    }
  }

  async addNotification(userId, data) {
    const {
      type = 'info',
      title,
      message,
      link = null,
      // Optional new smart-notification fields
      eventId = null,
      sender = null,
      category = type,
      dedupeKey = null,
      snoozedUntil = null,
      groupType = null,
      groupKey = null,
      actions = null,
      image = null,
      critical = false,
      data: richData = null,
    } = data;

    // 1. Smart priority scoring + classification
    const { priorityClass, priorityScore } = this.computePriority({
      type,
      title,
      message,
      richData,
    });

    // 2. Dedupe (skip if same dedupeKey exists)
    if (dedupeKey) {
      const existing = await notificationsRepository.findDuplicate({
        userId,
        dedupeKey,
      });
      if (existing) return existing;
    }

    // 3. Preference enforcement (quiet hours/DND/channel toggles)
    const result = await shouldDeliver(userId, category, 'push', priorityClass === 'urgent');
    if (!result.deliver) return;

    // Snooze: if snoozedUntil is in the future, don't deliver now
    const now = Date.now();
    if (snoozedUntil && new Date(snoozedUntil).getTime() > now) {
      // Still persist in DB for in-app Center; push/email are deferred
      // Frequency scheduling is handled below.
    }

    // 4. Smart Fatigue Adjustment
    const activity = await notificationAnalyticsRepository.getUserActivityMetrics(userId);

    let effectiveFrequency = result.frequency;

    // Feature: If user hasn't opened app in 5 days, increase frequency (bypass digest)
    if (activity.daysSinceLastActive >= 5 && effectiveFrequency !== 'disabled') {
      effectiveFrequency = 'immediate';
    }
    // Feature: If user opens app 10+ times per day, reduce frequency for low-priority items
    if (activity.dailyActiveCount >= 10 && type === 'recommendations') {
      effectiveFrequency = 'daily_digest';
    }

    // Create the notification record in DB
    const id =
      data.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2));

    const note = await notificationsRepository.create({
      id,
      userId,
      type,
      title,
      message,
      link,
      isRead: data.isRead || false,

      priorityClass,
      priorityScore,

      dedupeKey: dedupeKey || null,
      snoozedUntil: snoozedUntil || null,

      groupType: groupType || this.inferGroupType({ type, eventId, sender }),
      groupKey: groupKey || this.inferGroupKey({ type, eventId, sender, dedupeKey }),
      sender,
      eventId,

      image: image || richData?.image || null,
      actions: actions || richData?.actions || null,
      data: richData || data.data || null,
      critical: critical || Boolean(richData?.security || critical),
      archivedAt: data.archivedAt ?? null,
    });

    if (effectiveFrequency === 'immediate') {
      await this.sendNow(userId, { ...data, id });
    } else if (effectiveFrequency !== 'disabled') {
      await this.addToDigest(userId, effectiveFrequency, { ...data, id });
    }

    // Real-time notification delivery (WebSocket)
    try {
      const { emitToRoom } = await import('../config/socket.js');
      emitToRoom('notifications', 'notifications:new', { userId, notification: note });
    } catch {
      // non-fatal
    }

    return note;
  }

  async sendNow(userId, data) {
    const subs = await pushSubscriptionsRepository.listByUser(userId);
    const payload = JSON.stringify({
      notification: {
        title: data.title,
        body: data.message,
        icon: '/pwa-192x192.png',
        data: { link: data.link || '/', type: data.type, id: data.id },
        actions: data.actions || [{ action: 'dismiss', title: 'Dismiss' }],
      },
    });

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, payload);
          await notificationAnalyticsRepository.logEvent(userId, data.id, 'delivered');
        } catch (err) {
          if (err.statusCode === 410) await pushSubscriptionsRepository.remove(sub.endpoint);
        }
      })
    );
  }

  async addToDigest(userId, frequency, data) {
    if (!HAS_SUPABASE) return;
    await supabaseRequest('pending_digests', {
      method: 'POST',
      body: [{ user_id: userId, frequency, notification_data: data }],
    });
  }

  async queueForLater(userId, data, reason) {
    if (!HAS_SUPABASE) return;
    await supabaseRequest('queued_notifications', {
      method: 'POST',
      body: [{ user_id: userId, reason, notification_data: data }],
    });
  }

  /**
   * Smart Batching: Group multiple items into a single summary notification
   */
  async processDigests(frequency) {
    const digests = await supabaseRequest(`pending_digests?frequency=eq.${frequency}`);
    if (!digests || digests.length === 0) return;

    const userGroups = digests.reduce((acc, d) => {
      acc[d.user_id] = acc[d.user_id] || [];
      acc[d.user_id].push(d.notification_data);
      return acc;
    }, {});

    for (const [userId, items] of Object.entries(userGroups)) {
      if (items.length === 1) {
        await this.sendNow(userId, items[0]);
      } else {
        const digest = createDigestPayload(userId, items, frequency);
        await this.sendNow(userId, {
          id: `digest-${Date.now()}`,
          title: digest.title,
          message: digest.body,
          type: 'digest',
          link: '/notifications',
        });
      }
    }
    // Cleanup processed digests
    await supabaseRequest(`pending_digests?frequency=eq.${frequency}`, { method: 'DELETE' });
  }

  computePriority({ type, title, message, richData }) {
    // Maintainer rules (rules-based baseline)
    // urgent: cancelled, deadline approaching (<24h), security alert
    // high: reminder tomorrow, new message from mentor, assignment due
    // medium: matches interests, friend registered, achievement unlocked
    // low: weekly digest, recommendation, community update

    const text =
      `${type || ''} ${title || ''} ${message || ''} ${richData?.title || ''} ${richData?.message || ''}`.toLowerCase();

    // Attempt to read canonical hints from rich data if present
    const flags = {
      cancelled: Boolean(richData?.cancelled),
      security: Boolean(richData?.security),
      deadlineAt: richData?.deadlineAt || richData?.dueAt || richData?.startAt || null,
      isReminder: Boolean(richData?.reminder),
      mentorMessage: Boolean(richData?.mentorMessage),
      assignmentDue: Boolean(richData?.assignmentDue),
      friendRegistered: Boolean(richData?.friendRegistered),
      achievementUnlocked: Boolean(richData?.achievementUnlocked),
      weeklyDigest: Boolean(richData?.weeklyDigest),
      recommendation: Boolean(richData?.recommendation),
      communityUpdate: Boolean(richData?.communityUpdate),
    };

    let deadlineSoon = false;
    if (flags.deadlineAt) {
      const ms = new Date(flags.deadlineAt).getTime() - Date.now();
      deadlineSoon = Number.isFinite(ms) && ms >= 0 && ms < 24 * 60 * 60 * 1000;
    }

    let priorityClass = 'low';
    let priorityScore = 0;

    if (
      flags.cancelled ||
      flags.security ||
      deadlineSoon ||
      text.includes('security alert') ||
      text.includes('cancelled')
    ) {
      priorityClass = 'urgent';
      priorityScore = 100;
    } else if (
      flags.isReminder ||
      flags.mentorMessage ||
      flags.assignmentDue ||
      text.includes('reminder') ||
      text.includes('mentor') ||
      text.includes('assignment')
    ) {
      priorityClass = 'high';
      priorityScore = 70;
    } else if (
      flags.friendRegistered ||
      flags.achievementUnlocked ||
      text.includes('friend registered') ||
      text.includes('achievement') ||
      text.includes('matches')
    ) {
      priorityClass = 'medium';
      priorityScore = 40;
    } else {
      // Low: weekly digest, recommendation, community update
      priorityClass = 'low';
      priorityScore = 10;
    }

    // Text-based low overrides
    if (
      flags.weeklyDigest ||
      flags.communityUpdate ||
      flags.recommendation ||
      text.includes('weekly digest') ||
      text.includes('community update')
    ) {
      priorityClass = 'low';
      priorityScore = 5;
    }

    return { priorityClass, priorityScore };
  }

  inferGroupType({ type, eventId, sender }) {
    if (eventId) return 'event';
    if (type) return 'type';
    if (sender) return 'sender';
    return 'none';
  }

  inferGroupKey({ type, eventId, sender, dedupeKey }) {
    if (eventId) return `event:${eventId}`;
    if (type) return `type:${type}`;
    if (sender) return `sender:${sender}`;
    return dedupeKey ? `dedupe:${dedupeKey}` : null;
  }

  async flushQueuedNotifications() {
    if (!HAS_SUPABASE) return;
    const queued = await supabaseRequest('queued_notifications');
    if (!queued || queued.length === 0) return;

    const userGroups = queued.reduce((acc, d) => {
      acc[d.user_id] = acc[d.user_id] || [];
      acc[d.user_id].push(d);
      return acc;
    }, {});

    for (const [userId, records] of Object.entries(userGroups)) {
      const isDND = await notificationPreferencesRepository.isDNDActive(userId);
      const inQuietHours = await notificationPreferencesRepository.isInsideQuietHours(userId);
      
      if (!isDND && !inQuietHours) {
        const items = records.map(r => r.notification_data);
        if (items.length === 1) {
          await this.sendNow(userId, items[0]);
        } else {
          const digest = createDigestPayload(userId, items, 'batch');
          await this.sendNow(userId, {
            id: `digest-${Date.now()}`,
            title: 'While you were away',
            message: digest.body,
            type: 'digest',
            link: '/notifications',
          });
        }
        
        // Remove delivered notifications from queue
        // In real world, we might do a bulk delete by user ID or IDs array
        await supabaseRequest(`queued_notifications?user_id=eq.${userId}`, { method: 'DELETE' });
      }
    }
  }

  // CRUD Pass-throughs for Repository
  async getNotifications({ userId, offset = 0, limit = 100, tab = 'all', q = null } = {}) {
    // Base list (priority ordering/unread/search handled in repository)
    const list = await notificationsRepository.list({ userId, limit, offset, tab, q });

    // If client requests priority tab, additionally return grouped payload.
    // For now, we group by groupType/groupKey when present.
    // FE can render expandable groups.
    if (tab === 'priority') {
      const groupsMap = new Map();
      for (const n of list) {
        const gt = n.groupType || 'none';
        const gk = n.groupKey || null;
        const key = `${gt}:${gk || n.eventId || n.type || n.sender || n.id}`;

        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            groupType: gt,
            groupKey: gk,
            title:
              gt === 'event'
                ? `Event Update`
                : gt === 'sender'
                  ? `Messages from ${n.sender || 'Unknown'}`
                  : gt === 'type'
                    ? `${n.type} updates`
                    : 'Notifications',
            summaryCount: 0,
            notifications: [],
          });
        }

        const g = groupsMap.get(key);
        g.summaryCount += 1;
        g.notifications.push(n);
      }

      // Convert to array and sort groups by max priorityScore
      const grouped = Array.from(groupsMap.values()).sort((a, b) => {
        const maxA = Math.max(0, ...a.notifications.map((x) => x.priorityScore || 0));
        const maxB = Math.max(0, ...b.notifications.map((x) => x.priorityScore || 0));
        return maxB - maxA;
      });

      return grouped;
    }

    return list;
  }

  async markAsRead(userId, id) {
    const ok = await notificationsRepository.markAsRead(userId, id);
    if (ok) {
      try {
        const { emitToRoom } = await import('../config/socket.js');
        emitToRoom('notifications', 'notifications:updated', {
          userId,
          notificationId: id,
          kind: 'mark_read',
        });
      } catch {
        // non-fatal
      }
    }
    return ok;
  }

  async markAllAsRead(userId) {
    return notificationsRepository.markAllAsRead(userId);
  }
  async clearAll(userId) {
    return notificationsRepository.clearAll(userId);
  }
  async removeNotification(userId, id) {
    return notificationsRepository.remove(userId, id);
  }
}

const notificationsService = new NotificationsService();
export default notificationsService;

export const addNotification = notificationsService.addNotification.bind(notificationsService);
export const getNotifications = notificationsService.getNotifications.bind(notificationsService);
export const markAsRead = notificationsService.markAsRead.bind(notificationsService);
export const markAllAsRead = notificationsService.markAllAsRead.bind(notificationsService);
export const clearAll = notificationsService.clearAll.bind(notificationsService);
export const removeNotification =
  notificationsService.removeNotification.bind(notificationsService);

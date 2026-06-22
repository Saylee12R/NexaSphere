import { withDb } from './db.js';

export const notificationPreferencesRepository = {
  async list(userId) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM notification_preferences WHERE user_id = $1 ORDER BY category',
        [userId]
      );
      return rows;
    });
  },

  async set(userId, category, channels = {}) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO notification_preferences (user_id, category, email, push, in_app, sms, frequency, quiet_start, quiet_end, dnd, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         ON CONFLICT (user_id, category) DO UPDATE SET
           email = COALESCE($3, notification_preferences.email),
           push = COALESCE($4, notification_preferences.push),
           in_app = COALESCE($5, notification_preferences.in_app),
           sms = COALESCE($6, notification_preferences.sms),
           frequency = COALESCE($7, notification_preferences.frequency),
           quiet_start = COALESCE($8, notification_preferences.quiet_start),
           quiet_end = COALESCE($9, notification_preferences.quiet_end),
           dnd = COALESCE($10, notification_preferences.dnd),
           updated_at = NOW()
         RETURNING *`,
        [
          userId,
          category,
          channels.email ?? true,
          channels.push ?? true,
          channels.in_app ?? true,
          channels.sms ?? true,
          channels.frequency ?? 'immediate',
          channels.quiet_start ?? null,
          channels.quiet_end ?? null,
          channels.dnd ?? false,
        ]
      );
      return rows[0];
    });
  },

  async setBulk(userId, prefs) {
    return withDb(async (client) => {
      const results = [];
      for (const pref of prefs) {
        const { category, email, push, in_app, sms, frequency, quiet_start, quiet_end, dnd } = pref;
        const { rows } = await client.query(
          `INSERT INTO notification_preferences (user_id, category, email, push, in_app, sms, frequency, quiet_start, quiet_end, dnd, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
           ON CONFLICT (user_id, category) DO UPDATE SET
             email = COALESCE($3, notification_preferences.email),
             push = COALESCE($4, notification_preferences.push),
             in_app = COALESCE($5, notification_preferences.in_app),
             sms = COALESCE($6, notification_preferences.sms),
             frequency = COALESCE($7, notification_preferences.frequency),
             quiet_start = COALESCE($8, notification_preferences.quiet_start),
             quiet_end = COALESCE($9, notification_preferences.quiet_end),
             dnd = COALESCE($10, notification_preferences.dnd),
             updated_at = NOW()
           RETURNING *`,
          [
            userId,
            category,
            email ?? true,
            push ?? true,
            in_app ?? true,
            sms ?? true,
            frequency ?? 'immediate',
            quiet_start ?? null,
            quiet_end ?? null,
            dnd ?? false,
          ]
        );
        results.push(rows[0]);
      }
      return results;
    });
  },

  async get(userId, category) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM notification_preferences WHERE user_id = $1 AND category = $2 LIMIT 1',
        [userId, category]
      );
      return rows[0] || null;
    });
  },
};

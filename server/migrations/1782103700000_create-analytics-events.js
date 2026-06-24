/* Migration: Create Analytics Events Table
   Description: Creates analytics_events table to track user journey events
                for funnel analysis (page views, registrations, attendance, etc.)
   Version: 1.0.0
   Date: 2026-06-22
*/

export const up = (pgm) => {
  pgm.createTable('analytics_events', {
    id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    session_id: {
      type: 'text',
      notNull: true,
    },
    user_id: {
      type: 'text',
    },
    event_type: {
      type: 'text',
      notNull: true,
    },
    path: {
      type: 'text',
    },
    metadata: {
      type: 'jsonb',
      notNull: true,
      default: '{}',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.createIndex('analytics_events', 'event_type', { name: 'idx_analytics_events_type' });
  pgm.createIndex('analytics_events', 'session_id', { name: 'idx_analytics_events_session' });
  pgm.createIndex('analytics_events', 'user_id', { name: 'idx_analytics_events_user' });
  pgm.createIndex('analytics_events', 'created_at', {
    name: 'idx_analytics_events_created_at',
    order: 'DESC',
  });
};

export const down = (pgm) => {
  pgm.dropTable('analytics_events', { ifExists: true, cascade: true });
};

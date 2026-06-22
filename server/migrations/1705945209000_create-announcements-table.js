/* Migration: Create Announcements Table
   Description: Creates the announcements table to support scheduling, targeting, and priority
   Version: 1.0.0
   Date: 2026-06-18
*/

export const up = (pgm) => {
  pgm.createTable('announcements', {
    id: { type: 'serial', primaryKey: true },
    title: { type: 'varchar(255)', notNull: true },
    content: { type: 'text', notNull: true },
    category: { type: 'varchar(50)', notNull: true, default: 'general' },
    pinned: { type: 'boolean', notNull: true, default: false },
    status: { type: 'varchar(20)', notNull: true, default: 'published' }, // draft, scheduled, published, expired, archived
    scheduled_for: { type: 'timestamptz', notNull: false },
    expires_at: { type: 'timestamptz', notNull: false },
    target_role: { type: 'varchar(50)', notNull: true, default: 'all' },
    target_stage: { type: 'varchar(50)', notNull: true, default: 'all' },
    target_department: { type: 'varchar(100)', notNull: true, default: 'all' },
    target_graduation_year: { type: 'integer', notNull: false },
    priority: { type: 'varchar(20)', notNull: true, default: 'info' }, // info, warning, urgent
    cta_text: { type: 'varchar(100)', notNull: false },
    cta_url: { type: 'varchar(2048)', notNull: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('announcements', 'status');
  pgm.createIndex('announcements', 'scheduled_for');
  pgm.createIndex('announcements', 'expires_at');
};

export const down = (pgm) => {
  pgm.dropTable('announcements', { ifExists: true, cascade: true });
};

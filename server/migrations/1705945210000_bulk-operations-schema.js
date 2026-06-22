/* Migration: Bulk Operations Schema
   Description: Add missing fields for users and events to support bulk operations & import/export
   Version: 1.0.0
   Date: 2026-06-18
*/

export const up = (pgm) => {
  // Users table alterations
  pgm.addColumns('users', {
    status: { type: 'text', notNull: true, default: 'active' },
    tags: { type: 'jsonb', notNull: true, default: '[]' },
    major: { type: 'text' },
    year: { type: 'text' },
  });

  // Events table alterations
  pgm.addColumns('events', {
    location: { type: 'text' },
    capacity: { type: 'integer' },
  });
};

export const down = (pgm) => {
  pgm.dropColumns('users', ['status', 'tags', 'major', 'year']);
  pgm.dropColumns('events', ['location', 'capacity']);
};

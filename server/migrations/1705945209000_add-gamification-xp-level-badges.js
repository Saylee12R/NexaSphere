/* Migration: Add Gamification XP Level and Badges Fields to Users
   Description: Alters users/student_users table to track game progression elements
   Version: 1.0.0
   Date: 2026-06-20
*/

export const up = async (pgm) => {
  // Alter student_users table to support gamification
  pgm.addColumn('student_users', {
    xp: { type: 'integer', notNull: true, default: 0 },
    level: { type: 'integer', notNull: true, default: 1 },
    badges: { type: 'jsonb', notNull: true, default: '[]' },
  });

  // Alter users table to support gamification as well for consistent tracking
  pgm.addColumn('users', {
    xp: { type: 'integer', notNull: true, default: 0 },
    level: { type: 'integer', notNull: true, default: 1 },
    badges: { type: 'jsonb', notNull: true, default: '[]' },
  });

  pgm.createIndex('student_users', 'xp');
  pgm.createIndex('users', 'xp');
};

export const down = async (pgm) => {
  pgm.dropIndex('users', 'xp');
  pgm.dropIndex('student_users', 'xp');
  
  pgm.dropColumns('users', ['xp', 'level', 'badges']);
  pgm.dropColumns('student_users', ['xp', 'level', 'badges']);
};

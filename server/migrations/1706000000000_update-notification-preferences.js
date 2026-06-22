/* Migration: Extend notification_preferences with SMS, frequency, quiet hours, and DND
   Date: 2026-06-12
*/

export const up = (pgm) => {
  pgm.addColumn('notification_preferences', {
    sms: { type: 'boolean', notNull: true, default: true },
    frequency: { type: 'text', notNull: true, default: 'immediate' },
    quiet_start: { type: 'time' },
    quiet_end: { type: 'time' },
    dnd: { type: 'boolean', notNull: true, default: false },
  });
};

export const down = (pgm) => {
  pgm.dropColumn('notification_preferences', 'sms');
  pgm.dropColumn('notification_preferences', 'frequency');
  pgm.dropColumn('notification_preferences', 'quiet_start');
  pgm.dropColumn('notification_preferences', 'quiet_end');
  pgm.dropColumn('notification_preferences', 'dnd');
};

/* Migration: Add rich notification fields (image, actions, data, critical)
   Date: 2026-06-12
*/

export const up = (pgm) => {
  pgm.addColumn('notifications', {
    image: { type: 'text' },
    actions: { type: 'jsonb', notNull: false },
    data: { type: 'jsonb', notNull: false },
    critical: { type: 'boolean', notNull: true, default: false },
  });
};

export const down = (pgm) => {
  pgm.dropColumn('notifications', 'image');
  pgm.dropColumn('notifications', 'actions');
  pgm.dropColumn('notifications', 'data');
  pgm.dropColumn('notifications', 'critical');
};

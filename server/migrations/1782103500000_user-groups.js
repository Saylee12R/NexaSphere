export const shorthands = undefined;

export async function up(pgm) {
  pgm.createTable('user_groups', {
    id: 'id',
    name: { type: 'varchar(150)', notNull: true, unique: true },
    description: { type: 'text' },
    permissions: { type: 'jsonb', default: '[]' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createTable('user_group_members', {
    group_id: {
      type: 'integer',
      notNull: true,
      references: '"user_groups"',
      onDelete: 'CASCADE',
    },
    student_id: {
      type: 'integer',
      notNull: true,
      references: '"student_users"',
      onDelete: 'CASCADE',
    },
    joined_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.addConstraint('user_group_members', 'unique_group_student', {
    unique: ['group_id', 'student_id'],
  });

  pgm.addColumns('events', {
    restricted_groups: {
      type: 'jsonb',
      default: '[]',
    },
  });
}

export async function down(pgm) {
  pgm.dropColumns('events', ['restricted_groups']);
  pgm.dropTable('user_group_members', { ifExists: true, cascade: true });
  pgm.dropTable('user_groups', { ifExists: true, cascade: true });
}

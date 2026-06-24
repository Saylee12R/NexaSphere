export const up = (pgm) => {
  pgm.createTable('feature_flags', {
    key: { type: 'varchar(100)', primaryKey: true, notNull: true },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    type: { type: 'varchar(40)', notNull: true }, // boolean, percentage, user, role, environment, time
    is_active: { type: 'boolean', notNull: true, default: true },
    rollout_percentage: { type: 'integer', notNull: true, default: 100 },
    target_users: { type: 'jsonb', notNull: true, default: '[]'::jsonb },
    target_roles: { type: 'jsonb', notNull: true, default: '[]'::jsonb },
    environments: { type: 'jsonb', notNull: true, default: '[]'::jsonb },
    start_time: { type: 'timestamptz' },
    end_time: { type: 'timestamptz' },
    fallback_value: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('feature_flag_history', {
    id: { type: 'serial', primaryKey: true },
    flag_key: {
      type: 'varchar(100)',
      notNull: true,
      references: 'feature_flags',
      onDelete: 'CASCADE',
    },
    action: { type: 'varchar(50)', notNull: true },
    changed_by: { type: 'varchar(255)', notNull: true },
    old_state: { type: 'jsonb' },
    new_state: { type: 'jsonb' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('ab_test_metrics', {
    flag_key: {
      type: 'varchar(100)',
      notNull: true,
      references: 'feature_flags',
      onDelete: 'CASCADE',
    },
    group_name: { type: 'varchar(50)', notNull: true },
    participants_count: { type: 'integer', notNull: true, default: 0 },
    conversions_count: { type: 'integer', notNull: true, default: 0 },
  });

  pgm.addConstraint('ab_test_metrics', 'pk_ab_test_metrics', {
    primaryKey: ['flag_key', 'group_name'],
  });

  pgm.createIndex('feature_flag_history', 'flag_key');
};

export const down = (pgm) => {
  pgm.dropTable('ab_test_metrics', { ifExists: true, cascade: true });
  pgm.dropTable('feature_flag_history', { ifExists: true, cascade: true });
  pgm.dropTable('feature_flags', { ifExists: true, cascade: true });
};

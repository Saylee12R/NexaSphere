export const shorthands = undefined;

export const up = (pgm) => {
  // Add columns to users table
  pgm.addColumns('users', {
    password_hash: { type: 'text' },
    is_locked: { type: 'boolean', notNull: true, default: false },
    failed_login_attempts: { type: 'integer', notNull: true, default: 0 },
    locked_until: { type: 'timestamptz' },
  });

  // Add soft-delete column to portfolios
  pgm.addColumns('portfolios', {
    deleted_at: { type: 'timestamptz' },
  });

  // Create password_reset_tokens table
  pgm.createTable('password_reset_tokens', {
    id: { type: 'serial', primaryKey: true },
    user_id: { type: 'text', notNull: true, references: '"users"', onDelete: 'CASCADE' },
    token_hash: { type: 'text', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    used: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('password_reset_tokens', 'token_hash', { unique: true });
};

export const down = (pgm) => {
  pgm.dropTable('password_reset_tokens');
  pgm.dropColumns('portfolios', ['deleted_at']);
  pgm.dropColumns('users', ['password_hash', 'is_locked', 'failed_login_attempts', 'locked_until']);
};

export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE revenue_entries 
    ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'card',
    ADD COLUMN IF NOT EXISTS is_refunded BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE revenue_entries 
    DROP COLUMN IF EXISTS payment_method,
    DROP COLUMN IF EXISTS is_refunded,
    DROP COLUMN IF EXISTS refund_amount,
    DROP COLUMN IF EXISTS tax_amount;
  `);
};

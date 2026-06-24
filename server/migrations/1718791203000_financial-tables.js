export const up = (pgm) => {
  pgm.sql(`-- Financial tables for event budget management
-- Tables are created only if they do not already exist.

CREATE TABLE IF NOT EXISTS event_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID,
  name TEXT NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  start_date TIMESTAMP NULL,
  end_date TIMESTAMP NULL,
  category_allocations JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES event_budgets(id) ON DELETE CASCADE,
  event_id UUID,
  name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  category TEXT NOT NULL,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_by UUID NOT NULL,
  approved_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revenue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES event_budgets(id) ON DELETE CASCADE,
  event_id UUID,
  source TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  description TEXT,
  received_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  user_id UUID NOT NULL,
  changes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_budget_id ON expenses(budget_id);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_budget_id ON revenue_entries(budget_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_trail_record ON financial_audit_trail(record_type, record_id);
`);
};

export const down = (_pgm) => {
  // down migration not implemented
};

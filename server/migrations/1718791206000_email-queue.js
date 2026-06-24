export const up = (pgm) => {
  pgm.sql(`-- Email Queue Migration

-- Email Queue table
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT,
  template_name TEXT,
  content JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  send_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status_send_after ON email_queue (status, send_after);
CREATE INDEX IF NOT EXISTS idx_email_queue_campaign_id ON email_queue (campaign_id);
`);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS email_queue;
  `);
};

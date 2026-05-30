-- Flyway Migration: V4__Create_Certificate_System
-- Description: Add certificate management tables (templates, participants, certificates)
-- Version: 1.0.3
-- Date: 2026-05-30
-- Author: NexaSphere Core Team

-- Table 1: event_certificate_participants
-- Tracks students who registered for/attended an event
CREATE TABLE IF NOT EXISTS event_certificate_participants (
  id bigserial PRIMARY KEY,
  event_id text NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  roll_number text NOT NULL,
  status text NOT NULL DEFAULT 'REGISTERED',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_participant_status CHECK (status IN ('REGISTERED', 'ATTENDED', 'ABSENT'))
);

CREATE INDEX IF NOT EXISTS idx_participants_event ON event_certificate_participants (event_id);
CREATE INDEX IF NOT EXISTS idx_participants_email ON event_certificate_participants (email);
CREATE INDEX IF NOT EXISTS idx_participants_roll ON event_certificate_participants (roll_number);

-- Table 2: certificate_templates
-- Stores custom certificate design templates (HTML/CSS or image overlay)
CREATE TABLE IF NOT EXISTS certificate_templates (
  id bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'HTML_CSS',
  content text,
  placeholders_json text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_template_type CHECK (type IN ('HTML_CSS', 'IMAGE_OVERLAY'))
);

-- Table 3: certificates
-- Stores issued, verifiable certificates
CREATE TABLE IF NOT EXISTS certificates (
  certificate_id text PRIMARY KEY,
  event_id text NOT NULL,
  event_name text NOT NULL,
  template_id bigint,
  student_name text NOT NULL,
  student_email text NOT NULL,
  student_roll_number text NOT NULL,
  issue_date timestamptz NOT NULL DEFAULT now(),
  revoked boolean NOT NULL DEFAULT false,
  template_style text NOT NULL DEFAULT 'default',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_certificates_template FOREIGN KEY (template_id) REFERENCES certificate_templates (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_certificates_event ON certificates (event_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student_email ON certificates (student_email);
CREATE INDEX IF NOT EXISTS idx_certificates_student_roll ON certificates (student_roll_number);
CREATE INDEX IF NOT EXISTS idx_certificates_revoked ON certificates (revoked);

-- Audit trail
COMMENT ON TABLE event_certificate_participants IS 'Students registered for or attending NexaSphere events';
COMMENT ON TABLE certificate_templates IS 'Custom certificate design templates (HTML/CSS or image overlay)';
COMMENT ON TABLE certificates IS 'Issued certificates with verification IDs';

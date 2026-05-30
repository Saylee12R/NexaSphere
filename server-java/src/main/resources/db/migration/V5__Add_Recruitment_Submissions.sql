-- Flyway Migration: V5__Add_Recruitment_Submissions
-- Description: Add dedicated table for core team recruitment applications
-- Version: 1.0.4
-- Date: 2026-05-30

CREATE TABLE IF NOT EXISTS recruitment_submissions (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(255),
  college_email VARCHAR(255) UNIQUE,
  whatsapp VARCHAR(20),
  year VARCHAR(20),
  branch VARCHAR(255),
  section VARCHAR(50),
  role VARCHAR(100),
  interests VARCHAR(1000),
  skills VARCHAR(1000),
  why_join VARCHAR(2000),
  status VARCHAR(20) DEFAULT 'applied',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recruitment_email ON recruitment_submissions (college_email);
CREATE INDEX IF NOT EXISTS idx_recruitment_status ON recruitment_submissions (status);
CREATE INDEX IF NOT EXISTS idx_recruitment_submitted ON recruitment_submissions (submitted_at DESC);

COMMENT ON TABLE recruitment_submissions IS 'Core team recruitment applications';

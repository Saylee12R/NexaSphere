-- Flyway Migration: V3__Extend_Event_Metadata
-- Description: Extend events table with KSS metadata fields and dynamic gradient colors
-- Version: 1.0.2
-- Date: 2026-05-30
-- Author: NexaSphere Core Team

-- Add KSS metadata columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS has_detail_page boolean NOT NULL DEFAULT true;
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_date timestamp;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date timestamp;
ALTER TABLE events ADD COLUMN IF NOT EXISTS category varchar(40);
ALTER TABLE events ADD COLUMN IF NOT EXISTS location varchar(200);
ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity integer;

-- Create event_gradients collection table for dynamic multi-color gradients
CREATE TABLE IF NOT EXISTS event_gradients (
  event_id text NOT NULL,
  color_hex varchar(9),
  CONSTRAINT fk_event_gradients_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_gradients_event ON event_gradients (event_id);

export const up = (pgm) => {
  pgm.sql(`-- Portfolio sections table for drag-and-drop section management
-- Tables are created only if they do not already exist.

CREATE TABLE IF NOT EXISTS portfolio_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) NOT NULL REFERENCES portfolios(username) ON DELETE CASCADE,
  section_type VARCHAR(50) NOT NULL,
  section_key VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  template_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(username, section_key)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_sections_username ON portfolio_sections(username);
CREATE INDEX IF NOT EXISTS idx_portfolio_sections_order ON portfolio_sections(username, display_order);

-- Section templates for common section types
CREATE TABLE IF NOT EXISTS portfolio_section_templates (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  section_type VARCHAR(50) NOT NULL,
  default_content JSONB NOT NULL DEFAULT '{}',
  icon VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default section templates
INSERT INTO portfolio_section_templates (id, name, description, section_type, default_content, icon) VALUES
('about', 'About Me', 'Personal introduction and summary', 'about', '{"bio": "", "subtitle": ""}', 'user'),
('experience', 'Work Experience', 'Professional work history', 'experience', '{"items": []}', 'briefcase'),
('projects', 'Projects', 'Showcase of projects', 'projects', '{"items": []}', 'folder'),
('skills', 'Skills', 'Technical and soft skills', 'skills', '{"items": []}', 'star'),
('certifications', 'Certifications', 'Professional certifications', 'certifications', '{"items": []}', 'award'),
('awards', 'Awards', 'Awards and recognitions', 'awards', '{"items": []}', 'trophy'),
('education', 'Education', 'Educational background', 'education', '{"items": []}', 'book'),
('languages', 'Languages', 'Language proficiencies', 'languages', '{"items": []}', 'globe'),
('interests', 'Interests', 'Personal interests and hobbies', 'interests', '{"items": []}', 'heart'),
('publications', 'Publications', 'Published works and articles', 'publications', '{"items": []}', 'file-text'),
('speaking', 'Speaking Engagements', 'Talks and presentations', 'speaking', '{"items": []}', 'mic'),
('volunteer', 'Volunteer Work', 'Community service and volunteering', 'volunteer', '{"items": []}', 'users')
ON CONFLICT (id) DO NOTHING;
`);
};

export const down = (_pgm) => {
  // down migration not implemented
};

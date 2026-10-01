-- Add campus_city to org.institutions so the College UI can display location
ALTER TABLE org.institutions
  ADD COLUMN IF NOT EXISTS campus_city VARCHAR(255);

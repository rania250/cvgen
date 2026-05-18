ALTER TABLE generated_cvs
    ADD COLUMN IF NOT EXISTS projects JSONB;

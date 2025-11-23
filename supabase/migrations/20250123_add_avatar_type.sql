-- Add avatar_type column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar_type TEXT DEFAULT 'default';

-- Add avatar_type column to queue table
ALTER TABLE queue ADD COLUMN IF NOT EXISTS avatar_type TEXT;

-- Add comment
COMMENT ON COLUMN students.avatar_type IS 'Avatar type for user profile (default, male1-20, female1-20)';
COMMENT ON COLUMN queue.avatar_type IS 'Snapshot of avatar type when joining queue';

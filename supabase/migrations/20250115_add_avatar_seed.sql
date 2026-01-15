-- Add avatar_seed column to students table
ALTER TABLE students ADD COLUMN avatar_seed VARCHAR(255) DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX idx_students_avatar_seed ON students(avatar_seed);

-- Add avatar_style column to students table
ALTER TABLE students ADD COLUMN avatar_style VARCHAR(50) DEFAULT 'avataaars';

-- Create index for faster queries
CREATE INDEX idx_students_avatar_style ON students(avatar_style);

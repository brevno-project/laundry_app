-- Drop existing conflicting policies on students table
DROP POLICY IF EXISTS "Students can update their own avatar" ON students;
DROP POLICY IF EXISTS "Users can update own student record" ON students;
DROP POLICY IF EXISTS "Users can update their own record" ON students;

-- Create a simple policy that allows users to update only avatar_style and avatar_seed
CREATE POLICY "Students can update avatar" ON students
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

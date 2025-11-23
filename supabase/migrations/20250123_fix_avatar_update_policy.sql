-- Drop existing update policy
DROP POLICY IF EXISTS students_update_authenticated ON students;

-- Create new update policy that allows users to update their own record
CREATE POLICY students_update_authenticated ON students
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

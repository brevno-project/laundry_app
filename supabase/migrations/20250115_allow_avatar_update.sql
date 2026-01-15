-- Allow students to update their own avatar_style and avatar_seed
CREATE POLICY "Students can update their own avatar" ON students
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

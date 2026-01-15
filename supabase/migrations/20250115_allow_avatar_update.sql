-- Allow students to update their own avatar_style and avatar_seed
CREATE POLICY "Students can update their own avatar" ON students
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND (
    -- Only allow updating avatar_style and avatar_seed
    (SELECT COUNT(*) FROM (
      SELECT 1 WHERE avatar_style IS DISTINCT FROM OLD.avatar_style
      UNION ALL
      SELECT 1 WHERE avatar_seed IS DISTINCT FROM OLD.avatar_seed
    ) t) > 0
  ));

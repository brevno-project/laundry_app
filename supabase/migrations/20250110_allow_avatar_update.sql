-- Allow users to update their own avatar_type
CREATE POLICY "Users can update their own avatar"
ON students
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

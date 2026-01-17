-- Populate avatar_style and avatar_seed for existing queue records from students table
-- This fixes the issue where existing queue items don't have avatar data

UPDATE public.queue q
SET 
  avatar_style = COALESCE(s.avatar_style, 'avataaars'),
  avatar_seed = s.avatar_seed
FROM public.students s
WHERE q.student_id = s.id
  AND (q.avatar_style IS NULL OR q.avatar_style = 'avataaars');

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % queue records with avatar data from students table', updated_count;
END $$;

-- Fix queue table avatar fields to match the application code
-- The queue table currently has avatar_type, but the code expects avatar_style and avatar_seed

-- Add avatar_style and avatar_seed columns to queue table
ALTER TABLE public.queue 
  ADD COLUMN IF NOT EXISTS avatar_style VARCHAR(50) DEFAULT 'avataaars',
  ADD COLUMN IF NOT EXISTS avatar_seed VARCHAR(255);

-- Migrate existing avatar_type data to avatar_style and avatar_seed
-- Format: "style:seed" or just "style"
UPDATE public.queue
SET 
  avatar_style = CASE 
    WHEN avatar_type LIKE '%:%' THEN split_part(avatar_type, ':', 1)
    ELSE COALESCE(avatar_type, 'avataaars')
  END,
  avatar_seed = CASE 
    WHEN avatar_type LIKE '%:%' THEN split_part(avatar_type, ':', 2)
    ELSE NULL
  END
WHERE avatar_style IS NULL;

-- Update the RPC function to use queue's avatar fields instead of joining students
CREATE OR REPLACE FUNCTION public.get_queue_active_with_avatars()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  student_id uuid,
  first_name text,
  last_name text,
  full_name text,
  room text,
  wash_count integer,
  coupons_used integer,
  payment_type text,
  joined_at timestamp with time zone,
  planned_start_at timestamp with time zone,
  expected_finish_at timestamp with time zone,
  finished_at timestamp with time zone,
  note text,
  admin_message text,
  return_key_alert boolean,
  admin_room text,
  ready_at timestamp with time zone,
  key_issued_at timestamp with time zone,
  washing_started_at timestamp with time zone,
  washing_finished_at timestamp with time zone,
  return_requested_at timestamp with time zone,
  status text,
  scheduled_for_date date,
  queue_date date,
  queue_position integer,
  avatar_style text,
  avatar_seed text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.user_id,
    q.student_id,
    q.first_name,
    q.last_name,
    q.full_name,
    q.room,
    q.wash_count,
    q.coupons_used,
    q.payment_type::text,
    q.joined_at,
    q.planned_start_at,
    q.expected_finish_at,
    q.finished_at,
    q.note,
    q.admin_message,
    q.return_key_alert,
    q.admin_room,
    q.ready_at,
    q.key_issued_at,
    q.washing_started_at,
    q.washing_finished_at,
    q.return_requested_at,
    q.status::text,
    q.scheduled_for_date,
    q.queue_date,
    q.queue_position,
    -- Use queue's own avatar fields (snapshot when joined)
    COALESCE(q.avatar_style, 'avataaars')::text,
    q.avatar_seed::text
  FROM queue q
  WHERE q.status != 'done'::queue_status
  ORDER BY q.queue_position ASC;
END;
$$;

COMMENT ON COLUMN public.queue.avatar_style IS 'DiceBear avatar style snapshot when joining queue';
COMMENT ON COLUMN public.queue.avatar_seed IS 'Avatar seed snapshot when joining queue';

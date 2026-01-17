-- Fix queue avatars RLS issue: add SECURITY DEFINER to bypass RLS policies
-- This allows the function to read all students' avatar data regardless of who calls it

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
SECURITY DEFINER
SET search_path = public
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
    -- ✅ ИСПРАВЛЕНО: Берем актуальные данные из students с SECURITY DEFINER (обходит RLS)
    COALESCE(s.avatar_style, 'avataaars')::text,
    s.avatar_seed::text
  FROM queue q
  LEFT JOIN students s ON q.student_id = s.id
  WHERE q.status != 'done'::queue_status
  ORDER BY q.queue_position ASC;
END;
$$;

COMMENT ON FUNCTION public.get_queue_active_with_avatars() IS 'Returns active queue with live avatar data from students table (bypasses RLS with SECURITY DEFINER)';

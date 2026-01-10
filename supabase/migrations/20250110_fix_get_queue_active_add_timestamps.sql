-- Fix get_queue_active to include all timestamp fields needed for timers
-- This adds ready_at, key_issued_at, washing_started_at, washing_finished_at, return_requested_at
-- and other missing fields

create or replace function public.get_queue_active()
returns table(
  id uuid,
  student_id uuid,
  full_name text,
  room text,
  wash_count integer,
  payment_type text,
  joined_at timestamptz,
  planned_start_at timestamptz,
  expected_finish_at timestamptz,
  finished_at timestamptz,
  note text,
  admin_message text,
  return_key_alert boolean,
  admin_room text,
  ready_at timestamptz,
  key_issued_at timestamptz,
  washing_started_at timestamptz,
  washing_finished_at timestamptz,
  return_requested_at timestamptz,
  status text,
  scheduled_for_date date,
  queue_date date,
  queue_position integer,
  avatar_type text
)
language sql
security definer
set search_path = public
as $$
  select
    q.id,
    q.student_id,
    q.full_name,
    q.room,
    q.wash_count,
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
    q.avatar_type
  from public.queue q
  where q.status in ('waiting','ready','key_issued','washing','returning_key')
  order by q.queue_date asc, q.queue_position asc, q.joined_at asc;
$$;

-- Grant execute permissions
grant execute on function public.get_queue_active() to anon, authenticated;

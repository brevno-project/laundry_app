-- Create RPC function to get active queue for all dates
-- This replaces get_queue_public to show queue entries across all dates

create or replace function public.get_queue_active()
returns table(
  id uuid,
  student_id uuid,
  full_name text,
  room text,
  wash_count integer,
  payment_type text,
  joined_at timestamptz,
  expected_finish_at timestamptz,
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
    q.expected_finish_at,
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

-- Fix queue RPC signatures and grants after coupons_used changes

drop function if exists public.get_queue_active();
drop function if exists public.get_queue_public(date);
drop function if exists public.get_sorted_queue();

create or replace function public.get_queue_active()
returns table(
  id uuid,
  student_id uuid,
  full_name text,
  room text,
  wash_count integer,
  coupons_used integer,
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
  key_lost boolean,
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
    q.key_lost,
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

create or replace function public.get_queue_public(p_date date)
returns table(
  id uuid,
  student_id uuid,
  full_name text,
  room text,
  wash_count integer,
  coupons_used integer,
  payment_type text,
  joined_at timestamptz,
  expected_finish_at timestamptz,
  status text,
  scheduled_for_date date,
  queue_date date,
  queue_position integer,
  avatar_type text,
  key_lost boolean
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
    q.coupons_used,
    q.payment_type::text,
    q.joined_at,
    q.expected_finish_at,
    q.status::text,
    q.scheduled_for_date,
    q.queue_date,
    q.queue_position,
    q.avatar_type,
    q.key_lost
  from public.queue q
  where q.scheduled_for_date = p_date
  order by q.queue_position asc, q.joined_at asc;
$$;

create or replace function public.get_sorted_queue()
returns table(
  id uuid,
  user_id uuid,
  student_id uuid,
  full_name text,
  room text,
  joined_at timestamptz,
  planned_start_at timestamptz,
  expected_finish_at timestamptz,
  finished_at timestamptz,
  note text,
  status text,
  wash_count integer,
  coupons_used integer,
  payment_type text,
  admin_message text,
  return_key_alert boolean,
  scheduled_for_date date,
  queue_date date,
  queue_position integer
)
language plpgsql
as $$
begin
  return query
  select 
    q.id,
    q.user_id,
    q.student_id,
    q.full_name,
    q.room,
    q.joined_at,
    q.planned_start_at,
    q.expected_finish_at,
    q.finished_at,
    q.note,
    q.status,
    q.wash_count,
    q.coupons_used,
    q.payment_type,
    q.admin_message,
    q.return_key_alert,
    q.scheduled_for_date,
    q.queue_date,
    q.queue_position
  from queue q
  where q.status in ('WAITING', 'READY', 'KEY_ISSUED', 'WASHING', 'DONE', 'queued', 'waiting', 'ready', 'washing')
  order by 
    q.queue_date asc,
    q.queue_position asc,
    q.joined_at asc;
end;
$$;

grant execute on function public.get_queue_active() to anon, authenticated;
grant execute on function public.get_queue_public(date) to anon, authenticated;
grant execute on function public.get_sorted_queue() to anon, authenticated;
grant execute on function public.cleanup_coupon_queue_for_today() to authenticated;
grant execute on function public.reserve_coupons_for_queue(uuid, integer) to authenticated;
grant execute on function public.release_coupons_for_queue(uuid) to authenticated;
grant execute on function public.transfer_coupon(uuid, uuid) to authenticated;

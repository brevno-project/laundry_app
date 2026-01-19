-- Set default avatar style to thumbs.

alter table public.students
  alter column avatar_style set default 'thumbs';

alter table public.queue
  alter column avatar_style set default 'thumbs';

alter table public.history
  alter column avatar_style set default 'thumbs';

update public.students
  set avatar_style = 'thumbs'
where avatar_style is null;

update public.queue
  set avatar_style = 'thumbs'
where avatar_style is null;

update public.history
  set avatar_style = 'thumbs'
where avatar_style is null;

create or replace function public.get_queue_active_with_avatars()
returns table(
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
  avatar_style text,
  avatar_seed text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
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
    coalesce(s.avatar_style, 'thumbs')::text,
    s.avatar_seed::text
  from queue q
  left join students s on q.student_id = s.id
  where q.status != 'done'::queue_status
  order by q.queue_position asc;
end;
$$;

comment on function public.get_queue_active_with_avatars() is 'Returns active queue with live avatar data from students table (bypasses RLS with SECURITY DEFINER)';

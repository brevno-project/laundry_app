-- Cleanup schedules per block
create table if not exists public.cleanup_schedules (
  block text primary key check (block in ('A','B')),
  check_date date not null,
  check_time time,
  reminder_time time default '10:00'::time not null,
  set_by uuid references public.students(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  reminder_sent_at timestamptz
);

alter table public.cleanup_schedules enable row level security;

drop policy if exists cleanup_schedules_select_public on public.cleanup_schedules;
drop policy if exists cleanup_schedules_write_admin on public.cleanup_schedules;

create policy cleanup_schedules_select_public on public.cleanup_schedules
  for select to anon, authenticated
  using (true);

create policy cleanup_schedules_write_admin on public.cleanup_schedules
  for all to authenticated
  using (public.is_admin() or public.is_super_admin())
  with check (public.is_admin() or public.is_super_admin());

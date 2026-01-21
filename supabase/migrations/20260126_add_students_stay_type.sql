-- Add student stay type preference (weekends / 5days)

alter table public.students
  add column if not exists stay_type text not null default 'unknown';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'students_stay_type_check'
  ) then
    alter table public.students
      add constraint students_stay_type_check
      check (stay_type in ('unknown', '5days', 'weekends'));
  end if;
end $$;

-- Add UI language preference to students

alter table public.students
  add column if not exists ui_language text not null default 'ru';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'students_ui_language_check'
  ) then
    alter table public.students
      add constraint students_ui_language_check
      check (ui_language in ('ru', 'en', 'ko', 'ky'));
  end if;
end $$;

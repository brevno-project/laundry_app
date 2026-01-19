-- Add cleanup admin role flag for students

alter table public.students
  add column if not exists is_cleanup_admin boolean not null default false;

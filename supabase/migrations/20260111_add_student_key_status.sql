-- Add key status fields to students
alter table public.students
  add column if not exists key_issued boolean not null default false,
  add column if not exists key_lost boolean not null default false;

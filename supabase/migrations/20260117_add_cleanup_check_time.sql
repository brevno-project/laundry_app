-- Add check time to cleanup results
alter table public.cleanup_results
  add column if not exists check_time time;

-- Add wash_count and payment_type to history

alter table public.history
  add column if not exists wash_count integer;

alter table public.history
  add column if not exists payment_type text;

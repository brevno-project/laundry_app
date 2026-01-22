begin;

alter table public.history
  alter column user_id drop not null;

alter table public.history
  drop constraint if exists history_user_id_fkey;

alter table public.history
  add constraint history_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete set null;

commit;

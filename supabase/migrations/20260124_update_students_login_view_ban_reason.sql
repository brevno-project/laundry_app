-- Update students_login_list to include ban reason and avatar fields
create or replace view public.students_login_list as
select
  id,
  coalesce(nullif(full_name, ''), trim(concat_ws(' ', first_name, last_name, middle_name))) as full_name,
  room,
  avatar_style,
  avatar_seed,
  is_registered,
  is_banned,
  ban_reason,
  key_issued,
  key_lost
from public.students;

grant select on public.students_login_list to anon;
grant select on public.students_login_list to authenticated;

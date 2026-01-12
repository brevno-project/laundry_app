-- Update students_login_list view to include banned and key status
create or replace view public.students_login_list as
select
  id,
  full_name,
  room,
  avatar_type,
  is_registered,
  is_banned,
  key_issued,
  key_lost
from public.students;

grant select on public.students_login_list to anon;
grant select on public.students_login_list to authenticated;

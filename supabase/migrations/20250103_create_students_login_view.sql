-- Создание view для безопасного списка студентов на экране логина
-- Включает только базовые поля и проверку на бан

create or replace view public.students_login_list as
select
  id,
  full_name,
  room,
  avatar_type,
  is_registered  -- Добавлено поле статуса регистрации
from public.students
where is_banned = false;

-- Даем права на чтение view
grant select on public.students_login_list to anon;
grant select on public.students_login_list to authenticated;

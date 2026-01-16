-- Обновляем view students_login_list чтобы добавить avatar_style и avatar_seed
-- Это нужно для отображения аватаров на экране входа (когда пользователь не залогинен)

CREATE OR REPLACE VIEW public.students_login_list AS
SELECT
  id,
  COALESCE(NULLIF(full_name, ''), TRIM(CONCAT_WS(' ', first_name, last_name, middle_name))) AS full_name,
  room,
  is_registered,
  is_banned,
  key_issued,
  key_lost,
  avatar_style,
  avatar_seed
FROM public.students;

-- Права доступа
GRANT SELECT ON public.students_login_list TO anon;
GRANT SELECT ON public.students_login_list TO authenticated;

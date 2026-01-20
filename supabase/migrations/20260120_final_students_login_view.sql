-- FINAL: Update students_login_list view with all required fields
-- This view is used for login/registration - shows all students with their avatar data

DROP VIEW IF EXISTS public.students_login_list;

CREATE VIEW public.students_login_list AS
SELECT
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
FROM public.students;

-- Grant permissions
GRANT SELECT ON public.students_login_list TO anon;
GRANT SELECT ON public.students_login_list TO authenticated;

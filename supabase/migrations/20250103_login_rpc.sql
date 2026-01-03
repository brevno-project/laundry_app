-- RPC функция для безопасного логина студента
CREATE OR REPLACE FUNCTION public.login_student(
  student_id UUID,
  password TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  student_id UUID,
  full_name TEXT,
  room TEXT,
  avatar_type TEXT,
  is_admin BOOLEAN,
  is_super_admin BOOLEAN,
  can_view_students BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  student_record RECORD;
  is_banned_val BOOLEAN;
BEGIN
  -- 1. Проверяем, что студент существует и не забанен
  SELECT s.id, s.full_name, s.room, s.avatar_type, s.is_admin, s.is_super_admin, s.can_view_students, s.is_banned
  INTO student_record
  FROM public.students s
  WHERE s.id = student_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Студент не найден'::TEXT;
    RETURN;
  END IF;
  
  -- 2. Проверяем бан
  IF student_record.is_banned THEN
    RETURN QUERY SELECT FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Доступ запрещен'::TEXT;
    RETURN;
  END IF;
  
  -- 3. Проверяем регистрацию
  SELECT s.is_banned INTO is_banned_val
  FROM public.students s
  WHERE s.id = student_id AND s.is_registered = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Студент не зарегистрирован'::TEXT;
    RETURN;
  END IF;
  
  -- 4. Возвращаем данные студента для дальнейшей авторизации
  RETURN QUERY SELECT 
    TRUE,
    student_record.id,
    student_record.full_name,
    student_record.room,
    student_record.avatar_type,
    student_record.is_admin,
    student_record.is_super_admin,
    student_record.can_view_students,
    NULL::TEXT;
  
END;
$$;

-- Даем права на выполнение функции
GRANT EXECUTE ON FUNCTION public.login_student TO anon;
GRANT EXECUTE ON FUNCTION public.login_student TO authenticated;

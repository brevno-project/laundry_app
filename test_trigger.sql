-- Тестовый запрос для проверки триггера auth_email
-- Запустить в Supabase SQL Editor или через psql

-- 1. Проверяем что триггер существует
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name
FROM pg_trigger 
WHERE tgname = 'trg_set_student_auth_email';

-- 2. Проверяем что функция существует
SELECT 
    proname as function_name,
    prosrc as source_code
FROM pg_proc 
WHERE proname = 'set_student_auth_email';

-- 3. Тестируем триггер - вставляем студента без auth_email
INSERT INTO public.students (first_name, last_name, full_name, room)
VALUES ('Test', 'User', 'Test User', '999')
RETURNING id, auth_email, created_at;

-- 4. Проверяем что auth_email сгенерировался автоматически
SELECT id, first_name, auth_email 
FROM public.students 
WHERE first_name = 'Test' AND last_name = 'User';

-- 5. Удаляем тестовую запись
DELETE FROM public.students 
WHERE first_name = 'Test' AND last_name = 'User';

-- 6. Проверяем что у всех студентов auth_email не null
SELECT COUNT(*) as null_auth_emails
FROM public.students 
WHERE auth_email IS NULL;

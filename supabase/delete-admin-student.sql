-- Удалить админа swaydikon из списка студентов

-- 1. Удалить пароль
DELETE FROM student_auth 
WHERE "studentId" IN (
  SELECT id FROM students WHERE "firstName" = 'swaydikon'
);

-- 2. Удалить студента
DELETE FROM students 
WHERE "firstName" = 'swaydikon';

-- 3. Проверить что удалено
SELECT COUNT(*) as admin_count 
FROM students 
WHERE "firstName" = 'swaydikon';

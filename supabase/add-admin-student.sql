-- Добавить админского студента swaydikon

-- 1. Добавить студента в таблицу students
INSERT INTO students (firstName, lastName, fullName, room, isRegistered, registeredAt)
VALUES ('swaydikon', 'Admin', 'swaydikon Admin', 'A501', false, null)
ON CONFLICT DO NOTHING;

-- 2. Проверить что студент добавлен
SELECT id, firstName, lastName, fullName, room, isRegistered 
FROM students 
WHERE firstName = 'swaydikon';

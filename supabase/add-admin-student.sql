-- Добавить админского студента (временное решение)
-- ВНИМАНИЕ: Потом сделаем полноценную админ систему

-- 1. Добавить поле is_admin в таблицу students
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Сделать существующего студента админом
-- ЗАМЕНИТЕ 'ВАШЕ_ИМЯ' на имя реального админа
UPDATE students
SET is_admin = TRUE
WHERE "firstName" = 'ВАШЕ_ИМЯ';  -- ← ИЗМЕНИТЕ ЭТО

-- 3. Проверить админов
SELECT id, "firstName", "lastName", "fullName", is_admin
FROM students
WHERE is_admin = TRUE;

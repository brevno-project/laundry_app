-- Добавить колонку telegram_chat_id в таблицу students

-- 1. Добавить колонку если её нет
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- 2. Создать индекс для быстрого поиска по telegram_chat_id
CREATE INDEX IF NOT EXISTS idx_students_telegram_chat_id 
ON students(telegram_chat_id);

-- 3. Проверить что колонка добавлена
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' AND column_name = 'telegram_chat_id';

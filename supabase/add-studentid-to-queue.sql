-- Добавить колонку studentId в таблицу queue для связи с students

-- 1. Добавить колонку если её нет
ALTER TABLE queue 
ADD COLUMN IF NOT EXISTS "studentId" TEXT;

-- 2. Создать индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_queue_student_id 
ON queue("studentId");

-- 3. Проверить что колонка добавлена
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'queue' AND column_name = 'studentId';

-- Добавить колонку returnKeyAlert в таблицу queue для полноэкранного уведомления

-- 1. Добавить колонку если её нет
ALTER TABLE queue
ADD COLUMN IF NOT EXISTS "returnKeyAlert" BOOLEAN DEFAULT FALSE;

-- 2. Проверить что колонка добавлена
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'queue' AND column_name = 'returnKeyAlert';

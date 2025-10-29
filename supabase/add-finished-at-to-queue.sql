-- Добавить колонку finishedAt в таблицу queue для фактического времени окончания стирки

-- 1. Добавить колонку если её нет
ALTER TABLE queue
ADD COLUMN IF NOT EXISTS "finishedAt" TIMESTAMP WITH TIME ZONE;

-- 2. Создать индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_queue_finished_at
ON queue("finishedAt");

-- 3. Проверить что колонка добавлена
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'queue' AND column_name = 'finishedAt';

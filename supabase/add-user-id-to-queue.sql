-- Добавить user_id колонку в таблицу queue для связи с Supabase Auth
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Обновить существующие записи: использовать userId из queue как user_id
-- userId в queue содержит uuid или другие строки (admin_*)
UPDATE public.queue
SET user_id = "userId"::uuid
WHERE "userId" IS NOT NULL 
  AND user_id IS NULL
  AND "userId" ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$';

-- Создать индекс для user_id
CREATE INDEX IF NOT EXISTS idx_queue_user_id ON public.queue(user_id);

-- Проверить результат
SELECT id, "userId", "studentId", user_id FROM public.queue LIMIT 5;

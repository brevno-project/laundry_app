-- Добавить user_id колонку в таблицу queue для связи с Supabase Auth
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Обновить существующие записи: связать по studentId через таблицу students
UPDATE public.queue
SET user_id = s.user_id
FROM public.students s
WHERE public.queue."studentId" = s.id AND s.user_id IS NOT NULL;

-- Создать индекс для user_id
CREATE INDEX IF NOT EXISTS idx_queue_user_id ON public.queue(user_id);

-- Проверить результат
SELECT id, "userId", "studentId", user_id FROM public.queue LIMIT 5;

-- Добавить user_id колонку в таблицу queue для связи с Supabase Auth
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Если колонка уже существует как text, изменить тип на uuid
ALTER TABLE public.queue ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- Создать индекс для user_id
CREATE INDEX IF NOT EXISTS idx_queue_user_id ON public.queue(user_id);

-- Проверить результат
SELECT id, "userId", "studentId", user_id FROM public.queue LIMIT 5;

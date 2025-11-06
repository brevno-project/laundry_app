-- Добавить user_id колонку в таблицу queue для связи с Supabase Auth
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Обновить существующие записи: связать по studentId через таблицу students
-- studentId в queue - это UUID студента из students.id (хранится как text, приводим к uuid)
UPDATE public.queue
SET user_id = s.user_id
FROM public.students s
WHERE public.queue."studentId"::uuid = s.id AND s.user_id IS NOT NULL;

-- Создать индекс для user_id
CREATE INDEX IF NOT EXISTS idx_queue_user_id ON public.queue(user_id);

-- Проверить результат
SELECT q.id, q."userId", q."studentId", q.user_id, s."studentId" as student_code
FROM public.queue q
LEFT JOIN public.students s ON q."studentId"::uuid = s.id
LIMIT 5;

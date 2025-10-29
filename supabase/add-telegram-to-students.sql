-- Добавление поддержки Telegram уведомлений для студентов

-- Добавить поле telegram_chat_id
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Добавить индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_students_telegram_chat_id 
ON public.students(telegram_chat_id);

-- Добавить уникальный constraint (один Telegram = один студент)
ALTER TABLE public.students 
ADD CONSTRAINT unique_telegram_chat_id 
UNIQUE (telegram_chat_id);

COMMENT ON COLUMN public.students.telegram_chat_id IS 'Telegram Chat ID студента для персональных уведомлений';

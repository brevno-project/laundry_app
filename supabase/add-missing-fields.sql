-- Добавить недостающие поля в таблицу students
-- Эти поля используются в приложении но отсутствуют в базе данных

-- Добавить поле user_id для связи с Supabase Auth
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Добавить поле is_super_admin для супер-админов
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Добавить поле telegram_chat_id для Telegram уведомлений
ALTER TABLE students ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Добавить поля для бана студентов
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Сделать Артема супер-админом (замените на реальный firstName)
UPDATE students
SET is_super_admin = TRUE, is_admin = TRUE
WHERE "firstName" = 'Artem';

-- Проверить структуру таблицы
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'students'
ORDER BY ordinal_position;

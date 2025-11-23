-- Добавляем поле avatar для хранения выбранного SVG портрета пользователя
ALTER TABLE students
ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT 'default';

-- Комментарий к полю
COMMENT ON COLUMN students.avatar IS 'SVG avatar identifier (default, male1, male2, female1, female2, etc.)';

-- Добавляем колонку admin_room в таблицу queue
-- Эта колонка хранит комнату админа который позвал студента

ALTER TABLE queue 
ADD COLUMN IF NOT EXISTS admin_room TEXT;

-- Комментарий для документации
COMMENT ON COLUMN queue.admin_room IS 'Комната админа который позвал студента за ключом';

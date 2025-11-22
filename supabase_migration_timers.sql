-- Добавляем поля для отслеживания времени на каждом этапе
-- Это позволит показывать таймеры и собирать статистику

ALTER TABLE queue ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS key_issued_at TIMESTAMPTZ;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS washing_started_at TIMESTAMPTZ;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ;

-- Комментарии для документации
COMMENT ON COLUMN queue.ready_at IS 'Когда админ позвал студента за ключом (статус READY)';
COMMENT ON COLUMN queue.key_issued_at IS 'Когда админ выдал ключ студенту (статус KEY_ISSUED)';
COMMENT ON COLUMN queue.washing_started_at IS 'Когда студент начал стирать (статус WASHING)';
COMMENT ON COLUMN queue.return_requested_at IS 'Когда админ попросил вернуть ключ (статус RETURNING_KEY)';

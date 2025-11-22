-- Добавляем значение 'returning_key' в enum queue_status
-- Это необходимо для статуса "НЕСЕТ КЛЮЧ"

ALTER TYPE queue_status ADD VALUE IF NOT EXISTS 'returning_key';

-- Проверка: показать все значения enum
-- SELECT unnest(enum_range(NULL::queue_status));

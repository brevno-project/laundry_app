-- Добавляем student_id в таблицу history для синхронизации аватаров
-- Это поле необходимо для обновления аватаров в истории при изменении аватара студента

ALTER TABLE public.history
ADD COLUMN IF NOT EXISTS student_id uuid;

-- Обновляем существующие записи: заполняем student_id из таблицы students по user_id
UPDATE public.history h
SET student_id = s.id
FROM public.students s
WHERE h.user_id = s.user_id
AND h.student_id IS NULL;

-- Комментарий для документации
COMMENT ON COLUMN public.history.student_id IS 'ID студента из таблицы students для синхронизации аватаров';

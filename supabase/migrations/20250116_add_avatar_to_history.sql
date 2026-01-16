-- Добавляем колонки avatar_style и avatar_seed в таблицу history
-- для корректного отображения аватаров в истории

ALTER TABLE public.history
ADD COLUMN IF NOT EXISTS avatar_style varchar(50) DEFAULT 'avataaars',
ADD COLUMN IF NOT EXISTS avatar_seed varchar(255) DEFAULT NULL;

-- Комментарии для документации
COMMENT ON COLUMN public.history.avatar_style IS 'DiceBear avatar style (avataaars, lorelei, pixel-art, etc.)';
COMMENT ON COLUMN public.history.avatar_seed IS 'Custom seed for avatar generation';

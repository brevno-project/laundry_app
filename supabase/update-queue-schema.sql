-- Добавление новых полей в таблицу queue

-- Добавить поле washCount (количество стирок)
ALTER TABLE public.queue 
ADD COLUMN IF NOT EXISTS "washCount" INTEGER DEFAULT 1;

-- Добавить поле paymentType (способ оплаты)
ALTER TABLE public.queue 
ADD COLUMN IF NOT EXISTS "paymentType" TEXT;

-- Добавить поле adminMessage (сообщение от админа)
ALTER TABLE public.queue 
ADD COLUMN IF NOT EXISTS "adminMessage" TEXT;

-- Обновить существующие записи если есть
UPDATE public.queue SET "washCount" = 1 WHERE "washCount" IS NULL;

-- Изменить enum status если нужно (добавить новые статусы)
-- Примечание: PostgreSQL требует пересоздать enum для добавления значений
-- Но мы можем использовать TEXT вместо enum для гибкости
ALTER TABLE public.queue ALTER COLUMN status TYPE TEXT;

COMMENT ON COLUMN public.queue."washCount" IS 'Количество стирок (1-3)';
COMMENT ON COLUMN public.queue."paymentType" IS 'Способ оплаты: money или coupon';
COMMENT ON COLUMN public.queue."adminMessage" IS 'Сообщение от администратора студенту';

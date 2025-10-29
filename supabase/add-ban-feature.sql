-- Добавление функции бана студентов

-- Добавить поле isBanned
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- Добавить поле bannedAt
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;

-- Добавить поле banReason
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS ban_reason TEXT;

COMMENT ON COLUMN public.students.is_banned IS 'Забанен ли студент';
COMMENT ON COLUMN public.students.banned_at IS 'Когда был забанен';
COMMENT ON COLUMN public.students.ban_reason IS 'Причина бана';

-- Таблица студентов для регистрации
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  room TEXT,
  "isRegistered" BOOLEAN DEFAULT false,
  "registeredAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Включить RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Политики для чтения (все могут читать список студентов)
CREATE POLICY "Allow public read" ON public.students FOR SELECT USING (true);

-- Политики для записи (все могут регистрироваться)
CREATE POLICY "Allow all update" ON public.students FOR UPDATE USING (true);
CREATE POLICY "Allow all insert" ON public.students FOR INSERT WITH CHECK (true);

-- Включить Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;

-- Добавить студентов
INSERT INTO public.students ("firstName", "lastName", "fullName", room, "isRegistered") VALUES
  -- Block B
  ('Aigiza', '', 'Aigiza', 'B201', false),
  ('Lim Haneul', '', 'Lim Haneul', 'B201', false),
  ('Aijan', '', 'Aijan', 'B301', false),
  ('Aimira', '', 'Aimira', 'B301', false),
  ('Aizada', '', 'Aizada', 'B301', false),
  ('Sezim', 'Koichumanova', 'Sezim Koichumanova', 'B301', false),
  ('Janara', '', 'Janara', 'B302', false),
  ('Sezim', 'Kabylbekova', 'Sezim Kabylbekova', 'B302', false),
  ('Asylgul', '', 'Asylgul', 'B302', false),
  ('Uultai', '', 'Uultai', 'B302', false),
  
  -- Block A
  ('Iman', '', 'Iman', 'A201', false),
  ('Aziret', '', 'Aziret', 'A201', false),
  ('Nurtilek', '', 'Nurtilek', 'A201', false),
  ('Nurislam', 'Abdykasymov', 'Nurislam Abdykasymov', 'A201', false),
  ('Nurel', '', 'Nurel', 'A201', false),
  ('Semyon', '', 'Semyon', 'A202', false),
  ('Baihan', '', 'Baihan', 'A202', false),
  ('Nurislam', 'Abdyldaev', 'Nurislam Abdyldaev', 'A202', false),
  ('Elnatan', '', 'Elnatan', 'A301', false),
  ('David', '', 'David', 'A301', false),
  ('Aktan', '', 'Aktan', 'A301', false),
  ('Nurtilek', 'Orozbekov', 'Nurtilek Orozbekov', 'A301', false),
  ('Bektur', '', 'Bektur', 'A301', false),
  ('Sunnat', '', 'Sunnat', 'A301', false),
  ('Tamerlan', '', 'Tamerlan', 'A302', false),
  ('Joomart', '', 'Joomart', 'A302', false),
  ('Erjan', '', 'Erjan', 'A302', false),
  ('Aibek', '', 'Aibek', 'A302', false),
  ('Artem', '', 'Artem', 'A501', false),
  ('Pavel', '', 'Pavel', 'A501', false),
  ('Kylym', '', 'Kylym', 'A402', false),
  ('Azim', '', 'Azim', 'A402', false),
  ('Akbiy', '', 'Akbiy', 'A402', false),
  ('Bayastan', '', 'Bayastan', 'A402', false);

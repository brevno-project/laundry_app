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

-- Добавить примерных студентов (замените на своих)
INSERT INTO public.students ("firstName", "lastName", "fullName", room, "isRegistered") VALUES
  ('Артем', 'Андреевич', 'Артем Андреевич', 'A501', false),
  ('Иван', 'Петров', 'Иван Петров', 'A502', false),
  ('Мария', 'Сидорова', 'Мария Сидорова', 'A503', false),
  ('Дмитрий', 'Козлов', 'Дмитрий Козлов', 'A504', false),
  ('Анна', 'Смирнова', 'Анна Смирнова', 'A505', false);

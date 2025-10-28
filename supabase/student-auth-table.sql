-- Таблица для хранения паролей студентов
CREATE TABLE IF NOT EXISTS public.student_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "studentId" UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE("studentId")
);

-- Включить RLS
ALTER TABLE public.student_auth ENABLE ROW LEVEL SECURITY;

-- Политики (все могут читать и писать для простоты, так как это учебный проект)
CREATE POLICY "Allow all operations" ON public.student_auth FOR ALL USING (true) WITH CHECK (true);

-- Включить Realtime (на случай если понадобится)
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_auth;

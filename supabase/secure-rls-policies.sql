-- Безопасные RLS политики для laundry app
-- Функция для определения админа (по имени пользователя)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.students
    WHERE user_id = auth.uid()
    AND firstName ILIKE 'swaydikon'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STUDENTS TABLE - Гибкие политики для регистрации и админа
-- ========================================

-- Удалить старые политики
DROP POLICY IF EXISTS "Allow public read" ON public.students;
DROP POLICY IF EXISTS "Allow all update" ON public.students;
DROP POLICY IF EXISTS "Allow all insert" ON public.students;
DROP POLICY IF EXISTS "Students are readable by everyone" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can update students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can insert students" ON public.students;

-- Читать список студентов могут все (нужно для регистрации)
CREATE POLICY "Students list is readable by everyone" ON public.students
FOR SELECT USING (true);

-- Регистрация: неаутентифицированные пользователи могут обновлять незарегистрированных студентов
CREATE POLICY "Anonymous users can register students" ON public.students
FOR UPDATE USING (auth.uid() IS NULL AND NOT "isRegistered")
WITH CHECK (auth.uid() IS NULL AND NOT "isRegistered");

-- Аутентифицированные пользователи могут обновлять свои записи
CREATE POLICY "Users can update own student record" ON public.students
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Админ может управлять всеми записями студентов
CREATE POLICY "Admin can manage all students" ON public.students
FOR ALL USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ========================================
-- QUEUE TABLE - Строгие политики с проверкой принадлежности
-- ========================================

-- Удалить старые политики
DROP POLICY IF EXISTS "Allow all insert" ON public.queue;
DROP POLICY IF EXISTS "Allow all update" ON public.queue;
DROP POLICY IF EXISTS "Allow all delete" ON public.queue;
DROP POLICY IF EXISTS "Queue is readable by everyone" ON public.queue;
DROP POLICY IF EXISTS "Authenticated users can manage queue" ON public.queue;

-- Читать очередь могут все
CREATE POLICY "Queue is readable by everyone" ON public.queue
FOR SELECT USING (true);

-- Аутентифицированные пользователи могут вставлять свои записи
CREATE POLICY "Users can insert own queue items" ON public.queue
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Пользователи могут обновлять только свои записи, админы - все
CREATE POLICY "Users can update own queue or admin all" ON public.queue
FOR UPDATE USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Пользователи могут удалять только свои записи, админы - все
CREATE POLICY "Users can delete own queue or admin all" ON public.queue
FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- ========================================
-- MACHINE_STATE TABLE - Только админ может управлять
-- ========================================

-- Удалить старые политики
DROP POLICY IF EXISTS "Allow all insert" ON public.machine_state;
DROP POLICY IF EXISTS "Allow all update" ON public.machine_state;
DROP POLICY IF EXISTS "Machine state is readable by everyone" ON public.machine_state;
DROP POLICY IF EXISTS "Authenticated users can manage machine state" ON public.machine_state;

-- Читать статус машины могут все
CREATE POLICY "Machine state is readable by everyone" ON public.machine_state
FOR SELECT USING (true);

-- Управлять машиной может только админ
CREATE POLICY "Only admin can manage machine state" ON public.machine_state
FOR ALL USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ========================================
-- HISTORY TABLE - Аутентифицированные пользователи могут записывать
-- ========================================

-- Удалить старую политику
DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.history;
DROP POLICY IF EXISTS "History is readable by everyone" ON public.history;
DROP POLICY IF EXISTS "Authenticated users can insert history" ON public.history;

-- Читать историю могут все
CREATE POLICY "History is readable by everyone" ON public.history
FOR SELECT USING (true);

-- Записывать историю могут только аутентифицированные пользователи
CREATE POLICY "Authenticated users can insert history" ON public.history
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

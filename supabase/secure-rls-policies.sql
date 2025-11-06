-- Переходные RLS политики - блокируют анонимный доступ
-- Требуют хотя бы базовой аутентификации

-- ========================================
-- STUDENTS TABLE - Ограниченные политики
-- ========================================

-- Удалить старые политики
DROP POLICY IF EXISTS "Allow public read" ON public.students;
DROP POLICY IF EXISTS "Allow all update" ON public.students;
DROP POLICY IF EXISTS "Allow all insert" ON public.students;

-- Читать могут все (нужно для списка студентов при регистрации)
CREATE POLICY "Students are readable by everyone" ON public.students 
FOR SELECT USING (true);

-- Обновлять может только аутентифицированный пользователь
CREATE POLICY "Authenticated users can update students" ON public.students 
FOR UPDATE USING (auth.role() = 'authenticated');

-- Вставка только для аутентифицированных пользователей
CREATE POLICY "Authenticated users can insert students" ON public.students 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ========================================
-- STUDENT_AUTH TABLE - Строгие политики
-- ========================================

-- Удалить старую политику
DROP POLICY IF EXISTS "Allow all operations" ON public.student_auth;

-- Только аутентифицированные пользователи могут работать с паролями
CREATE POLICY "Authenticated users can manage auth" ON public.student_auth 
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ========================================
-- QUEUE TABLE - Ограниченные политики
-- ========================================

-- Удалить старые политики
DROP POLICY IF EXISTS "Allow all insert" ON public.queue;
DROP POLICY IF EXISTS "Allow all update" ON public.queue;
DROP POLICY IF EXISTS "Allow all delete" ON public.queue;

-- Читать могут все
CREATE POLICY "Queue is readable by everyone" ON public.queue 
FOR SELECT USING (true);

-- Все операции с очередью требуют аутентификации
CREATE POLICY "Authenticated users can manage queue" ON public.queue 
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ========================================
-- MACHINE_STATE TABLE - Ограниченные политики
-- ========================================

-- Удалить старые политики
DROP POLICY IF EXISTS "Allow all insert" ON public.machine_state;
DROP POLICY IF EXISTS "Allow all update" ON public.machine_state;

-- Читать могут все
CREATE POLICY "Machine state is readable by everyone" ON public.machine_state 
FOR SELECT USING (true);

-- Изменять статус машины могут только аутентифицированные пользователи
CREATE POLICY "Authenticated users can manage machine state" ON public.machine_state 
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ========================================
-- HISTORY TABLE - Ограниченные политики
-- ========================================

-- Удалить старую политику
DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.history;

-- Читать могут все
CREATE POLICY "History is readable by everyone" ON public.history 
FOR SELECT USING (true);

-- Записывать историю могут только аутентифицированные пользователи
CREATE POLICY "Authenticated users can insert history" ON public.history 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
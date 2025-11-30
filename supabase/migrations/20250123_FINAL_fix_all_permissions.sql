-- ========================================
-- ФИНАЛЬНАЯ МИГРАЦИЯ - ЕДИНЫЙ ИСТОЧНИК ПРАВДЫ
-- ========================================
-- Эта миграция удаляет ВСЕ старые политики и создает правильные с нуля
-- Применять ОДИН РАЗ в Supabase SQL Editor

-- ========================================
-- ШАГИ:
-- 1. Удалить ВСЕ старые политики
-- 2. Создать/обновить функции is_admin() и is_super_admin()
-- 3. Создать правильные политики для students
-- 4. Создать правильные политики для queue
-- 5. Создать правильные политики для machine_state
-- 6. Создать правильные политики для history
-- ========================================

-- ========================================
-- ШАГ 1: УДАЛИТЬ ВСЕ СТАРЫЕ ПОЛИТИКИ
-- ========================================

-- Удалить все политики для students
DROP POLICY IF EXISTS "Allow public read" ON students;
DROP POLICY IF EXISTS "Allow all update" ON students;
DROP POLICY IF EXISTS "Allow all insert" ON students;
DROP POLICY IF EXISTS "Students are readable by everyone" ON students;
DROP POLICY IF EXISTS "Authenticated users can update students" ON students;
DROP POLICY IF EXISTS "Authenticated users can insert students" ON students;
DROP POLICY IF EXISTS "Students list is readable by everyone" ON students;
DROP POLICY IF EXISTS "Users can link to student records" ON students;
DROP POLICY IF EXISTS "Users can update own student record" ON students;
DROP POLICY IF EXISTS "Admin can manage all students" ON students;
DROP POLICY IF EXISTS students_update_authenticated ON students;
DROP POLICY IF EXISTS students_update_own ON students;
DROP POLICY IF EXISTS students_update_super_admin ON students;
DROP POLICY IF EXISTS students_update_admin ON students;
DROP POLICY IF EXISTS students_select_public ON students;
DROP POLICY IF EXISTS students_delete_super_admin ON students;
DROP POLICY IF EXISTS students_delete_admin ON students;
DROP POLICY IF EXISTS students_update_admin_or_own_or_registering ON students;

-- Удалить все политики для queue
DROP POLICY IF EXISTS "Allow public read access" ON queue;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON queue;
DROP POLICY IF EXISTS "Allow authenticated update access" ON queue;
DROP POLICY IF EXISTS "Allow authenticated delete access" ON queue;
DROP POLICY IF EXISTS "Allow all insert" ON queue;
DROP POLICY IF EXISTS "Allow all update" ON queue;
DROP POLICY IF EXISTS "Allow all delete" ON queue;
DROP POLICY IF EXISTS "Queue is readable by everyone" ON queue;
DROP POLICY IF EXISTS "Authenticated users can manage queue" ON queue;
DROP POLICY IF EXISTS "Users can insert own queue items" ON queue;
DROP POLICY IF EXISTS "Users can update own queue or admin all" ON queue;
DROP POLICY IF EXISTS "Users can delete own queue or admin all" ON queue;
DROP POLICY IF EXISTS queue_insert_authenticated_or_admin ON queue;
DROP POLICY IF EXISTS queue_insert_own ON queue;
DROP POLICY IF EXISTS queue_insert_super_admin ON queue;
DROP POLICY IF EXISTS queue_insert_admin ON queue;
DROP POLICY IF EXISTS queue_update_own ON queue;
DROP POLICY IF EXISTS queue_update_super_admin ON queue;
DROP POLICY IF EXISTS queue_update_admin ON queue;
DROP POLICY IF EXISTS queue_delete_own ON queue;
DROP POLICY IF EXISTS queue_delete_super_admin ON queue;
DROP POLICY IF EXISTS queue_delete_admin ON queue;
DROP POLICY IF EXISTS queue_select_public ON queue;
DROP POLICY IF EXISTS queue_update_owner_or_admin_or_student ON queue;
DROP POLICY IF EXISTS queue_delete_owner_or_admin ON queue;
DROP POLICY IF EXISTS queue_insert_authenticated_or_admin ON queue;

-- Удалить все политики для machine_state
DROP POLICY IF EXISTS "Allow public read access" ON machine_state;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON machine_state;
DROP POLICY IF EXISTS "Allow authenticated update access" ON machine_state;
DROP POLICY IF EXISTS "Allow all insert" ON machine_state;
DROP POLICY IF EXISTS "Allow all update" ON machine_state;
DROP POLICY IF EXISTS "Machine state is readable by everyone" ON machine_state;
DROP POLICY IF EXISTS "Authenticated users can manage machine state" ON machine_state;
DROP POLICY IF EXISTS "Only admin can manage machine state" ON machine_state;
DROP POLICY IF EXISTS machine_state_select_public ON machine_state;
DROP POLICY IF EXISTS machine_state_admin_all ON machine_state;

-- Удалить все политики для history
DROP POLICY IF EXISTS "Allow public read access" ON history;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON history;
DROP POLICY IF EXISTS "History is readable by everyone" ON history;
DROP POLICY IF EXISTS "Authenticated users can insert history" ON history;
DROP POLICY IF EXISTS history_select_public ON history;
DROP POLICY IF EXISTS history_insert_admin ON history;
DROP POLICY IF EXISTS history_insert_authenticated ON history;
DROP POLICY IF EXISTS history_delete_super_admin ON history;

-- ========================================
-- ШАГ 2: СОЗДАТЬ/ОБНОВИТЬ ФУНКЦИИ
-- ========================================

-- Функция is_super_admin() - проверяет только is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.students
    WHERE user_id = auth.uid()
    AND is_super_admin = TRUE
    AND is_banned = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция is_admin() - проверяет is_admin ИЛИ is_super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.students
    WHERE user_id = auth.uid()
    AND (is_admin = TRUE OR is_super_admin = TRUE)
    AND is_banned = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ШАГ 3: ПОЛИТИКИ ДЛЯ STUDENTS
-- ========================================

-- SELECT: все могут читать список студентов (нужно для регистрации)
CREATE POLICY students_select_public ON students
  FOR SELECT
  TO public
  USING (true);

-- UPDATE: пользователь может обновлять свою запись (аватар и т.д.)
CREATE POLICY students_update_own ON students
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: суперадмин может обновлять ВСЕХ
CREATE POLICY students_update_super_admin ON students
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- UPDATE: обычный админ может обновлять всех КРОМЕ суперадминов
CREATE POLICY students_update_admin ON students
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() 
    AND NOT public.is_super_admin()
    AND students.is_super_admin = FALSE
  )
  WITH CHECK (
    public.is_admin() 
    AND NOT public.is_super_admin()
    AND students.is_super_admin = FALSE
  );

-- DELETE: суперадмин может удалять всех (кроме себя)
CREATE POLICY students_delete_super_admin ON students
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    AND auth.uid() != user_id
  );

-- DELETE: обычный админ может удалять всех КРОМЕ суперадминов
CREATE POLICY students_delete_admin ON students
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin() 
    AND NOT public.is_super_admin()
    AND students.is_super_admin = FALSE
  );

-- ========================================
-- ШАГ 4: ПОЛИТИКИ ДЛЯ QUEUE
-- ========================================

-- SELECT: все могут читать очередь
CREATE POLICY queue_select_public ON queue
  FOR SELECT
  TO public
  USING (true);

-- INSERT: пользователь может добавлять себя (или если user_id = null для незарегистрированных)
CREATE POLICY queue_insert_own ON queue
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- INSERT: суперадмин может добавлять всех
CREATE POLICY queue_insert_super_admin ON queue
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

-- INSERT: обычный админ может добавлять всех КРОМЕ суперадминов
CREATE POLICY queue_insert_admin ON queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() 
    AND NOT public.is_super_admin()
    AND (
      student_id IS NULL 
      OR NOT EXISTS (SELECT 1 FROM students s WHERE s.id = queue.student_id AND s.is_super_admin = TRUE)
    )
  );

-- UPDATE: пользователь может обновлять свои записи
CREATE POLICY queue_update_own ON queue
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: суперадмин может обновлять все записи
CREATE POLICY queue_update_super_admin ON queue
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- UPDATE: обычный админ может обновлять все записи КРОМЕ записей суперадминов
CREATE POLICY queue_update_admin ON queue
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() 
    AND NOT public.is_super_admin()
    AND (
      student_id IS NULL 
      OR NOT EXISTS (SELECT 1 FROM students s WHERE s.id = queue.student_id AND s.is_super_admin = TRUE)
    )
  )
  WITH CHECK (
    public.is_admin() 
    AND NOT public.is_super_admin()
    AND (
      student_id IS NULL 
      OR NOT EXISTS (SELECT 1 FROM students s WHERE s.id = queue.student_id AND s.is_super_admin = TRUE)
    )
  );

-- DELETE: пользователь может удалять свои записи
CREATE POLICY queue_delete_own ON queue
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- DELETE: суперадмин может удалять все записи
CREATE POLICY queue_delete_super_admin ON queue
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- DELETE: обычный админ может удалять все записи КРОМЕ записей суперадминов
CREATE POLICY queue_delete_admin ON queue
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin() 
    AND NOT public.is_super_admin()
    AND (
      student_id IS NULL 
      OR NOT EXISTS (SELECT 1 FROM students s WHERE s.id = queue.student_id AND s.is_super_admin = TRUE)
    )
  );

-- UPDATE: студенты могут забирать незанятые записи (user_id IS NULL)
CREATE POLICY queue_claim_unowned_by_student ON queue
  FOR UPDATE
  TO authenticated
  USING (
    user_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = queue.student_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- ========================================
-- ШАГ 5: ПОЛИТИКИ ДЛЯ MACHINE_STATE
-- ========================================

-- SELECT: все могут читать статус машины
CREATE POLICY machine_state_select_public ON machine_state
  FOR SELECT
  TO public
  USING (true);

-- ALL: только админы могут управлять машиной
CREATE POLICY machine_state_admin_all ON machine_state
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ========================================
-- ШАГ 6: ПОЛИТИКИ ДЛЯ HISTORY
-- ========================================

-- SELECT: все могут читать историю
CREATE POLICY history_select_public ON history
  FOR SELECT
  TO public
  USING (true);

-- INSERT: аутентифицированные пользователи могут добавлять историю
CREATE POLICY history_insert_authenticated ON history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

-- DELETE: только суперадмин может удалять историю
CREATE POLICY history_delete_super_admin ON history
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- ========================================
-- ИТОГОВАЯ СТРУКТУРА ПРАВ
-- ========================================
-- 
-- СУПЕРАДМИН может:
-- ✅ Читать, обновлять, удалять ВСЕХ студентов (кроме удаления себя)
-- ✅ Добавлять, обновлять, удалять ВСЕ записи в очереди
-- ✅ Управлять машиной
-- ✅ Удалять историю
-- ✅ Управлять правами других админов
--
-- ОБЫЧНЫЙ АДМИН может:
-- ✅ Читать, обновлять, удалять всех студентов КРОМЕ суперадминов
-- ✅ Добавлять, обновлять, удалять все записи в очереди КРОМЕ записей суперадминов
-- ✅ Управлять машиной
-- ✅ Редактировать других админов
-- ❌ НЕ МОЖЕТ управлять суперадминами
--
-- ОБЫЧНЫЙ ПОЛЬЗОВАТЕЛЬ может:
-- ✅ Читать список студентов, очередь, историю, статус машины
-- ✅ Обновлять свою запись (аватар и т.д.)
-- ✅ Добавлять себя в очередь
-- ✅ Обновлять/удалять свои записи в очереди
-- ✅ Добавлять записи в историю
-- ❌ НЕ МОЖЕТ управлять другими пользователями
-- 
-- ========================================

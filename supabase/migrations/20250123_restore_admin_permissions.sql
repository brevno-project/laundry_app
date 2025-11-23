-- ========================================
-- ВОССТАНОВЛЕНИЕ ПРАВ АДМИНОВ
-- ========================================
-- Проблема: после добавления аватаров политики были изменены
-- и теперь блокируют админов от управления пользователями и очередью

-- 1. Создать функцию is_super_admin()
-- ========================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.students
    WHERE user_id = auth.uid()
    AND is_super_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Убедиться что функция is_admin() существует
-- ========================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.students
    WHERE user_id = auth.uid()
    AND (is_admin = TRUE OR is_super_admin = TRUE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ИСПРАВИТЬ ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ STUDENTS
-- ========================================

-- Удалить проблемную политику
DROP POLICY IF EXISTS students_update_authenticated ON students;

-- Создать правильные политики с разделением прав:
-- - Пользователи могут обновлять свою запись (включая аватар)
-- - Суперадмины могут управлять ВСЕМИ
-- - Админы могут управлять только НЕ-админами (is_admin = false AND is_super_admin = false)

-- Политика для обновления своей записи (аватар, и т.д.)
CREATE POLICY students_update_own ON students
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Политика для суперадминов (могут управлять всеми)
CREATE POLICY students_update_super_admin ON students
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Политика для обычных админов (не могут управлять админами и суперадминами)
CREATE POLICY students_update_admin ON students
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() 
    AND NOT public.is_super_admin()
    AND (SELECT is_admin FROM students WHERE id = students.id) = FALSE
    AND (SELECT is_super_admin FROM students WHERE id = students.id) = FALSE
  )
  WITH CHECK (
    public.is_admin() 
    AND NOT public.is_super_admin()
    AND (SELECT is_admin FROM students WHERE id = students.id) = FALSE
    AND (SELECT is_super_admin FROM students WHERE id = students.id) = FALSE
  );

-- 4. ИСПРАВИТЬ ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ QUEUE
-- ========================================

-- Удалить проблемную политику
DROP POLICY IF EXISTS queue_insert_authenticated_or_admin ON queue;

-- Политика для вставки своих записей
CREATE POLICY queue_insert_own ON queue
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Политика для суперадминов (могут добавлять всех)
CREATE POLICY queue_insert_super_admin ON queue
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

-- Политика для обычных админов (не могут добавлять админов и суперадминов в очередь)
CREATE POLICY queue_insert_admin ON queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() 
    AND NOT public.is_super_admin()
    AND (
      student_id IS NULL 
      OR (
        SELECT is_admin FROM students WHERE id = queue.student_id
      ) = FALSE
      AND (
        SELECT is_super_admin FROM students WHERE id = queue.student_id
      ) = FALSE
    )
  );

-- Политика для обновления своих записей
CREATE POLICY queue_update_own ON queue
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Политика для суперадминов (могут обновлять все)
CREATE POLICY queue_update_super_admin ON queue
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Политика для обычных админов (не могут обновлять записи админов)
CREATE POLICY queue_update_admin ON queue
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() 
    AND NOT public.is_super_admin()
    AND (
      student_id IS NULL 
      OR (
        SELECT is_admin FROM students WHERE id = queue.student_id
      ) = FALSE
      AND (
        SELECT is_super_admin FROM students WHERE id = queue.student_id
      ) = FALSE
    )
  )
  WITH CHECK (
    public.is_admin() 
    AND NOT public.is_super_admin()
    AND (
      student_id IS NULL 
      OR (
        SELECT is_admin FROM students WHERE id = queue.student_id
      ) = FALSE
      AND (
        SELECT is_super_admin FROM students WHERE id = queue.student_id
      ) = FALSE
    )
  );

-- Политика для удаления своих записей
CREATE POLICY queue_delete_own ON queue
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Политика для суперадминов (могут удалять все)
CREATE POLICY queue_delete_super_admin ON queue
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- Политика для обычных админов (не могут удалять записи админов)
CREATE POLICY queue_delete_admin ON queue
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin() 
    AND NOT public.is_super_admin()
    AND (
      student_id IS NULL 
      OR (
        SELECT is_admin FROM students WHERE id = queue.student_id
      ) = FALSE
      AND (
        SELECT is_super_admin FROM students WHERE id = queue.student_id
      ) = FALSE
    )
  );

-- 5. УБЕДИТЬСЯ ЧТО ПОЛИТИКИ SELECT СУЩЕСТВУЮТ
-- ========================================

-- Политика для чтения students (все могут читать для регистрации)
DROP POLICY IF EXISTS students_select_public ON students;
CREATE POLICY students_select_public ON students
  FOR SELECT
  TO public
  USING (true);

-- Политика для чтения queue (все могут читать)
DROP POLICY IF EXISTS queue_select_public ON queue;
CREATE POLICY queue_select_public ON queue
  FOR SELECT
  TO public
  USING (true);

-- 6. ПОЛИТИКИ ДЛЯ УДАЛЕНИЯ STUDENTS
-- ========================================

-- Политика для суперадминов (могут удалять всех кроме себя)
DROP POLICY IF EXISTS students_delete_super_admin ON students;
CREATE POLICY students_delete_super_admin ON students
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    AND auth.uid() != user_id  -- Нельзя удалить себя
  );

-- Политика для обычных админов (могут удалять только не-админов)
DROP POLICY IF EXISTS students_delete_admin ON students;
CREATE POLICY students_delete_admin ON students
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin() 
    AND NOT public.is_super_admin()
    AND (SELECT is_admin FROM students WHERE id = students.id) = FALSE
    AND (SELECT is_super_admin FROM students WHERE id = students.id) = FALSE
  );

-- ========================================
-- КОММЕНТАРИИ К ПРАВАМ
-- ========================================
-- 
-- СУПЕРАДМИН может:
-- ✅ Обновлять ВСЕХ студентов
-- ✅ Удалять ВСЕХ студентов (кроме себя)
-- ✅ Добавлять ВСЕХ в очередь
-- ✅ Обновлять/удалять ВСЕ записи в очереди
-- ✅ Управлять правами других админов
--
-- ОБЫЧНЫЙ АДМИН может:
-- ✅ Обновлять только НЕ-админов
-- ✅ Удалять только НЕ-админов
-- ✅ Добавлять в очередь только НЕ-админов
-- ✅ Обновлять/удалять записи в очереди только НЕ-админов
-- ❌ НЕ МОЖЕТ управлять админами и суперадминами
--
-- ОБЫЧНЫЙ ПОЛЬЗОВАТЕЛЬ может:
-- ✅ Обновлять свою запись (аватар и т.д.)
-- ✅ Добавлять себя в очередь
-- ✅ Обновлять/удалять свои записи в очереди
-- ❌ НЕ МОЖЕТ управлять другими пользователями
-- 
-- ========================================

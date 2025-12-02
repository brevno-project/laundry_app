-- ========================================
-- RLS / ПРАВА ДОСТУПА ДЛЯ LAUNDRY-APP
-- ========================================
-- Скрипт можно запускать повторно: DROP IF EXISTS + CREATE OR REPLACE

-- ---------- STEP 0. Удаляем старые политики (по фактическим именам) ----------

-- students
DROP POLICY IF EXISTS students_delete_policy ON students;
DROP POLICY IF EXISTS students_select_policy ON students;
DROP POLICY IF EXISTS students_update_admin ON students;
DROP POLICY IF EXISTS students_update_own ON students;

-- queue
DROP POLICY IF EXISTS queue_delete_policy ON queue;
DROP POLICY IF EXISTS queue_insert_policy ON queue;
DROP POLICY IF EXISTS queue_select_policy ON queue;
DROP POLICY IF EXISTS queue_update_policy ON queue;

-- machine_state
DROP POLICY IF EXISTS machine_state_manage_policy ON machine_state;
DROP POLICY IF EXISTS machine_state_select_policy ON machine_state;

-- history
DROP POLICY IF EXISTS history_insert_policy ON history;
DROP POLICY IF EXISTS history_select_policy ON history;

-- На всякий случай старые «расширенные» имена (если вдруг есть)
DROP POLICY IF EXISTS students_select_public ON students;
DROP POLICY IF EXISTS students_update_super_admin ON students;
DROP POLICY IF EXISTS students_update_admin ON students;
DROP POLICY IF EXISTS students_update_own ON students;
DROP POLICY IF EXISTS students_delete_super_admin ON students;
DROP POLICY IF EXISTS students_delete_admin ON students;

DROP POLICY IF EXISTS queue_select_public ON queue;
DROP POLICY IF EXISTS queue_insert_own ON queue;
DROP POLICY IF EXISTS queue_insert_admin ON queue;
DROP POLICY IF EXISTS queue_insert_super_admin ON queue;
DROP POLICY IF EXISTS queue_update_own ON queue;
DROP POLICY IF EXISTS queue_update_admin ON queue;
DROP POLICY IF EXISTS queue_update_super_admin ON queue;
DROP POLICY IF EXISTS queue_delete_own ON queue;
DROP POLICY IF EXISTS queue_delete_admin ON queue;
DROP POLICY IF EXISTS queue_delete_super_admin ON queue;
DROP POLICY IF EXISTS queue_claim_unowned_by_student ON queue;

DROP POLICY IF EXISTS machine_state_select_public ON machine_state;
DROP POLICY IF EXISTS machine_state_admin_all ON machine_state;

DROP POLICY IF EXISTS history_select_public ON history;
DROP POLICY IF EXISTS history_insert_authenticated ON history;
DROP POLICY IF EXISTS history_delete_super_admin ON history;


-- ---------- STEP 1. ФУНКЦИИ is_admin / is_super_admin уже должны быть обновлены ----------
-- (см. шаг 3 выше; если ещё не выполнял — скопируй отсюда и запусти)

-- ---------- STEP 2. ПОЛИТИКИ ДЛЯ students ----------

-- Любой может читать список студентов (нужно для выбора себя)
CREATE POLICY students_select_public ON students
  FOR SELECT
  TO public
  USING (true);

-- Студент может обновлять только себя
CREATE POLICY students_update_own ON students
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Суперадмин может обновлять всех
CREATE POLICY students_update_super_admin ON students
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Обычный админ может обновлять всех, КРОМЕ суперадминов
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

-- Суперадмин может удалять всех (кроме себя самого)
CREATE POLICY students_delete_super_admin ON students
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    AND auth.uid() <> user_id
  );

-- Обычный админ может удалять всех, КРОМЕ суперадминов
CREATE POLICY students_delete_admin ON students
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    AND NOT public.is_super_admin()
    AND students.is_super_admin = FALSE
  );


-- ---------- STEP 3. ПОЛИТИКИ ДЛЯ queue ----------

-- Все могут смотреть очередь
CREATE POLICY queue_select_public ON queue
  FOR SELECT
  TO public
  USING (true);

-- Обычный пользователь вставляет СВОЮ запись (или user_id = NULL для старых записей)
CREATE POLICY queue_insert_own ON queue
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Суперадмин может вставлять любые записи
CREATE POLICY queue_insert_super_admin ON queue
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

-- Обычный админ может вставлять всех, КРОМЕ суперадминов
CREATE POLICY queue_insert_admin ON queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    AND NOT public.is_super_admin()
    AND (
      student_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = queue.student_id
          AND s.is_super_admin = TRUE
      )
    )
  );

-- Пользователь может обновлять только свои записи
CREATE POLICY queue_update_own ON queue
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Суперадмин может обновлять всё
CREATE POLICY queue_update_super_admin ON queue
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Обычный админ — всё, кроме суперадминских записей
CREATE POLICY queue_update_admin ON queue
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    AND NOT public.is_super_admin()
    AND (
      student_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = queue.student_id
          AND s.is_super_admin = TRUE
      )
    )
  )
  WITH CHECK (
    public.is_admin()
    AND NOT public.is_super_admin()
    AND (
      student_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = queue.student_id
          AND s.is_super_admin = TRUE
      )
    )
  );

-- Пользователь может удалить только свои записи
CREATE POLICY queue_delete_own ON queue
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Суперадмин может удалить всё
CREATE POLICY queue_delete_super_admin ON queue
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- Обычный админ — всё, кроме суперадминских записей
CREATE POLICY queue_delete_admin ON queue
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    AND NOT public.is_super_admin()
    AND (
      student_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = queue.student_id
          AND s.is_super_admin = TRUE
      )
    )
  );

-- Студент может «забрать» незанятую запись, где user_id IS NULL
CREATE POLICY queue_claim_unowned_by_student ON queue
  FOR UPDATE
  TO authenticated
  USING (
    user_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM students s
      WHERE s.id = queue.student_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (user_id = auth.uid());


-- ---------- STEP 4. ПОЛИТИКИ ДЛЯ machine_state ----------

-- Все могут читать статус машины
CREATE POLICY machine_state_select_public ON machine_state
  FOR SELECT
  TO public
  USING (true);

-- Управлять машиной могут только админы (и service_role через is_admin())
CREATE POLICY machine_state_admin_all ON machine_state
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ---------- STEP 5. ПОЛИТИКИ ДЛЯ history ----------

-- Историю могут читать все (чтобы видеть «кто когда стирал»)
CREATE POLICY history_select_public ON history
  FOR SELECT
  TO public
  USING (true);

-- Добавлять записи может любой аутентифицированный (по факту — твой сервер)
CREATE POLICY history_insert_authenticated ON history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Удалять историю может только суперадмин
CREATE POLICY history_delete_super_admin ON history
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());
к
-- Обновляем политику UPDATE для students, чтобы можно было обновлять can_view_students
-- Политика должна разрешать суперадминам обновлять поле can_view_students

-- Удаляем старую политику если есть
DROP POLICY IF EXISTS "students_update_admin_or_own_or_registering" ON students;

-- Создаем новую политику с правильными правами
CREATE POLICY "students_update_admin_or_own_or_registering" ON students
FOR UPDATE
USING (
  -- Суперадмин может обновлять всех
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = auth.uid()::text
    AND s.is_super_admin = true
  )
  OR
  -- Админ может обновлять не-админов
  (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = auth.uid()::text
      AND s.is_admin = true
    )
    AND is_admin = false
    AND is_super_admin = false
  )
  OR
  -- Пользователь может обновлять себя (регистрация)
  id = auth.uid()::text
)
WITH CHECK (
  -- Суперадмин может обновлять всех
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = auth.uid()::text
    AND s.is_super_admin = true
  )
  OR
  -- Админ может обновлять не-админов
  (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = auth.uid()::text
      AND s.is_admin = true
    )
    AND is_admin = false
    AND is_super_admin = false
  )
  OR
  -- Пользователь может обновлять себя (только при регистрации)
  (
    id = auth.uid()::text
    AND is_registered = false
  )
);

COMMENT ON POLICY "students_update_admin_or_own_or_registering" ON students IS 
'Суперадмин может обновлять всех, админ может обновлять не-админов, пользователь может регистрироваться';

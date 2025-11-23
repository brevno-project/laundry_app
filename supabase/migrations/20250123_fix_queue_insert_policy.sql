-- Исправляем политику INSERT для queue - админы должны иметь возможность добавлять себя
DROP POLICY IF EXISTS queue_insert_authenticated_or_admin ON queue;

CREATE POLICY queue_insert_authenticated_or_admin ON queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

-- Комментарий:
-- Эта политика позволяет любому аутентифицированному пользователю (включая админов)
-- вставлять запись в очередь, если user_id совпадает с их auth.uid()

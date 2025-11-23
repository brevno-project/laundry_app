# Функции базы данных

Документация всех функций в Supabase для laundry app.

## 1. change_queue_position

**Параметры:** `p_queue_id uuid, p_direction text`  
**Возврат:** `void`  
**Security:** Invoker  

**Описание:** Изменяет позицию записи в очереди (вверх/вниз)

```sql
DECLARE
  current_position INT;
  current_date DATE;
  scheduled_date DATE;
  new_position INT;
  swap_id UUID;
BEGIN
  SELECT queue_position, queue_date, scheduled_for_date
  INTO current_position, current_date, scheduled_date
  FROM queue
  WHERE id = p_queue_id;

  IF current_position IS NULL THEN
    RAISE EXCEPTION 'Запись не найдена';
  END IF;

  IF p_direction = 'up' THEN
    new_position := current_position - 1;
    IF new_position < 1 THEN
      RAISE EXCEPTION 'Уже первый в очереди';
    END IF;
  ELSIF p_direction = 'down' THEN
    new_position := current_position + 1;
  ELSE
    RAISE EXCEPTION 'Неверное направление';
  END IF;

  SELECT id INTO swap_id
  FROM queue
  WHERE queue_date = current_date
    AND scheduled_for_date = scheduled_date
    AND queue_position = new_position
  LIMIT 1;

  IF swap_id IS NULL THEN
    RAISE EXCEPTION 'Не найдена запись для обмена';
  END IF;

  UPDATE queue SET queue_position = -1 WHERE id = p_queue_id;
  UPDATE queue SET queue_position = current_position WHERE id = swap_id;
  UPDATE queue SET queue_position = new_position WHERE id = p_queue_id;
END;
```

## 2. get_sorted_queue

**Параметры:** нет  
**Возврат:** `TABLE(id uuid, user_id uuid, student_id uuid, full_name text, ...)`  
**Security:** Invoker  

**Описание:** Получает отсортированную очередь

```sql
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.user_id,
    q.student_id,
    q.full_name,
    q.room,
    q.joined_at,
    q.planned_start_at,
    q.expected_finish_at,
    q.finished_at,
    q.note,
    q.status,
    q.wash_count,
    q.payment_type,
    q.admin_message,
    q.return_key_alert,
    q.scheduled_for_date,
    q.queue_date,
    q.queue_position
  FROM queue q
  WHERE q.status IN ('WAITING', 'READY', 'KEY_ISSUED', 'WASHING', 'DONE', 'queued', 'waiting', 'ready', 'washing')
  ORDER BY 
    q.queue_date ASC,
    q.queue_position ASC,
    q.joined_at ASC;
END;
```

## 3. is_admin

**Параметры:** нет  
**Возврат:** `boolean`  
**Security:** Definer  

**Описание:** Проверяет является ли текущий пользователь админом или суперадмином

```sql
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.students
    WHERE user_id = auth.uid()
    AND (is_admin = TRUE OR is_super_admin = TRUE)
    AND is_banned = FALSE
  );
END;
```

## 4. is_queue_owner

**Параметры:** `queue_user_id uuid`  
**Возврат:** `boolean`  
**Security:** Definer  

**Описание:** Проверяет является ли текущий пользователь владельцем записи в очереди

```sql
SELECT queue_user_id = auth.uid();
```

## 5. is_super_admin

**Параметры:** нет  
**Возврат:** `boolean`  
**Security:** Definer  

**Описание:** Проверяет является ли текущий пользователь суперадмином

```sql
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.students
    WHERE user_id = auth.uid()
    AND is_super_admin = TRUE
    AND is_banned = FALSE
  );
END;
```

## 6. migrate_yesterday_queue

**Параметры:** нет  
**Возврат:** `void`  
**Security:** Invoker  

**Описание:** Переносит незавершенные записи с вчерашнего дня на сегодня

```sql
DECLARE
  today_date DATE := CURRENT_DATE;
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  max_position INT;
BEGIN
  SELECT COALESCE(MAX(queue_position), 0) INTO max_position
  FROM queue
  WHERE queue_date = today_date
    AND scheduled_for_date = today_date;

  UPDATE queue
  SET 
    queue_date = today_date,
    queue_position = queue_position + max_position,
    note = COALESCE(note || ' ', '') || '[Перенесено с ' || yesterday_date || ']'
  WHERE queue_date = yesterday_date
    AND status IN ('WAITING', 'READY', 'KEY_ISSUED', 'queued', 'waiting', 'ready')
    AND scheduled_for_date <= yesterday_date;
END;
```

## 7. transfer_unfinished_to_next_day

**Параметры:** нет  
**Возврат:** `void`  
**Security:** Invoker  

**Описание:** Переносит незавершенные записи на следующий день

```sql
DECLARE
  today_date DATE := CURRENT_DATE;
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  max_position INT;
BEGIN
  -- Получаем максимальную позицию среди записей на сегодня
  SELECT COALESCE(MAX(position), 0) INTO max_position
  FROM queue
  WHERE queue_date = today_date
    AND scheduled_for_date = today_date;

  -- Переносим незавершенные записи с вчерашнего дня
  UPDATE queue
  SET 
    queue_date = today_date,
    position = position + max_position,
    note = COALESCE(note || ' ', '') || '[Перенесено с ' || yesterday_date || ']'
  WHERE queue_date = yesterday_date
    AND status IN ('WAITING', 'READY', 'KEY_ISSUED', 'queued', 'waiting', 'ready')
    AND scheduled_for_date <= yesterday_date;

  RAISE NOTICE 'Перенесено записей на %', today_date;
END;
```

## 8. update_student_admin_status

**Параметры:** `student_id uuid, admin_status boolean`  
**Возврат:** `void`  
**Security:** Definer  

**Описание:** Обновляет админ статус студента

```sql
BEGIN
  UPDATE public.students
  SET is_admin = admin_status
  WHERE id = student_id;
END;
```

---

**Дата:** 2025-01-23  
**Статус:** Актуально  
**Всего функций:** 8

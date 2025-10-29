# ⚠️ ВАЖНО: ВЫПОЛНИТЕ SQL МИГРАЦИЮ!

## Проблема: Время стирки не показывается в очереди

Если вы видите, что время стирки не отображается в карточках очереди, это значит что **колонка `expectedFinishAt` не добавлена в базу данных**.

## ✅ РЕШЕНИЕ:

### 1. Откройте Supabase Dashboard
```
https://supabase.com
```

### 2. Перейдите в SQL Editor
- В левом меню выберите **"SQL Editor"**
- Нажмите **"New query"**

### 3. Скопируйте и выполните этот SQL:
```sql
-- Добавить колонку expectedFinishAt
ALTER TABLE queue
ADD COLUMN IF NOT EXISTS "expectedFinishAt" TIMESTAMP WITH TIME ZONE;

-- Создать индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_queue_expected_finish_at
ON queue("expectedFinishAt");
```

### 4. Нажмите **"Run"** (или Ctrl+Enter)

### 5. Проверьте что колонка добавлена:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'queue' AND column_name = 'expectedFinishAt';
```

Должно вернуть:
```
column_name       | data_type
expectedFinishAt  | timestamp with time zone
```

---

## 🎯 После выполнения:

1. Обновите страницу приложения (F5)
2. Встаньте в очередь с указанием времени
3. Админ выдает ключ → время должно показаться в карточке!

---

**Если проблема остается, напишите мне!** 🚀

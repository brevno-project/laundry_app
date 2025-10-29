# 🔍 Отладка Telegram уведомлений

## Проблема:
Telegram подключен, но уведомления НЕ приходят студенту.
Админу приходит "⚠️ Студент не подключил Telegram!"

## Что нужно проверить в Supabase:

### 1. Таблица `students`
Откройте Supabase → Table Editor → `students`

Найдите студента Nurtilek (A201) и проверьте:
- Есть ли значение в колонке `telegram_chat_id`?
- Какой `id` у этого студента?

**Скриншот или скопируйте:**
```
id: ?
fullName: Nurtilek ...
room: A201
telegram_chat_id: ?
```

### 2. Таблица `queue`
Откройте Supabase → Table Editor → `queue`

Найдите запись Nurtilek и проверьте:
- Есть ли колонка `studentId`?
- Заполнена ли она?
- Совпадает ли `studentId` с `id` из таблицы students?

**Скриншот или скопируйте:**
```
id: ...
userId: ...
studentId: ?
userName: Nurtilek
userRoom: A201
```

---

## Возможные проблемы:

### Проблема 1: studentId не сохраняется
**Причина:** Колонка добавлена, но при создании QueueItem не заполняется
**Решение:** Нужно выйти и зайти заново, чтобы user.studentId обновился

### Проблема 2: telegram_chat_id не сохранился
**Причина:** Ошибка при сохранении через /api/telegram/link
**Решение:** Переподключить Telegram

### Проблема 3: studentId не совпадает с id в students
**Причина:** Используется неправильный ID
**Решение:** Исправить логику создания user.studentId

---

## Быстрая проверка:

Откройте SQL Editor в Supabase и выполните:

```sql
-- Проверить telegram_chat_id для студента
SELECT id, fullName, room, telegram_chat_id 
FROM students 
WHERE room = 'A201' AND fullName LIKE '%Nurtilek%';

-- Проверить studentId в очереди
SELECT id, userId, studentId, userName, userRoom 
FROM queue 
WHERE userRoom = 'A201' AND userName LIKE '%Nurtilek%';
```

**Пришлите результаты!**

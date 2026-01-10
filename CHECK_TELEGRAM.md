# Проверка Telegram уведомлений

## Проблема
Уведомления отправляются успешно (status 200), но не приходят в Telegram.

## Что проверить

### 1. Проверьте telegram_chat_id в базе данных

Выполните SQL запрос в Supabase SQL Editor:

```sql
-- Проверить Павла Хвана
SELECT id, full_name, telegram_chat_id 
FROM students 
WHERE full_name = 'Павел Хван';

-- Результат должен быть:
-- id: bd5fab9d-479c-4919-900a-7dfa96a52ea7
-- full_name: Павел Хван
-- telegram_chat_id: ДОЛЖЕН БЫТЬ ЗАПОЛНЕН (например, "123456789")
```

### 2. Если telegram_chat_id пустой

**Причина:** Студент не подключил Telegram через бота.

**Решение:**
1. Студент должен написать боту `/start`
2. Бот должен вызвать API `/api/telegram/link` с заголовком `X-Telegram-Secret`
3. Проверить, что в `.env` и Vercel есть `TELEGRAM_WEBHOOK_SECRET`

### 3. Если telegram_chat_id заполнен, но уведомления не приходят

**Проверьте логи Vercel:**

Откройте Vercel Dashboard → Logs и найдите логи от `/api/telegram/notify`:

```
📨 Telegram notification request: { type: 'key_issued', student_id: 'bd5fab9d-...' }
🎯 Notification routing: { isStudentOnly: true, isAdminOnly: false }
👤 Attempting to send notification to student: bd5fab9d-...
🔍 getStudentTelegramChatId called with student_id: bd5fab9d-...
📊 Query result: { data: { telegram_chat_id: '123456789', full_name: 'Павел' }, error: null }
✅ Found telegram_chat_id for student: Павел - chat_id: 123456789
📤 Sending message to student chat_id: 123456789
📬 Student notification result: true/false  <-- ВАЖНО!
✅ Final notification result: { success: true }
```

**Если `Student notification result: false`:**
- Проблема с Telegram Bot Token
- Проблема с chat_id (неверный формат)
- Telegram API вернул ошибку

### 4. Проверьте Telegram Bot Token

В Vercel Environment Variables должна быть переменная:
```
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
```

Проверьте, что токен правильный:
1. Откройте @BotFather в Telegram
2. Отправьте `/mybots`
3. Выберите вашего бота
4. Нажмите "API Token"
5. Сравните с токеном в Vercel

### 5. Тестовая отправка

Попробуйте отправить тестовое сообщение напрямую через Telegram API:

```bash
curl -X POST "https://api.telegram.org/bot<ВАШ_ТОКЕН>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "<CHAT_ID_СТУДЕНТА>",
    "text": "Тест"
  }'
```

Если сообщение не приходит - проблема с токеном или chat_id.

## Быстрая диагностика

**Выполните SQL запрос:**
```sql
SELECT 
  id, 
  full_name, 
  telegram_chat_id,
  CASE 
    WHEN telegram_chat_id IS NULL THEN '❌ НЕ ПОДКЛЮЧЕН'
    ELSE '✅ ПОДКЛЮЧЕН'
  END as status
FROM students 
WHERE full_name IN ('Павел Хван', 'Semyon Nikolaenko')
ORDER BY full_name;
```

Это покажет, у кого подключен Telegram, а у кого нет.

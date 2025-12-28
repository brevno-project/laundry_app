# 🔐 Обновление Telegram бота для безопасной интеграции

## Проблема
API endpoint `/api/telegram/link` теперь защищен секретным заголовком `X-Telegram-Secret` и использует `service_role` key для обхода RLS политик.

## Что нужно сделать в боте

### 1. Добавить секретный ключ в переменные окружения бота

```bash
TELEGRAM_WEBHOOK_SECRET=laundry_webhook_secret_key_2025
```

### 2. Обновить код бота для отправки секретного заголовка

**Было (старый код):**
```python
response = requests.post(
    f"{BASE_URL}/api/telegram/link",
    json={
        "student_id": student_id,
        "telegram_chat_id": str(chat_id)
    }
)
```

**Стало (новый код с защитой):**
```python
import os

WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET")

response = requests.post(
    f"{BASE_URL}/api/telegram/link",
    headers={
        "Content-Type": "application/json",
        "X-Telegram-Secret": WEBHOOK_SECRET  # ✅ Добавляем секретный заголовок
    },
    json={
        "student_id": student_id,
        "telegram_chat_id": str(chat_id)
    }
)
```

### 3. Добавить обработку ошибок

```python
if response.status_code == 401:
    await update.message.reply_text(
        "❌ Ошибка авторизации. Обратитесь к администратору."
    )
    return

if response.status_code == 404:
    await update.message.reply_text(
        "❌ Студент не найден в базе данных."
    )
    return

if response.status_code == 200:
    data = response.json()
    await update.message.reply_text(
        f"✅ {data.get('message', 'Telegram успешно подключен!')}"
    )
else:
    await update.message.reply_text(
        f"❌ Ошибка: {response.json().get('error', 'Неизвестная ошибка')}"
    )
```

## Переменные окружения

### Локально (.env)
```bash
TELEGRAM_WEBHOOK_SECRET=laundry_webhook_secret_key_2025
BASE_URL=http://localhost:3000
```

### Production (Render/Railway/etc)
Добавить переменную окружения:
```
TELEGRAM_WEBHOOK_SECRET=laundry_webhook_secret_key_2025
```

## Vercel Environment Variables

Также нужно добавить в Vercel:
```
TELEGRAM_WEBHOOK_SECRET=laundry_webhook_secret_key_2025
```

## Безопасность

✅ **Что улучшилось:**
- API endpoint защищен от несанкционированного доступа
- Используется `service_role` key (обходит RLS)
- Нет проблем с политиками доступа
- Детальное логирование всех операций

⚠️ **Важно:**
- Никогда не коммитьте `TELEGRAM_WEBHOOK_SECRET` в Git
- Используйте разные секреты для dev и production
- Регулярно меняйте секретный ключ

## Тестирование

1. Запустите бот локально
2. Отправьте команду `/start YOUR_STUDENT_ID`
3. Проверьте логи API endpoint в консоли Next.js
4. Убедитесь что статус обновился в профиле

## Логи для отладки

В консоли Next.js вы увидите:
```
🔔 Telegram link request: { student_id: '...', telegram_chat_id: '...' }
👤 Current student data: { id: '...', full_name: '...', telegram_chat_id: null }
✅ Telegram linked successfully: { id: '...', full_name: '...', telegram_chat_id: '...' }
```

При ошибках:
```
❌ TELEGRAM_WEBHOOK_SECRET not configured
⚠️ Unauthorized Telegram link attempt
❌ Student not found: ...
❌ Database update error: ...
```

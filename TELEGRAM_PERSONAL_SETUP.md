# 📱 Настройка Персональных Telegram Уведомлений

## ✅ ЧТО ГОТОВО:

Система персональных уведомлений полностью реализована:
- ✅ Студенты получают уведомления ЛИЧНО (не в группе)
- ✅ Админ получает уведомления отдельно
- ✅ Возможность переподключить Telegram
- ✅ Админ может сбросить связь

---

## 🚀 ЧТО НУЖНО СДЕЛАТЬ:

### 1️⃣ В Supabase - добавить поле telegram_chat_id

Выполните SQL из файла `supabase/add-telegram-to-students.sql`:

```sql
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

CREATE INDEX IF NOT EXISTS idx_students_telegram_chat_id 
ON public.students(telegram_chat_id);

ALTER TABLE public.students 
ADD CONSTRAINT unique_telegram_chat_id 
UNIQUE (telegram_chat_id);
```

### 2️⃣ Настройте бота (2 варианта)

#### Вариант А: ПРОСТОЙ (для быстрого старта)

Студенты пишут боту вручную свой Chat ID:

1. Студент открывает бота в Telegram
2. Пишет `/start`
3. Бот отвечает: `Ваш Chat ID: 123456789`
4. Студент копирует этот ID
5. В приложении вставляет в поле "Код от бота"
6. Нажимает "Подключить Telegram"

#### Вариант Б: АВТОМАТИЧЕСКИЙ (лучше, но сложнее)

Бот автоматически связывает студента:

1. Студент пишет боту: `/start A501` (свою комнату)
2. Бот автоматически находит студента по комнате
3. Связывает telegram_chat_id в базе
4. Готово! ✅

---

## 🤖 ПРОСТОЙ БОТ (на Python)

Создайте файл `telegram_bot.py`:

```python
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

BOT_TOKEN = "8008452513:AAFFoaZm8PGPHIllv8DG9Oirtmm1Aq-LidY"

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    await update.message.reply_text(
        f"👋 Привет!\n\n"
        f"Ваш Chat ID: `{chat_id}`\n\n"
        f"Скопируйте этот ID и вставьте в приложение очереди "
        f"для подключения уведомлений!"
    )

if __name__ == '__main__':
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    print("✅ Бот запущен!")
    app.run_polling()
```

Запуск:
```bash
pip install python-telegram-bot
python telegram_bot.py
```

---

## 📋 КАК ЭТО РАБОТАЕТ:

### Для админа (вы):
Уведомления приходят на ваш Telegram (Chat ID: 541805220):
```
🧺 Новый в очереди!
👤 Artem (A501)
📊 Всего в очереди: 5 чел.
```

### Для студента:
Уведомления приходят ЛИЧНО ему:
```
🔔 ВАША ОЧЕРЕДЬ!
Подойдите в A501 за ключом!
💵 Возьмите деньги/купон
```

---

## 🔧 TROUBLESHOOTING:

### Студент не получает уведомления?

**Проверьте:**
1. ✅ Студент подключил Telegram (есть telegram_chat_id в базе)
2. ✅ Студент нажал START боту
3. ✅ Chat ID правильный

**Fallback:**
Если студент не подключил Telegram - уведомление придет админу с пометкой:
```
⚠️ Студент не подключил Telegram!

🔔 ВАША ОЧЕРЕДЬ!
👤 Artem (A501)
```

### Студент ввел неправильный Chat ID?

**Админ может сбросить:**
1. Админ панель → Управление студентами
2. Найти студента
3. Кнопка "Сбросить Telegram"
4. Студент может подключить заново

---

## 💡 РЕКОМЕНДАЦИИ:

### Для студентов:
1. Подключите Telegram СРАЗУ после регистрации
2. Не отключайте уведомления в боте
3. Если накосячили - попросите админа сбросить

### Для админа:
1. Следите за сообщениями "Студент не подключил Telegram"
2. Напоминайте студентам подключить
3. Можете сбросить и переподключить любого студента

---

## ✨ СЛЕДУЮЩИЕ УЛУЧШЕНИЯ (опционально):

1. **Автоматическая связка** - бот сам находит студента по комнате
2. **Кнопки в Telegram** - студент может управлять очередью из Telegram
3. **Напоминания** - "Не забудь вернуть ключ через 30 минут"
4. **Статистика** - сколько раз стирал, средняя длительность

Нужно что-то из этого? Скажите! 🚀

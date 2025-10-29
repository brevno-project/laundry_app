# 🤖 Telegram Bot для очереди на стирку

## 📋 Описание

Простой бот, который отправляет студентам их Chat ID для подключения персональных уведомлений.

**Bot Username:** `@keiin_dorm_laundry_bot`

---

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
pip install -r requirements.txt
```

### 2. Запуск бота

```bash
python telegram_bot.py
```

Вы увидите:
```
🤖 Запуск Telegram бота...
📝 Bot username: @keiin_dorm_laundry_bot
✅ Бот запущен и готов к работе!
⏳ Ожидание сообщений...
```

---

## 💬 Команды бота

### `/start`
Отправляет студенту его Chat ID

**Пример ответа:**
```
👋 Привет, Artem!

🔑 Ваш Chat ID:
541805220

📱 Что делать дальше:
1️⃣ Скопируйте число выше
2️⃣ Откройте приложение очереди
3️⃣ Вставьте Chat ID в поле
4️⃣ Нажмите 'Подключить уведомления'

✅ После этого вы будете получать уведомления!
```

### `/help`
Показывает справку по командам

---

## 📱 Как это работает

1. **Студент открывает бота**
   ```
   Открывает t.me/keiin_dorm_laundry_bot
   ```

2. **Нажимает START**
   ```
   Бот отправляет его Chat ID
   ```

3. **Копирует Chat ID**
   ```
   Нажимает на число → копируется
   ```

4. **В приложении вставляет ID**
   ```
   Вставляет в поле "Chat ID от бота"
   Нажимает "Подключить уведомления"
   ```

5. **Готово! ✅**
   ```
   Теперь получает уведомления лично
   ```

---

## 🔧 Настройка

### Токен бота

В файле `telegram_bot.py`:
```python
BOT_TOKEN = "8008452513:AAFFoaZm8PGPHIllv8DG9Oirtmm1Aq-LidY"
```

**Не выкладывайте токен в публичные репозитории!**

---

## 🌐 Развертывание на сервере

### Вариант 1: Screen (простой)

```bash
# Установить screen
sudo apt install screen

# Создать сессию
screen -S laundry_bot

# Запустить бота
python3 telegram_bot.py

# Отключиться (Ctrl+A, потом D)
# Бот продолжит работать в фоне

# Подключиться обратно
screen -r laundry_bot
```

### Вариант 2: Systemd (продвинутый)

Создайте файл `/etc/systemd/system/laundry-bot.service`:

```ini
[Unit]
Description=Laundry Queue Telegram Bot
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/laundry-app
ExecStart=/usr/bin/python3 telegram_bot.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Запуск:
```bash
sudo systemctl enable laundry-bot
sudo systemctl start laundry-bot
sudo systemctl status laundry-bot
```

### Вариант 3: Docker (изолированный)

Создайте `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY telegram_bot.py .

CMD ["python", "telegram_bot.py"]
```

Запуск:
```bash
docker build -t laundry-bot .
docker run -d --name laundry-bot laundry-bot
```

---

## 📊 Логи

Бот выводит логи в консоль:

```
✅ Sent Chat ID to Artem (541805220)
✅ Sent Chat ID to Pavel (123456789)
```

---

## 🐛 Troubleshooting

### Бот не отвечает
- Проверьте что бот запущен: `ps aux | grep telegram_bot`
- Проверьте токен
- Проверьте интернет соединение

### Студент не получает ID
- Попросите его удалить диалог с ботом и написать `/start` заново
- Проверьте что бот запущен

### Chat ID не подключается в приложении
- Проверьте что студент скопировал правильное число
- Проверьте что API endpoint `/api/telegram/link` работает
- Проверьте Supabase соединение

---

## 📝 Примечания

- Бот НЕ хранит никаких данных
- Бот ТОЛЬКО отправляет Chat ID
- Все уведомления отправляются из Next.js приложения
- Бот нужен ТОЛЬКО для получения Chat ID

---

## ✨ Улучшения (опционально)

1. **Автоматическая регистрация** - бот сам регистрирует студента по комнате
2. **Управление из Telegram** - кнопки для входа в очередь
3. **Статус очереди** - команда `/queue` показывает текущую очередь
4. **Напоминания** - "Не забудь вернуть ключ"

Нужно что-то из этого? Скажите! 🚀

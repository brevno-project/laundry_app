# 🚀 Как развернуть Telegram бота

## ⚠️ ВАЖНО: Vercel НЕ подходит!

Vercel для serverless функций (таймаут 10 сек). Бот должен работать 24/7.

---

## 🎯 РЕКОМЕНДУЕМЫЙ СПОСОБ: Railway.app

### Преимущества:
- ✅ **Бесплатно** (500 часов/месяц = достаточно для 24/7)
- ✅ **Очень просто** (3 клика)
- ✅ **Автодеплой** из GitHub
- ✅ **Логи в реальном времени**
- ✅ **Автоперезапуск** при ошибках

---

## 📋 Пошаговая инструкция для Railway:

### Шаг 1: Создайте аккаунт
1. Откройте https://railway.app
2. Нажмите **"Login"**
3. Выберите **"Login with GitHub"**
4. Авторизуйтесь через GitHub

### Шаг 2: Создайте новый проект
1. На главной странице нажмите **"New Project"**
2. Выберите **"Deploy from GitHub repo"**
3. Найдите репозиторий **`brevno-project/laundry_app`**
4. Нажмите **"Deploy"**

### Шаг 3: Настройте
Railway автоматически:
- Установит Python 3.11
- Установит зависимости из `requirements.txt`
- Запустит `python telegram_bot.py`

### Шаг 4: Проверьте логи
1. Откройте проект в Railway
2. Перейдите во вкладку **"Deployments"**
3. Кликните на последний deployment
4. Откройте **"Logs"**

Вы должны увидеть:
```
🤖 Запуск Telegram бота...
📝 Bot username: @keiin_dorm_laundry_bot
✅ Бот запущен и готов к работе!
⏳ Ожидание сообщений...
```

### Шаг 5: Готово! ✅

Теперь бот работает 24/7!

---

## 🔄 Автоматические обновления

При каждом `git push` в `main` ветку:
1. Railway автоматически подтянет изменения
2. Пересоберет проект
3. Перезапустит бота

**Ничего делать не надо!** 🎉

---

## 💰 Бесплатный лимит Railway

**500 часов в месяц** = **~20 дней непрерывной работы**

Если нужно больше:
- **$5/месяц** = безлимитное время

**Но 500 часов достаточно для большинства проектов!**

---

## 🐛 Troubleshooting

### Бот не запускается
1. Проверьте логи в Railway
2. Убедитесь что `requirements.txt` на месте
3. Проверьте что токен правильный

### Бот не отвечает
1. Откройте логи
2. Убедитесь что видите "Бот запущен"
3. Проверьте что нет ошибок

### Превышен лимит часов
Два варианта:
1. Подключить карту ($5/месяц)
2. Использовать Render.com (тоже бесплатно)

---

## 🌐 Альтернативы Railway

### 1. Render.com (бесплатно)
```
1. https://render.com
2. New → Background Worker
3. Connect GitHub repo
4. Start Command: python telegram_bot.py
5. Deploy!
```

**Минусы:**
- Чуть сложнее чем Railway
- Бот "засыпает" после 15 минут неактивности

### 2. fly.io (бесплатно)
```bash
# Установить CLI
curl -L https://fly.io/install.sh | sh

# Войти
fly auth login

# Деплой
fly launch
fly deploy
```

**Минусы:**
- Нужно использовать CLI
- Сложнее для новичков

### 3. Heroku ($7/месяц)
Раньше был бесплатный, теперь платный.

**Не рекомендую**, Railway лучше.

---

## 🖥️ VPS серверы (продвинутый уровень)

Если у вас есть свой сервер:

### Способ 1: Screen (простой)
```bash
screen -S laundry_bot
python3 telegram_bot.py
# Ctrl+A, потом D
```

### Способ 2: Systemd (правильный)
Создайте файл `/etc/systemd/system/laundry-bot.service`:
```ini
[Unit]
Description=Laundry Bot
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/laundry-app
ExecStart=/usr/bin/python3 telegram_bot.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Запуск:
```bash
sudo systemctl enable laundry-bot
sudo systemctl start laundry-bot
```

---

## 💻 Локальный запуск (для теста)

Чтобы протестировать БЕЗ деплоя:

### Windows:
```powershell
pip install python-telegram-bot
python telegram_bot.py
```

### Mac/Linux:
```bash
pip3 install python-telegram-bot
python3 telegram_bot.py
```

**Бот будет работать пока открыто окно терминала.**

---

## 🎓 Рекомендация

### Для учебного проекта:
→ **Railway.app** (бесплатно, просто, надежно)

### Для production:
→ **Railway.app** ($5/месяц) или **VPS сервер**

### Для быстрого теста:
→ **Локально на компьютере**

---

## ✅ Checklist перед деплоем

- [ ] `requirements.txt` создан
- [ ] `telegram_bot.py` готов
- [ ] `Procfile` создан
- [ ] `railway.json` создан
- [ ] Токен бота правильный
- [ ] Репозиторий на GitHub

**Все готово для деплоя на Railway!** 🚀

---

## 📞 Поддержка

Если что-то не работает:
1. Проверьте логи в Railway
2. Убедитесь что бот запущен
3. Проверьте токен
4. Напишите мне!

**Удачи с деплоем!** 🎉

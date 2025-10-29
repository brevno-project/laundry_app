# 🚂 Railway Setup для Webhook

## Почему Webhook на Railway, а не на Vercel?

**ПРОБЛЕМА:** Vercel + Next.js 15 App Router конфликтуют:
- Vercel видит Next.js → игнорирует `/api` в корне
- `app/api` routes не компилируются правильно
- `pages/api` конфликтует с `src/app`

**РЕШЕНИЕ:** 
- **Vercel** → Next.js сайт (⚡ быстро, 🌐 CDN, 🔥 отлично для фронтенда)
- **Railway** → Express webhook (🔄 24/7, 🆓 бесплатно 500ч, ✅ стабильно)

---

## 🚀 SETUP НА RAILWAY (5 минут):

### Шаг 1: Создать проект
1. Откройте https://railway.app
2. Login with GitHub
3. **New Project** → **Deploy from GitHub repo**
4. Выберите `brevno-project/laundry_app`

### Шаг 2: Настроить
Railway автоматически:
- Найдет `Procfile`
- Установит `express`
- Запустит `node webhook-server.js`

### Шаг 3: Получить URL
1. В Railway проекте откройте **Settings**
2. **Generate Domain** → получите URL типа:
   ```
   https://laundry-app-production.up.railway.app
   ```

### Шаг 4: Установить webhook
Откройте в браузере (замените YOUR_RAILWAY_URL):
```
https://api.telegram.org/bot8008452513:AAFFoaZm8PGPHIllv8DG9Oirtmm1Aq-LidY/setWebhook?url=YOUR_RAILWAY_URL/webhook
```

Пример:
```
https://api.telegram.org/bot8008452513:AAFFoaZm8PGPHIllv8DG9Oirtmm1Aq-LidY/setWebhook?url=https://laundry-app-production.up.railway.app/webhook
```

Должно вернуть:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

### Шаг 5: Проверить
1. Health check:
   ```
   https://YOUR_RAILWAY_URL/
   ```
   Должно вернуть: `{"status": "ok", ...}`

2. Telegram бот:
   - Напишите `/start` боту `@keiin_dorm_laundry_bot`
   - Должен прийти Chat ID! ✅

---

## 💰 Бесплатный лимит Railway:

- **500 часов/месяц** = ~20 дней работы
- Достаточно для учебного проекта!
- Если нужно больше: $5/месяц = безлимит

---

## 🔄 Автообновление:

При каждом `git push` в `main`:
1. Railway автоматически подтягивает код
2. Перезапускает сервер
3. Webhook продолжает работать

**Ничего делать не нужно!** 🎉

---

## 🐛 Troubleshooting:

### Webhook не устанавливается
**Проверьте:**
- URL правильный (должен начинаться с https://)
- Railway app запущен (зеленый статус)

### Бот не отвечает
**Проверьте:**
1. Railway logs: есть ли ошибки?
2. Webhook info:
   ```
   https://api.telegram.org/bot8008452513:AAFFoaZm8PGPHIllv8DG9Oirtmm1Aq-LidY/getWebhookInfo
   ```
3. Health check URL работает?

---

## ✅ Checklist:

- [ ] Railway проект создан
- [ ] Domain сгенерирован
- [ ] Webhook установлен
- [ ] Бот отвечает на `/start`
- [ ] Chat ID приходит

**Все работает!** 🎊

# 🔒 Настройка безопасности Laundry App

## ⚠️ КРИТИЧНО: Первые шаги

### 1. Отзовите скомпрометированный Telegram токен

Старый токен был закоммичен в Git и виден всем. **НЕМЕДЛЕННО** отзовите его:

1. Откройте Telegram и найдите **@BotFather**
2. Отправьте `/mybots`
3. Выберите вашего бота
4. Выберите "API Token" → "Revoke current token"
5. Создайте новый токен командой `/newbot` или "Generate New Token"
6. Скопируйте новый токен

### 2. Получите Supabase Service Role Key

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **Settings** → **API**
4. Найдите **service_role key** (НЕ anon key!)
5. Скопируйте его (он начинается с `eyJ...`)

---

## 📝 Настройка переменных окружения

### Локальная разработка

Обновите файл `.env.local` (он уже в `.gitignore`):

```bash
# ============================================
# PUBLIC VARIABLES (видны в браузере клиента)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your_anon_key

# ============================================
# PRIVATE VARIABLES (только на сервере)
# ============================================

# Supabase Service Role Key (для админ-операций)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your_service_role_key

# Telegram Bot Configuration
# ВАЖНО: Используйте НОВЫЙ токен!
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_ADMIN_CHAT_ID=541805220

# Admin Configuration
ADMIN_EMAIL=student-622ddda2@example.com
ADMIN_PASSWORD=your_secure_admin_password_here
```

### Production (Vercel)

1. Откройте ваш проект на [Vercel Dashboard](https://vercel.com/dashboard)
2. Перейдите в **Settings** → **Environment Variables**
3. Добавьте ВСЕ переменные из `.env.local`:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Production, Preview, Development |
| `TELEGRAM_BOT_TOKEN` | `1234567890:ABC...` | Production, Preview, Development |
| `TELEGRAM_ADMIN_CHAT_ID` | `541805220` | Production, Preview, Development |
| `ADMIN_EMAIL` | `student-622ddda2@example.com` | Production, Preview, Development |
| `ADMIN_PASSWORD` | `your_secure_password` | Production, Preview, Development |

4. Нажмите **Save**
5. **Redeploy** проект для применения изменений

---

## 🔐 Что было исправлено

### ✅ Проблема 1: Hardcoded админский email
**Было:** Email админа захардкожен в `LaundryContext.tsx`
```typescript
email: 'student-622ddda2@example.com'
```

**Стало:** Email хранится в переменной окружения `ADMIN_EMAIL` и используется только на сервере в API route `/api/admin/login`

---

### ✅ Проблема 2: Telegram токен в клиентском коде
**Было:** Токен с префиксом `NEXT_PUBLIC_` встраивался в клиентский бандл
```typescript
const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
```

**Стало:** 
- Токен хранится БЕЗ префикса `NEXT_PUBLIC_`
- Все Telegram уведомления идут через API route `/api/telegram/notify`
- Клиент просто вызывает `sendTelegramNotification()`, которая делает fetch к API

---

### ✅ Проблема 3: Использование `supabase.auth.admin` без service role key
**Было:** Попытки вызвать `supabase.auth.admin.deleteUser()` с anon key
```typescript
await supabase.auth.admin.deleteUser(userId); // ❌ Не работает с anon key
```

**Стало:** Создан API route `/api/admin/delete-user` с service role key
```typescript
const response = await fetch('/api/admin/delete-user', {
  method: 'POST',
  body: JSON.stringify({ userId, adminUserId })
});
```

---

### ✅ Проблема 4: Слабый дефолтный админ-ключ
**Было:**
```typescript
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin';
```

**Стало:** Константа `ADMIN_KEY` полностью удалена, используется безопасный пароль из `ADMIN_PASSWORD`

---

## 🚀 Как использовать

### Вход админа

Теперь админ входит через компонент `AdminLogin`, который вызывает:
```typescript
await adminLogin(password); // password проверяется на сервере
```

### Отправка Telegram уведомлений

```typescript
import { sendTelegramNotification } from '@/lib/telegram';

await sendTelegramNotification({
  type: 'joined',
  full_name: 'John Doe',
  room: 'A501',
  wash_count: 1,
  payment_type: 'money',
  queue_length: 5
});
```

Все секретные данные остаются на сервере!

---

## 📋 Чеклист после настройки

- [ ] Отозван старый Telegram токен в @BotFather
- [ ] Создан новый Telegram токен
- [ ] Получен Supabase Service Role Key
- [ ] Обновлен `.env.local` с новыми значениями
- [ ] Добавлены все переменные в Vercel Environment Variables
- [ ] Проект redeploy на Vercel
- [ ] Проверен вход админа
- [ ] Проверена отправка Telegram уведомлений
- [ ] Проверены админ-функции (бан, разбан, удаление)

---

## ⚠️ Важные замечания

1. **НИКОГДА** не используйте префикс `NEXT_PUBLIC_` для секретных данных
2. **ВСЕГДА** проверяйте, что `.env.local` в `.gitignore`
3. **НИКОГДА** не коммитьте файлы с секретами в Git
4. Если секрет был закоммичен - **НЕМЕДЛЕННО** отзовите его и создайте новый
5. Service Role Key дает полный доступ к базе данных - храните его в безопасности!

---

## 🆘 Troubleshooting

### Telegram уведомления не отправляются
- Проверьте, что `TELEGRAM_BOT_TOKEN` установлен БЕЗ префикса `NEXT_PUBLIC_`
- Проверьте логи в `/api/telegram/notify`
- Убедитесь, что токен действителен (не отозван)

### Админ не может войти
- Проверьте, что `ADMIN_EMAIL` и `ADMIN_PASSWORD` установлены
- Проверьте, что email соответствует записи в таблице `students`
- Проверьте, что у студента установлен `is_admin = true` или `is_super_admin = true`

### Админ не может удалять пользователей
- Проверьте, что `SUPABASE_SERVICE_ROLE_KEY` установлен
- Проверьте логи в `/api/admin/delete-user`
- Убедитесь, что ключ корректный (скопирован полностью)

---

## 📚 Дополнительные ресурсы

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-api)
- [Telegram Bot API](https://core.telegram.org/bots/api)

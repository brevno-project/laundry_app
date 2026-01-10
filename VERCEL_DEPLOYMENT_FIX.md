# Vercel Deployment Fix - API Routes 404 Error

## Проблема

API routes возвращают **404** на production (Vercel), хотя в репозитории файлы существуют. Это происходит когда Next.js собирается как **статический экспорт**, и API Routes не публикуются.

## ✅ Проверка конфигурации (выполнено)

### 1. `next.config.ts` - ✅ Корректно
```ts
const nextConfig = {};
```
- ❌ НЕТ `output: 'export'` (это хорошо!)
- ✅ Конфигурация позволяет API routes

### 2. `package.json` - ✅ Корректно
```json
"scripts": {
  "build": "next build"
}
```
- ❌ НЕТ `next export` в build команде
- ✅ Используется стандартный `next build`

### 3. `vercel.json` - ✅ Создан
```json
{
  "buildCommand": "next build",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```
- ✅ Явно указан правильный buildCommand
- ✅ Framework установлен как nextjs

## 🔧 Что нужно сделать в Vercel Dashboard

### Шаг 1: Проверить настройки проекта

1. Открыть проект в Vercel Dashboard
2. **Settings** → **General**
3. Проверить:
   - **Framework Preset:** Next.js
   - **Build Command:** `next build` (или пусто для автоопределения)
   - **Output Directory:** `.next` (или пусто для автоопределения)
   - **Install Command:** `npm install` (или пусто)

### Шаг 2: Проверить Functions

1. Открыть вкладку **Functions** в проекте
2. Должны быть видны функции вида:
   ```
   /api/admin/queue/set-status
   /api/admin/ban-student
   /api/admin/reset-registration
   /api/admin/update-student
   /api/telegram/link
   /api/telegram/notify
   ```
3. **Если Functions пустая** → это подтверждает static export

### Шаг 3: Исправить настройки (если нужно)

Если в Settings видно что-то неправильное:

1. **Build Command:** изменить на `next build` (или оставить пустым)
2. **Output Directory:** оставить пустым или `.next`
3. **НЕ должно быть:**
   - `next export`
   - `outputDirectory: "out"`
   - Кастомных rewrites которые режут `/api`

### Шаг 4: Redeploy

1. После изменения настроек → **Deployments**
2. Нажать **Redeploy** на последнем деплое
3. Или сделать новый commit и push

## 🧪 Проверка после деплоя

### 1. Проверить Functions
В Vercel Dashboard → Functions должны появиться API routes

### 2. Проверить API endpoint
```bash
curl https://your-app.vercel.app/api/admin/queue/set-status
```

**Ожидаемые результаты:**
- ❌ **404** = API routes не собраны (static export)
- ✅ **401** = API routes работают, но нужна авторизация (это правильно!)
- ✅ **403** = API routes работают, но недостаточно прав

### 3. Проверить в браузере
Открыть DevTools → Network → попробовать админскую функцию (бан, редактирование)

**Правильный ответ:**
```json
{
  "error": "Invalid token",
  "details": "..."
}
```

**Неправильный ответ:**
```
404 - NOT_FOUND
```

## 📋 Checklist

- [x] `next.config.ts` не содержит `output: 'export'`
- [x] `package.json` build script использует `next build`
- [x] Создан `vercel.json` с правильной конфигурацией
- [ ] В Vercel Settings установлен Framework: Next.js
- [ ] В Vercel Settings Build Command: `next build` или пусто
- [ ] В Vercel Settings Output Directory: пусто или `.next`
- [ ] Выполнен Redeploy после изменений
- [ ] В Vercel Functions видны API routes
- [ ] API endpoints возвращают 401/403 вместо 404

## 🚨 Частые ошибки

### 1. Output Directory = "out"
Это признак static export. Должно быть пусто или `.next`

### 2. Build Command содержит "export"
```bash
# ❌ Неправильно
next build && next export

# ✅ Правильно
next build
```

### 3. В next.config есть output: 'export'
```ts
// ❌ Неправильно
const nextConfig = {
  output: 'export'
};

// ✅ Правильно
const nextConfig = {};
```

## 📝 После исправления

После того как API routes заработают (401/403 вместо 404), нужно будет:

1. Добавить `SUPABASE_URL` в Environment Variables (см. VERCEL_ENV_SETUP.md)
2. Redeploy
3. Проверить что админские функции работают

## 🔗 Полезные ссылки

- [Next.js API Routes на Vercel](https://vercel.com/docs/frameworks/nextjs#api-routes)
- [Next.js Static Exports](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Vercel Functions](https://vercel.com/docs/functions)

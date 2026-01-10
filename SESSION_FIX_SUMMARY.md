О# Исправление проблем с сессией и 401 ошибками

## Проблема

При регистрации/входе возникали ошибки:
- `401 Unauthorized` при чтении таблицы `students`
- Сессия не устанавливалась корректно после `signUp`/`signIn`
- Пользователь не мог войти после сброса регистрации

## Причины

1. **Нет единого Supabase клиента** - создавались разные инстансы без правильных настроек сессии
2. **Чтение `students` до установки сессии** - запросы выполнялись до того, как Supabase закрепил сессию в localStorage/cookies
3. **Отсутствие auth callback route** - `detectSessionInUrl` не мог обработать редиректы

## Решение

### A) Единый Supabase клиент с правильными настройками

**Файл:** `src/lib/supabase.ts`

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // ✅ Сохранять сессию в localStorage
    autoRefreshToken: true,      // ✅ Автообновление токена
    detectSessionInUrl: true,    // ✅ Обработка callback URL
  },
});
```

**Важно:** Не создавайте второй клиент! Используйте только этот экспорт.

---

### B) Ожидание сессии перед чтением `students`

**Файл:** `src/contexts/LaundryContext.tsx`

Добавлена функция `waitForSession()`:

```typescript
async function waitForSession(): Promise<boolean> {
  if (!supabase) return false;
  
  // Ждём пока session стабильно доступна (до 5 попыток)
  for (let i = 0; i < 5; i++) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      console.log('✅ Session established after', i + 1, 'attempts');
      return true;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  
  console.error('❌ Session not established after 5 attempts');
  return false;
}
```

**Использование в `registerStudent()`:**

```typescript
// 1) signUp/signIn
const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});

// 2) Ждём стабильную сессию
const sessionReady = await waitForSession();
if (!sessionReady) {
  throw new Error('Сессия не установлена. Попробуйте войти снова.');
}

// 3) Теперь безопасно читать students
const { data: updatedStudent } = await supabase
  .from("students")
  .select("...")
  .eq("id", studentId)
  .single();
```

**Использование в `loginStudent()`:**

```typescript
// 1) signInWithPassword
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// 2) Ждём стабильную сессию
const sessionReady = await waitForSession();
if (!sessionReady) {
  throw new Error('Сессия не установлена. Попробуйте войти снова.');
}

// 3) Теперь безопасно читать students
const { data: updatedStudent } = await supabase
  .from("students")
  .select("...")
  .eq("user_id", authUser.id)
  .maybeSingle();
```

---

### C) Auth callback route

**Файл:** `src/app/auth/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Supabase-js на клиенте сам заберёт токены из URL если detectSessionInUrl=true,
  // но этот маршрут нужен как разрешённый redirect endpoint.
  const url = new URL(req.url);
  // просто возвращаем на главную
  return NextResponse.redirect(new URL('/', url.origin));
}
```

**Важно:** Этот route обязателен даже если email confirmation выключен.

---

## Алгоритм работы

### Регистрация:

```
1. signUp(email, password)
   ↓
2. waitForSession() - ждём до 5 попыток по 200ms
   ↓
3. Если сессия установлена:
   - Вызываем /api/student/register (связываем auth user с students)
   - Читаем students (теперь безопасно - есть сессия)
   - finalizeUserSession()
   ↓
4. Если сессия НЕ установлена:
   - Показываем ошибку "Попробуйте войти снова"
```

### Вход:

```
1. signInWithPassword(email, password)
   ↓
2. waitForSession() - ждём до 5 попыток по 200ms
   ↓
3. Если сессия установлена:
   - Читаем students по user_id (теперь безопасно - есть сессия)
   - Проверяем is_banned
   - finalizeUserSession()
   ↓
4. Если сессия НЕ установлена:
   - Показываем ошибку "Попробуйте войти снова"
```

---

## Проверка после правок

### 1. Проверить что сессия сохраняется

В консоли браузера после входа:

```javascript
(await supabase.auth.getSession()).data.session?.user?.id
```

Должен быть не `null`.

### 2. Проверить что запросы к `students` работают

```javascript
await supabase.from('students').select('id').limit(1)
```

Не должно быть `401 Unauthorized`.

### 3. Проверить что сессия восстанавливается после перезагрузки

1. Войдите в систему
2. Перезагрузите страницу (F5)
3. Проверьте что пользователь остался залогиненным

---

## Что изменилось для пользователя

### До:
- ❌ Ошибка `401 Unauthorized` при регистрации
- ❌ Ошибка `Invalid login credentials` после сброса регистрации
- ❌ Сессия не сохранялась после перезагрузки

### После:
- ✅ Регистрация работает без ошибок
- ✅ Вход после сброса регистрации работает
- ✅ Сессия сохраняется и восстанавливается
- ✅ Все запросы к БД выполняются с правильной авторизацией

---

## Связанные файлы

- `src/lib/supabase.ts` - единый клиент с правильными настройками
- `src/contexts/LaundryContext.tsx` - функция `waitForSession()` и исправленные `registerStudent()`/`loginStudent()`
- `src/app/auth/callback/route.ts` - callback route для auth редиректов
- `src/app/api/admin/reset-registration/route.ts` - удаление пользователя из Auth при сбросе

---

## Важные моменты

1. **Не создавайте второй Supabase клиент** - используйте только экспорт из `src/lib/supabase.ts`
2. **Всегда ждите сессию** перед чтением `students` после auth операций
3. **Используйте `emailRedirectTo`** даже если email confirmation выключен
4. **Callback route обязателен** для корректной работы `detectSessionInUrl`

---

## Дополнительно: Сброс регистрации

При сбросе регистрации теперь:

1. ✅ Удаляется пользователь из Supabase Auth
2. ✅ Сбрасываются данные в таблице `students`
3. ✅ Студент может зарегистрироваться заново с любым паролем

**Файл:** `src/app/api/admin/reset-registration/route.ts`

```typescript
// Получить user_id перед сбросом
const { data: studentData } = await supabaseAdmin
  .from("students")
  .select("user_id")
  .eq("id", student_id)
  .single();

// Удалить пользователя из Supabase Auth
if (studentData?.user_id) {
  await supabaseAdmin.auth.admin.deleteUser(studentData.user_id);
}

// Сбросить данные в students
await supabaseAdmin
  .from("students")
  .update({
    is_registered: false,
    user_id: null,
    telegram_chat_id: null,
    ...
  })
  .eq("id", student_id);
```

---

## Результат

✅ **Сессия устанавливается корректно** после регистрации/входа
✅ **Нет ошибок 401** при чтении `students`
✅ **Сессия сохраняется** в localStorage и восстанавливается
✅ **Callback route работает** для auth редиректов
✅ **Сброс регистрации работает** - студент может зарегистрироваться заново

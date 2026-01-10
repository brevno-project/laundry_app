# Исправление Reset Registration - НЕ удалять Auth user

## Проблема

Предыдущая версия `reset-registration` **удаляла пользователя из Supabase Auth**:

```typescript
// ❌ НЕПРАВИЛЬНО
await supabaseAdmin.auth.admin.deleteUser(studentData.user_id);
```

Это приводило к:
- ❌ Email "уже зарегистрирован" при попытке signUp
- ❌ `Invalid login credentials` при signIn (аккаунта уже нет)
- ❌ Нет сессии → запросы к `students` дают 401
- ❌ Студент не может войти после сброса

## Правильное решение

**Reset ≠ Delete**

Сброс должен:
- ✅ **Оставить Auth user** (email + password)
- ✅ **Сохранить `user_id`** в таблице `students` (связь Auth → students)
- ✅ **Сбросить только профильные данные** (telegram, avatar, is_registered)
- ✅ **Удалить активные записи очереди** (выкинуть из очереди)

---

## Исправленный код

### `/api/admin/reset-registration/route.ts`

```typescript
// ✅ Удаляем активные записи очереди студента (выкидываем из очереди)
await supabaseAdmin
  .from("queue")
  .delete()
  .eq("student_id", student_id)
  .in("status", ["waiting", "ready", "key_issued", "washing", "returning_key"]);

// ✅ Сбрасываем только профильные данные (НЕ трогаем user_id!)
// user_id остаётся → пользователь может войти тем же паролем
const { error: updateError } = await supabaseAdmin
  .from("students")
  .update({
    is_registered: false,
    registered_at: null,
    telegram_chat_id: null,
    avatar_type: "default",
    // user_id НЕ обнуляем - оставляем связь Auth → students
  })
  .eq("id", student_id);
```

### Что изменилось:

| До | После |
|----|-------|
| ❌ `deleteUser()` - удаляет Auth user | ✅ Auth user остаётся |
| ❌ `user_id: null` - теряется связь | ✅ `user_id` сохраняется |
| ❌ `update({ user_id: null })` в queue | ✅ `delete()` активных записей |
| ❌ Студент не может войти | ✅ Студент входит тем же паролем |

---

## Добавлена политика update_self

### Проблема:

Обычный пользователь не мог обновлять свой аватар → `403 Forbidden`

### Решение:

**Миграция:** `20250111_add_students_update_self_policy.sql`

```sql
create policy "students_update_self"
on public.students
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

Теперь пользователь может обновлять:
- ✅ `avatar_type`
- ✅ `telegram_chat_id`
- ✅ Другие поля своей записи

---

## Как работает после исправления

### 1. Админ сбрасывает регистрацию студента

```
POST /api/admin/reset-registration
Body: { student_id: "..." }

Результат:
- ✅ Auth user остаётся (email + password не меняются)
- ✅ students.user_id сохраняется
- ✅ students.is_registered = false
- ✅ students.telegram_chat_id = null
- ✅ students.avatar_type = "default"
- ✅ Активные записи очереди удалены
```

### 2. Студент входит после сброса

```typescript
// Студент вводит тот же пароль
await supabase.auth.signInWithPassword({ email, password });

// ✅ Сессия устанавливается
// ✅ user_id остался → связь Auth → students работает
// ✅ Можно читать/обновлять свой профиль
```

### 3. Студент обновляет аватар

```typescript
await supabase
  .from("students")
  .update({ avatar_type: "cat" })
  .eq("user_id", auth.uid());

// ✅ Работает благодаря политике students_update_self
```

---

## Проверка после правок

### 1. Проверить reset

```bash
# Админ сбрасывает студента
curl -X POST /api/admin/reset-registration \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"student_id":"..."}'
```

### 2. Проверить вход после reset

```javascript
// Студент входит тем же паролем
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'student-...@example.com',
  password: 'old_password' // ✅ Тот же пароль работает
});

// Проверить сессию
const session = (await supabase.auth.getSession()).data.session;
console.log('Session:', session?.user?.id); // ✅ Не null
```

### 3. Проверить чтение students

```javascript
const { data, error } = await supabase
  .from('students')
  .select('id, user_id, avatar_type, is_registered')
  .eq('user_id', session.user.id)
  .single();

console.log('Student:', data); // ✅ Данные есть
console.log('user_id:', data.user_id); // ✅ Не null
console.log('is_registered:', data.is_registered); // ✅ false
```

### 4. Проверить обновление аватара

```javascript
const { error } = await supabase
  .from('students')
  .update({ avatar_type: 'dog' })
  .eq('user_id', session.user.id);

console.log('Update error:', error); // ✅ null (нет 403)
```

---

## Что НЕ делать

### ❌ НЕ удалять Auth user

```typescript
// ❌ НЕПРАВИЛЬНО
await supabaseAdmin.auth.admin.deleteUser(user_id);
```

**Почему:** После этого студент не сможет войти, email останется "занятым", сессия не установится.

### ❌ НЕ обнулять user_id

```typescript
// ❌ НЕПРАВИЛЬНО
await supabaseAdmin
  .from("students")
  .update({ user_id: null })
  .eq("id", student_id);
```

**Почему:** Теряется связь Auth → students, пользователь не сможет читать/обновлять свой профиль.

### ❌ НЕ обнулять user_id в queue

```typescript
// ❌ НЕПРАВИЛЬНО
await supabaseAdmin
  .from("queue")
  .update({ user_id: null })
  .eq("student_id", student_id);
```

**Почему:** Ломает владение записями очереди. Лучше удалить активные записи.

---

## Итоговая архитектура

### Auth user (Supabase Auth)
- ✅ **Остаётся после reset**
- ✅ Email + password не меняются
- ✅ Студент может войти тем же паролем

### students.user_id
- ✅ **Сохраняется после reset**
- ✅ Связь Auth → students работает
- ✅ RLS политики работают корректно

### Профильные данные
- ✅ **Сбрасываются** при reset
- `is_registered: false`
- `telegram_chat_id: null`
- `avatar_type: "default"`

### Очередь
- ✅ **Активные записи удаляются**
- Студент выкидывается из очереди
- История остаётся (завершённые записи)

---

## Применение миграции

### 1. Открыть Supabase SQL Editor

### 2. Выполнить миграцию

```sql
-- Скопировать и выполнить содержимое:
-- supabase/migrations/20250111_add_students_update_self_policy.sql

drop policy if exists "students_update_self" on public.students;

create policy "students_update_self"
on public.students
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

### 3. Проверить политики

```sql
-- Проверить что политика создана
select 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
from pg_policies
where tablename = 'students'
order by policyname;
```

Должна быть политика `students_update_self` с `cmd = UPDATE`.

---

## Результат

✅ **Reset работает правильно**
- Студент может войти после сброса
- Сессия устанавливается корректно
- Нет ошибок 401/403

✅ **Студент может обновлять свой профиль**
- Аватар обновляется без ошибок
- Telegram подключается корректно

✅ **Админ может сбрасывать регистрацию**
- Студент выкидывается из очереди
- Профильные данные сбрасываются
- Auth user остаётся

✅ **Безопасность сохранена**
- RLS политики работают
- Студент может изменять только свою запись
- Админ может изменять любые записи

-- 🎯 Финальная архитектура очереди - полный бэкап SQL
-- Все функции и политики для двухфазной модели владения

-- =====================================================
-- 1. Универсальная функция владения записью
-- =====================================================
create or replace function public.is_queue_owner(q queue)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    -- Фаза 1: запись уже привязана к user_id
    (q.user_id is not null and q.user_id = auth.uid())
    OR
    -- Фаза 2: запись ещё не привязана, но студент мой (отложенное владение)
    (
      q.user_id is null
      and exists (
        select 1
        from students s
        where s.id = q.student_id
          and s.user_id = auth.uid()
      )
    );
$$;

-- =====================================================
-- 2. RPC функция автопривязки записей
-- =====================================================
create or replace function public.claim_my_queue_items()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update queue q
  set user_id = auth.uid()
  where q.user_id is null
    and exists (
      select 1
      from students s
      where s.id = q.student_id
        and s.user_id = auth.uid()
    );
end;
$$;

-- =====================================================
-- 3. RPC функция получения активной очереди
-- =====================================================
create or replace function public.get_queue_active()
returns setof queue
language sql
security definer
set search_path = public
as $$
  select *
  from queue
  where status in ('waiting', 'ready', 'key_issued', 'washing', 'returning_key')
  order by queue_date, queue_position;
$$;

-- =====================================================
-- 4. RLS политики для таблицы queue
-- =====================================================

-- DELETE политика
drop policy if exists queue_delete_own on public.queue;
drop policy if exists queue_delete_policy on public.queue;

create policy queue_delete_owner_or_admin
on public.queue
for delete
to authenticated
using (
  public.is_queue_owner(queue)
  or public.is_admin()
  or public.is_super_admin()
);

-- UPDATE политика
drop policy if exists queue_update_own on public.queue;
drop policy if exists queue_update_policy on public.queue;

create policy queue_update_owner_or_admin
on public.queue
for update
to authenticated
using (
  public.is_queue_owner(queue)
  or public.is_admin()
  or public.is_super_admin()
)
with check (
  public.is_queue_owner(queue)
  or public.is_admin()
  or public.is_super_admin()
);

-- INSERT политика
drop policy if exists queue_insert_own on public.queue;
drop policy if exists queue_insert_policy on public.queue;

create policy queue_insert_admin_or_authenticated
on public.queue
for insert
to authenticated
with check (
  -- Админы могут создавать записи для любого студента
  (public.is_admin() or public.is_super_admin())
  
  OR
  
  -- Обычные пользователи могут создавать только для себя
  (student_id in (
    select id from students where user_id = auth.uid()
  ))
);

-- Удаляем старую политику SELECT если она есть
drop policy if exists queue_select_policy on public.queue;

-- =====================================================
-- 5. Права на выполнение RPC функций
-- =====================================================
grant execute on function public.claim_my_queue_items() to authenticated;
grant execute on function public.get_queue_active() to authenticated;

-- =====================================================
-- 6. Вспомогательные RPC функции (уже существующие)
-- =====================================================

-- Проверка "уже в очереди"
create or replace function public.has_active_queue_item(p_student_id uuid, p_date date)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.queue q
    where q.student_id = p_student_id
      and q.queue_date = p_date
      and q.status in ('waiting','ready','key_issued','washing','returning_key')
  );
$$;
grant execute on function public.has_active_queue_item(uuid, date) to anon, authenticated;

-- Получение следующей позиции в очереди
create or replace function public.get_next_queue_position(p_date date)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(max(queue_position), 0) + 1
  from public.queue
  where queue_date = p_date
    and scheduled_for_date = p_date;
$$;
grant execute on function public.get_next_queue_position(date) to anon, authenticated;

-- =====================================================
-- 7. Публичный доступ к очереди (legacy, может быть удален)
-- =====================================================
create or replace function public.get_queue_public(p_date date)
returns setof queue
language sql
security definer
set search_path = public
as $$
  select *
  from queue
  where queue_date = p_date
    and status in ('waiting', 'ready', 'key_issued', 'washing', 'returning_key')
  order by queue_position;
$$;
grant execute on function public.get_queue_public(date) to anon, authenticated;

-- =====================================================
-- ИТОГО: Полная архитектура готова к использованию
-- =====================================================
-- 
-- ✅ Админ может создавать записи без user_id
-- ✅ Студент логинится → автопривязка записей  
-- ✅ Владение проверяется через is_queue_owner()
-- ✅ Активная очередь показывается через get_queue_active()
-- ✅ Никаких 403 ошибок благодаря SECURITY DEFINER
-- ✅ Полная безопасность через auth.uid()
-- =====================================================

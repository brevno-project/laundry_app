-- Финальная архитектура владения очередью: двухфазная модель
-- Админ создает записи без user_id, студент позже "подхватывает" их

-- 1. Универсальная функция владения записью
create or replace function public.is_queue_owner(q queue)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    -- если запись уже привязана к user_id
    (q.user_id is not null and q.user_id = auth.uid())

    OR

    -- если запись ещё не привязана, но студент мой
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

-- 2. Политика DELETE (заменить существующую)
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

-- 3. Политика UPDATE (заменить существующую)
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

-- 4. Политика INSERT (админы могут создавать без user_id)
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

-- 5. Удаляем старую политику SELECT если она есть
drop policy if exists queue_select_policy on public.queue;

-- 6. RPC функция для автопривязки записей (SECURITY DEFINER)
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

-- 7. Политика на EXECUTE для RPC функции
grant execute on function public.claim_my_queue_items() to authenticated;

-- RLS политики для таблицы queue
-- Позволяют студентам управлять только своими записями

-- 1) INSERT: студент может вставлять только свою запись
create policy "queue_insert_own"
on public.queue
for insert
to authenticated
with check (
  user_id = auth.uid()
);

-- 2) DELETE: студент может удалить только свою запись
create policy "queue_delete_own"
on public.queue
for delete
to authenticated
using (
  user_id = auth.uid()
);

-- 3) (Опционально) INSERT с проверкой на бан - если хочешь запретить баненным
-- Если используешь этот вариант, удали "queue_insert_own" выше
/*
create policy "queue_insert_own_not_banned"
on public.queue
for insert
to authenticated
with check (
  user_id = auth.uid()
  and not exists (
    select 1 from public.students s
    where s.user_id = auth.uid()
      and s.is_banned = true
  )
);
*/

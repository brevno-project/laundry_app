-- Проверка и исправление Foreign Key для history.user_id
-- Запустить в Supabase SQL Editor

-- 1. Проверяем текущие FK constraints
select
  conname,
  conrelid::regclass as table_name,
  confrelid::regclass as ref_table,
  confdeltype as delete_action
from pg_constraint
where contype = 'f'
  and conrelid in ('public.history'::regclass, 'public.students'::regclass, 'public.queue'::regclass)
order by table_name, conname;

-- confdeltype значения:
-- c = CASCADE (нужно для history)
-- n = SET NULL (опасно, если колонка NOT NULL)
-- a = NO ACTION

-- 2. Если history.user_id не CASCADE, исправляем это
-- (раскомментировать если нужно)

-- alter table public.history
--   drop constraint if exists history_user_id_fkey;

-- alter table public.history
--   add constraint history_user_id_fkey
--   foreign key (user_id) references auth.users(id)
--   on delete cascade;

-- 3. Проверяем что history.user_id может быть NULL (важно для CASCADE)
select 
  column_name,
  is_nullable,
  data_type
from information_schema.columns 
where table_name = 'history' 
  and column_name = 'user_id';

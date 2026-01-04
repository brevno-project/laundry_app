-- RPC функции для безопасного доступа к queue
-- Заменяют прямые SELECT запросы из таблицы queue

-- 1) Проверка "уже в очереди"
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

-- 2) Получение следующей позиции в очереди
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

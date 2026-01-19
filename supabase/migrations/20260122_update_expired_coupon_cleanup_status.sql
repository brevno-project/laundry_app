-- Only remove expired coupon queue items that have not started washing.

create or replace function public.cleanup_expired_coupon_queue(p_grace_minutes integer default 5)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with expired_queue as (
    select q.id
    from public.queue q
    join public.coupons c on c.reserved_queue_id = q.id
    where q.coupons_used > 0
      and q.status in ('waiting', 'ready', 'key_issued')
      and q.washing_started_at is null
      and c.used_at is null
      and c.used_in_queue_id is null
      and c.expires_at <= (now() - make_interval(mins => p_grace_minutes))
    group by q.id
  ), released as (
    update public.coupons
      set reserved_queue_id = null,
          reserved_at = null
    where reserved_queue_id in (select id from expired_queue)
      and used_at is null
      and used_in_queue_id is null
  )
  delete from public.queue
  where id in (select id from expired_queue);
end;
$$;

grant execute on function public.cleanup_expired_coupon_queue(integer) to authenticated;

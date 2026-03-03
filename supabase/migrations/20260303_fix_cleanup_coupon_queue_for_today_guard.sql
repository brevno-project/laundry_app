-- Do not delete in-progress coupon queue entries during daily cleanup.
-- Keep rows where washing already started, even if queue_date is in the past.

create or replace function public.cleanup_coupon_queue_for_today()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with stale as (
    select id
    from public.queue
    where coupons_used > 0
      and queue_date < current_date
      and status = 'waiting'
      and washing_started_at is null
  ), released as (
    update public.coupons
      set reserved_queue_id = null,
          reserved_at = null
    where reserved_queue_id in (select id from stale)
      and used_at is null
      and used_in_queue_id is null
  )
  delete from public.queue
  where id in (select id from stale);
end;
$$;

grant execute on function public.cleanup_coupon_queue_for_today() to authenticated;

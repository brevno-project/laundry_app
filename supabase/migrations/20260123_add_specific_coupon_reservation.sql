-- Allow reserving specific coupons for a queue item.

create or replace function public.reserve_specific_coupons_for_queue(p_queue_id uuid, p_coupon_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_queue_date date;
  v_wash_count integer;
  v_requested integer;
  v_reserved integer;
begin
  if p_coupon_ids is null or array_length(p_coupon_ids, 1) is null or array_length(p_coupon_ids, 1) = 0 then
    return;
  end if;

  select student_id, queue_date, wash_count
    into v_student_id, v_queue_date, v_wash_count
  from public.queue
  where id = p_queue_id;

  if v_student_id is null then
    raise exception 'Queue item not found';
  end if;

  if not (public.is_student_owner(v_student_id) or public.is_admin() or public.is_super_admin()) then
    raise exception 'Not allowed';
  end if;

  v_requested := array_length(p_coupon_ids, 1);
  if v_wash_count is not null and v_requested > v_wash_count then
    raise exception 'Too many coupons';
  end if;

  with eligible as (
    select c.id
    from public.coupons c
    where c.id = any(p_coupon_ids)
      and c.owner_student_id = v_student_id
      and c.used_at is null
      and c.used_in_queue_id is null
      and c.reserved_queue_id is null
      and c.expires_at > now()
      and (
        case
          when (c.expires_at - c.issued_at) >= interval '1 day'
            then v_queue_date < (c.expires_at::date)
          else v_queue_date = current_date and c.expires_at > now()
        end
      )
    for update skip locked
  ), updated as (
    update public.coupons
      set reserved_queue_id = p_queue_id,
          reserved_at = now()
    where id in (select id from eligible)
    returning id
  )
  select count(*) into v_reserved from updated;

  if v_reserved < v_requested then
    raise exception 'Not enough coupons';
  end if;
end;
$$;

grant execute on function public.reserve_specific_coupons_for_queue(uuid, uuid[]) to authenticated;

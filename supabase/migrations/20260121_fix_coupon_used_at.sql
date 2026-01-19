-- Use used_at to track consumed coupons even after queue rows are deleted.

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

create or replace function public.reserve_coupons_for_queue(p_queue_id uuid, p_count integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_queue_date date;
  v_reserved integer;
begin
  if p_count is null or p_count <= 0 then
    return;
  end if;

  select student_id, queue_date
    into v_student_id, v_queue_date
  from public.queue
  where id = p_queue_id;

  if v_student_id is null then
    raise exception 'Queue item not found';
  end if;

  if not (public.is_student_owner(v_student_id) or public.is_admin() or public.is_super_admin()) then
    raise exception 'Not allowed';
  end if;

  with eligible as (
    select c.id
    from public.coupons c
    where c.owner_student_id = v_student_id
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
    order by c.expires_at asc, c.issued_at asc
    limit p_count
    for update skip locked
  ), updated as (
    update public.coupons
      set reserved_queue_id = p_queue_id,
          reserved_at = now()
    where id in (select id from eligible)
    returning id
  )
  select count(*) into v_reserved from updated;

  if v_reserved < p_count then
    raise exception 'Not enough coupons';
  end if;
end;
$$;

create or replace function public.release_coupons_for_queue(p_queue_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
begin
  select student_id into v_student_id
  from public.queue
  where id = p_queue_id;

  if v_student_id is null then
    return;
  end if;

  if not (public.is_student_owner(v_student_id) or public.is_admin() or public.is_super_admin()) then
    raise exception 'Not allowed';
  end if;

  update public.coupons
    set reserved_queue_id = null,
        reserved_at = null
  where reserved_queue_id = p_queue_id
    and used_at is null
    and used_in_queue_id is null;
end;
$$;

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

create or replace function public.transfer_coupon(p_coupon_id uuid, p_to_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_from_apartment uuid;
  v_to_apartment uuid;
  v_performed_by uuid;
  v_expired boolean;
begin
  select owner_student_id, (expires_at <= now())
    into v_owner_id, v_expired
  from public.coupons
  where id = p_coupon_id;

  if v_owner_id is null then
    raise exception 'Coupon not found';
  end if;

  if v_expired then
    raise exception 'Coupon expired';
  end if;

  if not (public.is_admin() or public.is_super_admin() or public.is_student_owner(v_owner_id)) then
    raise exception 'Not allowed';
  end if;

  if exists (
    select 1 from public.coupons
    where id = p_coupon_id
      and (reserved_queue_id is not null or used_at is not null or used_in_queue_id is not null)
  ) then
    raise exception 'Coupon is reserved or used';
  end if;

  select apartment_id into v_from_apartment
    from public.students
    where id = v_owner_id;

  select apartment_id into v_to_apartment
    from public.students
    where id = p_to_student_id;

  if v_from_apartment is null or v_to_apartment is null or v_from_apartment <> v_to_apartment then
    raise exception 'Different apartment';
  end if;

  select s.id into v_performed_by
  from public.students s
  where s.user_id = auth.uid();

  update public.coupons
    set owner_student_id = p_to_student_id
  where id = p_coupon_id;

  insert into public.coupon_transfers (
    coupon_id,
    from_student_id,
    to_student_id,
    performed_by
  ) values (
    p_coupon_id,
    v_owner_id,
    p_to_student_id,
    coalesce(v_performed_by, v_owner_id)
  );
end;
$$;

-- Backfill used_at for coupons already marked as used.
update public.coupons
  set used_at = now()
where used_at is null
  and used_in_queue_id is not null;

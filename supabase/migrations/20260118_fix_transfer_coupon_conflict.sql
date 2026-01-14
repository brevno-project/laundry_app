-- Avoid unique conflicts when transferring cleanup coupons
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
  v_from_room text;
  v_to_room text;
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
      and (reserved_queue_id is not null or used_in_queue_id is not null)
  ) then
    raise exception 'Coupon is reserved or used';
  end if;

  select apartment_id, nullif(btrim(room), '')
    into v_from_apartment, v_from_room
  from public.students
  where id = v_owner_id;

  select apartment_id, nullif(btrim(room), '')
    into v_to_apartment, v_to_room
  from public.students
  where id = p_to_student_id;

  if v_from_apartment is not null and v_to_apartment is not null then
    if v_from_apartment <> v_to_apartment then
      raise exception 'Different apartment';
    end if;
  else
    if v_from_room is null or v_to_room is null or v_from_room <> v_to_room then
      raise exception 'Different apartment';
    end if;
  end if;

  select s.id into v_performed_by
  from public.students s
  where s.user_id = auth.uid();

  update public.coupons
    set owner_student_id = p_to_student_id,
        source_type = 'transfer',
        source_id = null
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

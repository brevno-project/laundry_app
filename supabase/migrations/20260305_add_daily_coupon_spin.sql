-- Daily coupon spin lottery (one spin per student per day).
-- Server route calls SECURITY DEFINER RPC with service role key.

create table if not exists public.daily_coupon_spins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  spin_date date not null,
  roll_value integer not null check (roll_value >= 0 and roll_value <= 9999),
  win_probability_bps integer not null check (win_probability_bps >= 0 and win_probability_bps <= 10000),
  won boolean not null default false,
  coupon_id uuid references public.coupons(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_id, spin_date)
);

create index if not exists daily_coupon_spins_student_created_idx
  on public.daily_coupon_spins (student_id, created_at desc);

create index if not exists daily_coupon_spins_date_idx
  on public.daily_coupon_spins (spin_date desc);

alter table public.daily_coupon_spins enable row level security;

drop policy if exists daily_coupon_spins_select_own_or_admin on public.daily_coupon_spins;
create policy daily_coupon_spins_select_own_or_admin
  on public.daily_coupon_spins
  for select
  to authenticated
  using (
    public.is_admin()
    or public.is_super_admin()
    or public.is_cleanup_admin()
    or public.is_student_owner(student_id)
  );

insert into public.app_settings (key, value_int)
values
  ('daily_spin_win_probability_bps', 50),      -- 0.50%
  ('daily_spin_coupon_ttl_seconds', 604800)    -- 7 days
on conflict (key) do nothing;

create or replace function public.perform_daily_coupon_spin(
  p_student_id uuid,
  p_spin_date date,
  p_win_probability_bps integer,
  p_coupon_ttl_seconds integer,
  p_roll_value integer
)
returns table (
  spin_id uuid,
  already_spun boolean,
  won boolean,
  coupon_id uuid,
  roll_value integer,
  win_probability_bps integer,
  spin_date date,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spin public.daily_coupon_spins%rowtype;
  v_probability integer := least(10000, greatest(0, coalesce(p_win_probability_bps, 0)));
  v_ttl_seconds integer := greatest(60, coalesce(p_coupon_ttl_seconds, 604800));
  v_roll integer := least(9999, greatest(0, coalesce(p_roll_value, 0)));
  v_won boolean := false;
  v_coupon_id uuid := null;
begin
  if p_student_id is null or p_spin_date is null then
    raise exception 'student_id and spin_date are required';
  end if;

  v_won := (v_roll < v_probability);

  begin
    insert into public.daily_coupon_spins (
      student_id,
      spin_date,
      roll_value,
      win_probability_bps,
      won
    )
    values (
      p_student_id,
      p_spin_date,
      v_roll,
      v_probability,
      v_won
    )
    returning * into v_spin;
  exception when unique_violation then
    select *
      into v_spin
    from public.daily_coupon_spins
    where student_id = p_student_id
      and spin_date = p_spin_date
    limit 1;

    return query
    select
      v_spin.id,
      true,
      v_spin.won,
      v_spin.coupon_id,
      v_spin.roll_value,
      v_spin.win_probability_bps,
      v_spin.spin_date,
      v_spin.created_at;
    return;
  end;

  if v_won then
    insert into public.coupons (
      owner_student_id,
      source_type,
      source_id,
      issued_by,
      issued_at,
      valid_from,
      expires_at,
      note
    )
    values (
      p_student_id,
      'manual',
      null,
      null,
      now(),
      now(),
      now() + make_interval(secs => v_ttl_seconds),
      'daily_spin_reward'
    )
    returning id into v_coupon_id;

    update public.daily_coupon_spins
    set coupon_id = v_coupon_id
    where id = v_spin.id
    returning * into v_spin;
  end if;

  return query
  select
    v_spin.id,
    false,
    v_spin.won,
    v_spin.coupon_id,
    v_spin.roll_value,
    v_spin.win_probability_bps,
    v_spin.spin_date,
    v_spin.created_at;
end;
$$;

revoke all on function public.perform_daily_coupon_spin(uuid, date, integer, integer, integer) from public;
grant execute on function public.perform_daily_coupon_spin(uuid, date, integer, integer, integer) to service_role;

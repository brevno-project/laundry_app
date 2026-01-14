-- Apartments
create table if not exists public.apartments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  block text check (block in ('A','B'))
);

alter table public.students
  add column if not exists apartment_id uuid references public.apartments(id);

insert into public.apartments (code, block)
select distinct s.room as code,
  case
    when upper(left(s.room, 1)) in ('A','B') then upper(left(s.room, 1))
    else null
  end as block
from public.students s
where s.room is not null and s.room <> ''
on conflict (code) do nothing;

update public.students s
set apartment_id = a.id
from public.apartments a
where s.room = a.code
  and s.apartment_id is null;

create or replace function public.ensure_apartment_for_room()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  apt_id uuid;
  apt_block text;
begin
  if new.room is null or new.room = '' then
    new.apartment_id := null;
    return new;
  end if;

  apt_block := upper(left(new.room, 1));
  if apt_block not in ('A','B') then
    apt_block := null;
  end if;

  insert into public.apartments (code, block)
  values (new.room, apt_block)
  on conflict (code) do update
    set block = coalesce(public.apartments.block, excluded.block)
  returning id into apt_id;

  new.apartment_id := apt_id;
  return new;
end;
$$;

create trigger trg_set_student_apartment
before insert or update of room on public.students
for each row execute function public.ensure_apartment_for_room();

-- App settings
create table if not exists public.app_settings (
  key text primary key,
  value_text text,
  value_int integer,
  value_bool boolean,
  updated_at timestamptz default now() not null,
  updated_by uuid references public.students(id) on delete set null
);

insert into public.app_settings (key, value_int)
values ('cleanup_coupon_ttl_seconds', 30)
on conflict (key) do nothing;

create or replace function public.get_setting_int(p_key text, p_default integer)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce((select value_int from public.app_settings where key = p_key), p_default);
$$;

-- Cleanup results
create table if not exists public.cleanup_results (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  block text not null check (block in ('A','B')),
  winning_apartment_id uuid not null references public.apartments(id),
  announcement_text text not null,
  announcement_mode text not null default 'template',
  template_key text,
  announced_by uuid references public.students(id) on delete set null,
  created_by uuid references public.students(id) on delete set null,
  published_at timestamptz,
  coupons_issued_at timestamptz,
  created_at timestamptz default now() not null
);

create unique index if not exists cleanup_results_week_block
  on public.cleanup_results (week_start, block);

create index if not exists cleanup_results_block_idx
  on public.cleanup_results (block, week_start desc);

-- Coupons
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  owner_student_id uuid not null references public.students(id) on delete cascade,
  source_type text not null check (source_type in ('cleanup','manual','transfer')),
  source_id uuid,
  issued_by uuid references public.students(id),
  issued_at timestamptz default now() not null,
  valid_from timestamptz default now() not null,
  expires_at timestamptz not null,
  reserved_queue_id uuid references public.queue(id) on delete set null,
  reserved_at timestamptz,
  used_in_queue_id uuid references public.queue(id) on delete set null,
  used_at timestamptz,
  note text
);

create unique index if not exists coupons_unique_source_owner
  on public.coupons (source_type, source_id, owner_student_id)
  where source_id is not null;

create index if not exists coupons_owner_idx
  on public.coupons (owner_student_id, expires_at);

create index if not exists coupons_reserved_idx
  on public.coupons (reserved_queue_id)
  where reserved_queue_id is not null;

-- Coupon transfers
create table if not exists public.coupon_transfers (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  from_student_id uuid not null references public.students(id) on delete cascade,
  to_student_id uuid not null references public.students(id) on delete cascade,
  performed_by uuid references public.students(id) on delete set null,
  created_at timestamptz default now() not null,
  note text
);

create index if not exists coupon_transfers_coupon_idx
  on public.coupon_transfers (coupon_id, created_at desc);

create index if not exists coupon_transfers_from_idx
  on public.coupon_transfers (from_student_id, created_at desc);

create index if not exists coupon_transfers_to_idx
  on public.coupon_transfers (to_student_id, created_at desc);

-- Queue/History coupon fields
alter table public.queue
  add column if not exists coupons_used integer default 0 not null;

alter table public.history
  add column if not exists coupons_used integer;

-- RPC helpers
-- IMPORTANT: changing RETURNS TABLE requires drop + recreate
drop function if exists public.get_queue_active();
drop function if exists public.get_queue_public(date);
drop function if exists public.get_sorted_queue();

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
    and used_in_queue_id is null;
end;
$$;

create or replace function public.finalize_coupons_for_queue(p_queue_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.coupons
    set used_in_queue_id = p_queue_id,
        used_at = now(),
        reserved_queue_id = null,
        reserved_at = null
  where reserved_queue_id = p_queue_id
    and used_in_queue_id is null;
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
      and (reserved_queue_id is not null or used_in_queue_id is not null)
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

-- Update queue RPCs to include coupons_used
create or replace function public.get_queue_active()
returns table(
  id uuid,
  student_id uuid,
  full_name text,
  room text,
  wash_count integer,
  coupons_used integer,
  payment_type text,
  joined_at timestamptz,
  planned_start_at timestamptz,
  expected_finish_at timestamptz,
  finished_at timestamptz,
  note text,
  admin_message text,
  return_key_alert boolean,
  admin_room text,
  ready_at timestamptz,
  key_issued_at timestamptz,
  key_lost boolean,
  washing_started_at timestamptz,
  washing_finished_at timestamptz,
  return_requested_at timestamptz,
  status text,
  scheduled_for_date date,
  queue_date date,
  queue_position integer,
  avatar_type text
)
language sql
security definer
set search_path = public
as $$
  select
    q.id,
    q.student_id,
    q.full_name,
    q.room,
    q.wash_count,
    q.coupons_used,
    q.payment_type::text,
    q.joined_at,
    q.planned_start_at,
    q.expected_finish_at,
    q.finished_at,
    q.note,
    q.admin_message,
    q.return_key_alert,
    q.admin_room,
    q.ready_at,
    q.key_issued_at,
    q.key_lost,
    q.washing_started_at,
    q.washing_finished_at,
    q.return_requested_at,
    q.status::text,
    q.scheduled_for_date,
    q.queue_date,
    q.queue_position,
    q.avatar_type
  from public.queue q
  where q.status in ('waiting','ready','key_issued','washing','returning_key')
  order by q.queue_date asc, q.queue_position asc, q.joined_at asc;
$$;

create or replace function public.get_queue_public(p_date date)
returns table(
  id uuid,
  student_id uuid,
  full_name text,
  room text,
  wash_count integer,
  coupons_used integer,
  payment_type text,
  joined_at timestamptz,
  expected_finish_at timestamptz,
  status text,
  scheduled_for_date date,
  queue_date date,
  queue_position integer,
  avatar_type text,
  key_lost boolean
)
language sql
security definer
set search_path = public
as $$
  select
    q.id,
    q.student_id,
    q.full_name,
    q.room,
    q.wash_count,
    q.coupons_used,
    q.payment_type::text,
    q.joined_at,
    q.expected_finish_at,
    q.status::text,
    q.scheduled_for_date,
    q.queue_date,
    q.queue_position,
    q.avatar_type,
    q.key_lost
  from public.queue q
  where q.scheduled_for_date = p_date
  order by q.queue_position asc, q.joined_at asc;
$$;

create or replace function public.get_sorted_queue()
returns table(
  id uuid,
  user_id uuid,
  student_id uuid,
  full_name text,
  room text,
  joined_at timestamptz,
  planned_start_at timestamptz,
  expected_finish_at timestamptz,
  finished_at timestamptz,
  note text,
  status text,
  wash_count integer,
  coupons_used integer,
  payment_type text,
  admin_message text,
  return_key_alert boolean,
  scheduled_for_date date,
  queue_date date,
  queue_position integer
)
language plpgsql
as $$
begin
  return query
  select 
    q.id,
    q.user_id,
    q.student_id,
    q.full_name,
    q.room,
    q.joined_at,
    q.planned_start_at,
    q.expected_finish_at,
    q.finished_at,
    q.note,
    q.status,
    q.wash_count,
    q.coupons_used,
    q.payment_type,
    q.admin_message,
    q.return_key_alert,
    q.scheduled_for_date,
    q.queue_date,
    q.queue_position
  from queue q
  where q.status in ('WAITING', 'READY', 'KEY_ISSUED', 'WASHING', 'DONE', 'queued', 'waiting', 'ready', 'washing')
  order by 
    q.queue_date asc,
    q.queue_position asc,
    q.joined_at asc;
end;
$$;

grant execute on function public.get_queue_active() to anon, authenticated;
grant execute on function public.get_queue_public(date) to anon, authenticated;
grant execute on function public.get_sorted_queue() to anon, authenticated;
grant execute on function public.cleanup_coupon_queue_for_today() to authenticated;
grant execute on function public.reserve_coupons_for_queue(uuid, integer) to authenticated;
grant execute on function public.release_coupons_for_queue(uuid) to authenticated;
grant execute on function public.transfer_coupon(uuid, uuid) to authenticated;

-- RLS
alter table public.apartments enable row level security;
alter table public.cleanup_results enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_transfers enable row level security;
alter table public.app_settings enable row level security;

create policy apartments_select_public on public.apartments
  for select to anon, authenticated
  using (true);

create policy cleanup_results_select_public on public.cleanup_results
  for select to anon, authenticated
  using (true);

create policy cleanup_results_write_admin on public.cleanup_results
  for all to authenticated
  using (public.is_admin() or public.is_super_admin())
  with check (public.is_admin() or public.is_super_admin());

create policy coupons_select_owner_or_admin on public.coupons
  for select to authenticated
  using (
    public.is_admin() or public.is_super_admin() or
    public.is_student_owner(owner_student_id)
  );

create policy coupons_write_admin_only on public.coupons
  for all to authenticated
  using (public.is_admin() or public.is_super_admin())
  with check (public.is_admin() or public.is_super_admin());

create policy coupon_transfers_select_involved on public.coupon_transfers
  for select to authenticated
  using (
    public.is_admin() or public.is_super_admin() or
    from_student_id in (select id from public.students where user_id = auth.uid()) or
    to_student_id in (select id from public.students where user_id = auth.uid())
  );

create policy coupon_transfers_write_admin_only on public.coupon_transfers
  for all to authenticated
  using (public.is_admin() or public.is_super_admin())
  with check (public.is_admin() or public.is_super_admin());

create policy app_settings_select_admin on public.app_settings
  for select to authenticated
  using (public.is_admin() or public.is_super_admin());

create policy app_settings_write_admin on public.app_settings
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

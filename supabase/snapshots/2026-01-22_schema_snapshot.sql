--
-- PostgreSQL database dump
--

\restrict nw6CwCHXtBGSgiTLAa0wlzzIzql3egtORRRTNAfHsBl1262eOOAKiqn5GFJGEUb

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: payment_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_type_enum AS ENUM (
    'money',
    'coupon',
    'both'
);


--
-- Name: queue_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.queue_status AS ENUM (
    'waiting',
    'ready',
    'key_issued',
    'washing',
    'done',
    'returning_key'
);


--
-- Name: change_queue_position(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.change_queue_position(p_queue_id uuid, p_direction text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  current_position INT;
  current_date DATE;
  scheduled_date DATE;
  new_position INT;
  swap_id UUID;
BEGIN
  SELECT queue_position, queue_date, scheduled_for_date
  INTO current_position, current_date, scheduled_date
  FROM queue
  WHERE id = p_queue_id;

  IF current_position IS NULL THEN
    RAISE EXCEPTION 'Запись не найдена';
  END IF;

  IF p_direction = 'up' THEN
    new_position := current_position - 1;
    IF new_position < 1 THEN
      RAISE EXCEPTION 'Уже первый в очереди';
    END IF;
  ELSIF p_direction = 'down' THEN
    new_position := current_position + 1;
  ELSE
    RAISE EXCEPTION 'Неверное направление';
  END IF;

  SELECT id INTO swap_id
  FROM queue
  WHERE queue_date = current_date
    AND scheduled_for_date = scheduled_date
    AND queue_position = new_position
  LIMIT 1;

  IF swap_id IS NULL THEN
    RAISE EXCEPTION 'Не найдена запись для обмена';
  END IF;

  UPDATE queue SET queue_position = -1 WHERE id = p_queue_id;
  UPDATE queue SET queue_position = current_position WHERE id = swap_id;
  UPDATE queue SET queue_position = new_position WHERE id = p_queue_id;
END;
$$;


--
-- Name: claim_my_queue_items(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_my_queue_items() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update queue q
  set user_id = auth.uid()
  where q.user_id is null
    and exists (
      select 1
      from students s
      where s.id = q.student_id
        and s.user_id = auth.uid()
    );
end;
$$;


--
-- Name: cleanup_coupon_queue_for_today(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_coupon_queue_for_today() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: cleanup_expired_coupon_queue(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_coupon_queue(p_grace_minutes integer DEFAULT 0) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
      and c.expires_at <= now()
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


--
-- Name: ensure_apartment_for_room(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_apartment_for_room() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: finalize_coupons_for_queue(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finalize_coupons_for_queue(p_queue_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: get_next_queue_position(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_queue_position(p_date date) RETURNS integer
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(max(queue_position), 0) + 1
  from public.queue
  where queue_date = p_date
    and scheduled_for_date = p_date;
$$;


--
-- Name: get_queue_active(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_queue_active() RETURNS TABLE(id uuid, student_id uuid, full_name text, room text, wash_count integer, coupons_used integer, payment_type text, joined_at timestamp with time zone, planned_start_at timestamp with time zone, expected_finish_at timestamp with time zone, finished_at timestamp with time zone, note text, admin_message text, return_key_alert boolean, admin_room text, ready_at timestamp with time zone, key_issued_at timestamp with time zone, key_lost boolean, washing_started_at timestamp with time zone, washing_finished_at timestamp with time zone, return_requested_at timestamp with time zone, status text, scheduled_for_date date, queue_date date, queue_position integer, avatar_type text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: get_queue_active_with_avatars(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_queue_active_with_avatars() RETURNS TABLE(id uuid, user_id uuid, student_id uuid, first_name text, last_name text, full_name text, room text, wash_count integer, coupons_used integer, payment_type text, joined_at timestamp with time zone, planned_start_at timestamp with time zone, expected_finish_at timestamp with time zone, finished_at timestamp with time zone, note text, admin_message text, return_key_alert boolean, admin_room text, ready_at timestamp with time zone, key_issued_at timestamp with time zone, washing_started_at timestamp with time zone, washing_finished_at timestamp with time zone, return_requested_at timestamp with time zone, status text, scheduled_for_date date, queue_date date, queue_position integer, avatar_style text, avatar_seed text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  return query
  select
    q.id,
    q.user_id,
    q.student_id,
    q.first_name,
    q.last_name,
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
    q.washing_started_at,
    q.washing_finished_at,
    q.return_requested_at,
    q.status::text,
    q.scheduled_for_date,
    q.queue_date,
    q.queue_position,
    coalesce(s.avatar_style, 'bottts')::text,
    s.avatar_seed::text
  from queue q
  left join students s on q.student_id = s.id
  where q.status != 'done'::queue_status
  order by q.queue_position asc;
end;
$$;


--
-- Name: FUNCTION get_queue_active_with_avatars(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_queue_active_with_avatars() IS 'Returns active queue with live avatar data from students table (bypasses RLS with SECURITY DEFINER)';


--
-- Name: get_queue_public(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_queue_public(p_date date) RETURNS TABLE(id uuid, student_id uuid, full_name text, room text, wash_count integer, coupons_used integer, payment_type text, joined_at timestamp with time zone, expected_finish_at timestamp with time zone, status text, scheduled_for_date date, queue_date date, queue_position integer, avatar_type text, key_lost boolean)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: get_setting_int(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_setting_int(p_key text, p_default integer) RETURNS integer
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce((select value_int from public.app_settings where key = p_key), p_default);
$$;


--
-- Name: get_sorted_queue(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_sorted_queue() RETURNS TABLE(id uuid, user_id uuid, student_id uuid, full_name text, room text, joined_at timestamp with time zone, planned_start_at timestamp with time zone, expected_finish_at timestamp with time zone, finished_at timestamp with time zone, note text, status text, wash_count integer, coupons_used integer, payment_type text, admin_message text, return_key_alert boolean, scheduled_for_date date, queue_date date, queue_position integer)
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: has_active_queue_item(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_active_queue_item(p_student_id uuid, p_date date) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.queue q
    where q.student_id = p_student_id
      and q.queue_date = p_date
      and q.status in ('waiting','ready','key_issued','washing','returning_key')
  );
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.students
    WHERE user_id = auth.uid()
      AND (is_admin = TRUE OR is_super_admin = TRUE)
      AND is_banned = FALSE
  );
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    student_id uuid,
    first_name text,
    last_name text,
    full_name text NOT NULL,
    room text,
    wash_count integer DEFAULT 1 NOT NULL,
    payment_type public.payment_type_enum DEFAULT 'money'::public.payment_type_enum NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    planned_start_at timestamp with time zone,
    expected_finish_at timestamp with time zone,
    finished_at timestamp with time zone,
    admin_message text,
    return_key_alert boolean DEFAULT false NOT NULL,
    status public.queue_status DEFAULT 'waiting'::public.queue_status NOT NULL,
    scheduled_for_date date NOT NULL,
    queue_date date NOT NULL,
    queue_position integer NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    admin_room text,
    ready_at timestamp with time zone,
    key_issued_at timestamp with time zone,
    washing_started_at timestamp with time zone,
    return_requested_at timestamp with time zone,
    washing_finished_at timestamp with time zone,
    avatar_type text,
    key_lost boolean DEFAULT false NOT NULL,
    coupons_used integer DEFAULT 0 NOT NULL,
    avatar_style character varying(50) DEFAULT 'bottts'::character varying,
    avatar_seed character varying(255)
);


--
-- Name: COLUMN queue.avatar_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.queue.avatar_type IS 'Snapshot of avatar type when joining queue';


--
-- Name: COLUMN queue.avatar_style; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.queue.avatar_style IS 'DiceBear avatar style snapshot when joining queue';


--
-- Name: COLUMN queue.avatar_seed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.queue.avatar_seed IS 'Avatar seed snapshot when joining queue';


--
-- Name: is_queue_owner(public.queue); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_queue_owner(q public.queue) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select
    -- если запись уже привязана к user_id
    (q.user_id is not null and q.user_id = auth.uid())

    OR

    -- если запись ещё не привязана, но студент мой
    (
      q.user_id is null
      and exists (
        select 1
        from students s
        where s.id = q.student_id
          and s.user_id = auth.uid()
      )
    );
$$;


--
-- Name: is_roommate(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_roommate(p_target_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_my_apartment uuid;
  v_my_room text;
  v_target_apartment uuid;
  v_target_room text;
begin
  select apartment_id, nullif(btrim(room), '')
    into v_my_apartment, v_my_room
  from public.students
  where user_id = auth.uid()
  limit 1;

  if v_my_apartment is null and v_my_room is null then
    return false;
  end if;

  select apartment_id, nullif(btrim(room), '')
    into v_target_apartment, v_target_room
  from public.students
  where id = p_target_id;

  if v_target_apartment is null and v_target_room is null then
    return false;
  end if;

  if v_my_apartment is not null and v_target_apartment is not null then
    if v_my_apartment = v_target_apartment then
      return true;
    end if;
  end if;

  return v_my_room is not null
    and v_target_room is not null
    and upper(v_my_room) = upper(v_target_room);
end;
$$;


--
-- Name: is_student_owner(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_student_owner(p_student_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.students s
    where s.id = p_student_id
      and s.user_id = auth.uid()
  );
$$;


--
-- Name: is_super_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.students
    WHERE user_id = auth.uid()
      AND is_super_admin = TRUE
      AND is_banned = FALSE
  );
END;
$$;


--
-- Name: migrate_yesterday_queue(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.migrate_yesterday_queue() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  max_position INT;
BEGIN
  SELECT COALESCE(MAX(queue_position), 0) INTO max_position
  FROM queue
  WHERE queue_date = today_date
    AND scheduled_for_date = today_date;

  UPDATE queue
  SET 
    queue_date = today_date,
    queue_position = queue_position + max_position,
    note = COALESCE(note || ' ', '') || '[Перенесено с ' || yesterday_date || ']'
  WHERE queue_date = yesterday_date
    AND status IN ('WAITING', 'READY', 'KEY_ISSUED', 'queued', 'waiting', 'ready')
    AND scheduled_for_date <= yesterday_date;
END;
$$;


--
-- Name: reindex_queue(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reindex_queue() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE queue
  SET queue_position = sub.new_pos
  FROM (
    SELECT id,
           ROW_NUMBER() OVER(PARTITION BY queue_date ORDER BY queue_position) AS new_pos
    FROM queue
  ) AS sub
  WHERE queue.id = sub.id;

  RETURN NULL;
END;
$$;


--
-- Name: release_coupons_for_queue(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_coupons_for_queue(p_queue_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: reserve_coupons_for_queue(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reserve_coupons_for_queue(p_queue_id uuid, p_count integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: reserve_specific_coupons_for_queue(uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reserve_specific_coupons_for_queue(p_queue_id uuid, p_coupon_ids uuid[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: set_student_auth_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_student_auth_email() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.auth_email is null then
    new.auth_email := 'student-' || left(new.id::text, 8) || '@example.com';
  end if;
  return new;
end;
$$;


--
-- Name: transfer_coupon(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transfer_coupon(p_coupon_id uuid, p_to_student_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: transfer_unfinished_to_next_day(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transfer_unfinished_to_next_day() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  max_position INT;
BEGIN
  -- Получаем максимальную позицию среди записей на сегодня
  SELECT COALESCE(MAX(position), 0) INTO max_position
  FROM queue
  WHERE queue_date = today_date  -- ✅ ИСПРАВЛЕНО: currentDate → queue_date
    AND scheduled_for_date = today_date;  -- ✅ ИСПРАВЛЕНО: scheduledForDate → scheduled_for_date

  -- Переносим незавершенные записи с вчерашнего дня
  UPDATE queue
  SET 
    queue_date = today_date,  -- ✅ ИСПРАВЛЕНО
    position = position + max_position,
    note = COALESCE(note || ' ', '') || '[Перенесено с ' || yesterday_date || ']'
  WHERE queue_date = yesterday_date  -- ✅ ИСПРАВЛЕНО
    AND status IN ('WAITING', 'READY', 'KEY_ISSUED', 'queued', 'waiting', 'ready')
    AND scheduled_for_date <= yesterday_date;  -- ✅ ИСПРАВЛЕНО

  RAISE NOTICE 'Перенесено записей на %', today_date;
END;
$$;


--
-- Name: FUNCTION transfer_unfinished_to_next_day(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.transfer_unfinished_to_next_day() IS 'Переносит незавершенные записи с предыдущего дня на текущий день, сохраняя порядок';


--
-- Name: update_my_avatar(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_my_avatar(p_avatar_type text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  update public.students
  set avatar_type = p_avatar_type
  where user_id = auth.uid();
$$;


--
-- Name: update_student_admin_status(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_student_admin_status(student_id uuid, admin_status boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.students
  SET is_admin = admin_status  -- ✅ Уже snake_case
  WHERE id = student_id;
END;
$$;


--
-- Name: apartments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.apartments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    block text,
    CONSTRAINT apartments_block_check CHECK ((block = ANY (ARRAY['A'::text, 'B'::text])))
);


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value_text text,
    value_int integer,
    value_bool boolean,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: cleanup_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cleanup_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    week_start date NOT NULL,
    block text NOT NULL,
    winning_apartment_id uuid NOT NULL,
    announcement_text text NOT NULL,
    announcement_mode text DEFAULT 'template'::text NOT NULL,
    template_key text,
    announced_by uuid,
    created_by uuid,
    published_at timestamp with time zone,
    coupons_issued_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    check_time time without time zone,
    CONSTRAINT cleanup_results_block_check CHECK ((block = ANY (ARRAY['A'::text, 'B'::text])))
);


--
-- Name: cleanup_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cleanup_schedules (
    block text NOT NULL,
    check_date date NOT NULL,
    check_time time without time zone,
    reminder_time time without time zone DEFAULT '10:00:00'::time without time zone NOT NULL,
    set_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reminder_sent_at timestamp with time zone,
    CONSTRAINT cleanup_schedules_block_check CHECK ((block = ANY (ARRAY['A'::text, 'B'::text])))
);


--
-- Name: coupon_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupon_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coupon_id uuid NOT NULL,
    from_student_id uuid NOT NULL,
    to_student_id uuid NOT NULL,
    performed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    note text
);


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_student_id uuid NOT NULL,
    source_type text NOT NULL,
    source_id uuid,
    issued_by uuid,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    valid_from timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    reserved_queue_id uuid,
    reserved_at timestamp with time zone,
    used_in_queue_id uuid,
    used_at timestamp with time zone,
    note text,
    CONSTRAINT coupons_source_type_check CHECK ((source_type = ANY (ARRAY['cleanup'::text, 'manual'::text, 'transfer'::text])))
);


--
-- Name: history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.history (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    room text,
    started_at timestamp with time zone NOT NULL,
    finished_at timestamp with time zone DEFAULT now() NOT NULL,
    ready_at timestamp with time zone,
    key_issued_at timestamp with time zone,
    washing_started_at timestamp with time zone,
    return_requested_at timestamp with time zone,
    avatar_type text,
    wash_count integer,
    payment_type text,
    washing_finished_at timestamp with time zone,
    coupons_used integer,
    avatar_style character varying(50) DEFAULT 'bottts'::character varying,
    avatar_seed character varying(255) DEFAULT NULL::character varying,
    student_id uuid
);


--
-- Name: COLUMN history.avatar_style; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.history.avatar_style IS 'DiceBear avatar style (avataaars, lorelei, pixel-art, etc.)';


--
-- Name: COLUMN history.avatar_seed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.history.avatar_seed IS 'Custom seed for avatar generation';


--
-- Name: COLUMN history.student_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.history.student_id IS 'ID студента из таблицы students для синхронизации аватаров';


--
-- Name: machine_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machine_state (
    id integer NOT NULL,
    status text DEFAULT 'idle'::text NOT NULL,
    current_queue_item_id uuid,
    started_at timestamp with time zone,
    expected_finish_at timestamp with time zone
);


--
-- Name: machine_state_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.machine_state_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: machine_state_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.machine_state_id_seq OWNED BY public.machine_state.id;


--
-- Name: student_auth; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_auth (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    full_name text NOT NULL,
    room text,
    is_registered boolean DEFAULT false,
    registered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    telegram_chat_id text,
    is_banned boolean DEFAULT false,
    banned_at timestamp with time zone,
    ban_reason text,
    user_id uuid,
    is_admin boolean DEFAULT false,
    is_super_admin boolean DEFAULT false,
    middle_name text,
    can_view_students boolean DEFAULT false,
    avatar text DEFAULT 'default'::text,
    avatar_type text DEFAULT 'default'::text,
    claim_code_hash text,
    claim_code_issued_at timestamp with time zone,
    auth_email text NOT NULL,
    last_user_id uuid,
    key_issued boolean DEFAULT false NOT NULL,
    key_lost boolean DEFAULT false NOT NULL,
    apartment_id uuid,
    avatar_style character varying(50) DEFAULT 'bottts'::character varying,
    avatar_seed character varying(255) DEFAULT NULL::character varying,
    is_cleanup_admin boolean DEFAULT false NOT NULL,
    ui_language text DEFAULT 'ru'::text NOT NULL,
    stay_type text DEFAULT 'unknown'::text NOT NULL,
    CONSTRAINT students_stay_type_check CHECK ((stay_type = ANY (ARRAY['unknown'::text, '5days'::text, 'weekends'::text]))),
    CONSTRAINT students_ui_language_check CHECK ((ui_language = ANY (ARRAY['ru'::text, 'en'::text, 'ko'::text, 'ky'::text])))
);


--
-- Name: COLUMN students.avatar; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.students.avatar IS 'SVG avatar identifier (default, male1, male2, female1, female2, etc.)';


--
-- Name: COLUMN students.avatar_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.students.avatar_type IS 'Avatar type for user profile (default, male1-20, female1-20)';


--
-- Name: students_login_list; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.students_login_list AS
 SELECT id,
    COALESCE(NULLIF(full_name, ''::text), TRIM(BOTH FROM concat_ws(' '::text, first_name, last_name, middle_name))) AS full_name,
    room,
    avatar_style,
    avatar_seed,
    is_registered,
    is_banned,
    ban_reason,
    key_issued,
    key_lost
   FROM public.students;


--
-- Name: machine_state id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_state ALTER COLUMN id SET DEFAULT nextval('public.machine_state_id_seq'::regclass);


--
-- Name: apartments apartments_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apartments
    ADD CONSTRAINT apartments_code_key UNIQUE (code);


--
-- Name: apartments apartments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apartments
    ADD CONSTRAINT apartments_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: cleanup_results cleanup_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleanup_results
    ADD CONSTRAINT cleanup_results_pkey PRIMARY KEY (id);


--
-- Name: cleanup_schedules cleanup_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleanup_schedules
    ADD CONSTRAINT cleanup_schedules_pkey PRIMARY KEY (block);


--
-- Name: coupon_transfers coupon_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_transfers
    ADD CONSTRAINT coupon_transfers_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: history history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history
    ADD CONSTRAINT history_pkey PRIMARY KEY (id);


--
-- Name: machine_state machine_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_state
    ADD CONSTRAINT machine_state_pkey PRIMARY KEY (id);


--
-- Name: queue queue_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_pkey1 PRIMARY KEY (id);


--
-- Name: student_auth student_auth_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_auth
    ADD CONSTRAINT student_auth_pkey PRIMARY KEY (id);


--
-- Name: student_auth student_auth_studentId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_auth
    ADD CONSTRAINT "student_auth_studentId_key" UNIQUE (student_id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: students students_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_unique UNIQUE (user_id);


--
-- Name: queue unique_daily_queue; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT unique_daily_queue UNIQUE (student_id, queue_date);


--
-- Name: students unique_student_fullname; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT unique_student_fullname UNIQUE (full_name, room);


--
-- Name: students unique_user_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT unique_user_id UNIQUE (user_id);


--
-- Name: cleanup_results_block_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cleanup_results_block_idx ON public.cleanup_results USING btree (block, week_start DESC);


--
-- Name: cleanup_results_week_block; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cleanup_results_week_block ON public.cleanup_results USING btree (week_start, block);


--
-- Name: coupon_transfers_coupon_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX coupon_transfers_coupon_idx ON public.coupon_transfers USING btree (coupon_id, created_at DESC);


--
-- Name: coupon_transfers_from_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX coupon_transfers_from_idx ON public.coupon_transfers USING btree (from_student_id, created_at DESC);


--
-- Name: coupon_transfers_to_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX coupon_transfers_to_idx ON public.coupon_transfers USING btree (to_student_id, created_at DESC);


--
-- Name: coupons_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX coupons_owner_idx ON public.coupons USING btree (owner_student_id, expires_at);


--
-- Name: coupons_reserved_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX coupons_reserved_idx ON public.coupons USING btree (reserved_queue_id) WHERE (reserved_queue_id IS NOT NULL);


--
-- Name: coupons_unique_source_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX coupons_unique_source_owner ON public.coupons USING btree (source_type, source_id, owner_student_id) WHERE (source_id IS NOT NULL);


--
-- Name: idx_queue_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_position ON public.queue USING btree (queue_position);


--
-- Name: idx_queue_scheduled_for_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_scheduled_for_date ON public.queue USING btree (scheduled_for_date);


--
-- Name: idx_queue_washing_finished_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_washing_finished_at ON public.queue USING btree (washing_finished_at) WHERE (washing_finished_at IS NOT NULL);


--
-- Name: idx_students_avatar_seed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_avatar_seed ON public.students USING btree (avatar_seed);


--
-- Name: idx_students_avatar_style; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_avatar_style ON public.students USING btree (avatar_style);


--
-- Name: idx_students_banned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_banned ON public.students USING btree (is_banned) WHERE (is_banned = true);


--
-- Name: idx_students_telegram_chat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_telegram_chat_id ON public.students USING btree (telegram_chat_id);


--
-- Name: queue_unique_active_per_day; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX queue_unique_active_per_day ON public.queue USING btree (student_id, queue_date) WHERE (status = ANY (ARRAY['waiting'::public.queue_status, 'ready'::public.queue_status, 'key_issued'::public.queue_status, 'washing'::public.queue_status, 'returning_key'::public.queue_status]));


--
-- Name: students_auth_email_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX students_auth_email_unique ON public.students USING btree (auth_email) WHERE (auth_email IS NOT NULL);


--
-- Name: queue trg_reindex_queue; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_reindex_queue AFTER DELETE ON public.queue FOR EACH STATEMENT EXECUTE FUNCTION public.reindex_queue();


--
-- Name: students trg_set_student_apartment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_student_apartment BEFORE INSERT OR UPDATE OF room ON public.students FOR EACH ROW EXECUTE FUNCTION public.ensure_apartment_for_room();


--
-- Name: students trg_set_student_auth_email; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_student_auth_email BEFORE INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_student_auth_email();


--
-- Name: app_settings app_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.students(id) ON DELETE SET NULL;


--
-- Name: cleanup_results cleanup_results_announced_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleanup_results
    ADD CONSTRAINT cleanup_results_announced_by_fkey FOREIGN KEY (announced_by) REFERENCES public.students(id) ON DELETE SET NULL;


--
-- Name: cleanup_results cleanup_results_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleanup_results
    ADD CONSTRAINT cleanup_results_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.students(id) ON DELETE SET NULL;


--
-- Name: cleanup_results cleanup_results_winning_apartment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleanup_results
    ADD CONSTRAINT cleanup_results_winning_apartment_id_fkey FOREIGN KEY (winning_apartment_id) REFERENCES public.apartments(id);


--
-- Name: cleanup_schedules cleanup_schedules_set_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleanup_schedules
    ADD CONSTRAINT cleanup_schedules_set_by_fkey FOREIGN KEY (set_by) REFERENCES public.students(id) ON DELETE SET NULL;


--
-- Name: coupon_transfers coupon_transfers_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_transfers
    ADD CONSTRAINT coupon_transfers_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;


--
-- Name: coupon_transfers coupon_transfers_from_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_transfers
    ADD CONSTRAINT coupon_transfers_from_student_id_fkey FOREIGN KEY (from_student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: coupon_transfers coupon_transfers_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_transfers
    ADD CONSTRAINT coupon_transfers_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.students(id) ON DELETE SET NULL;


--
-- Name: coupon_transfers coupon_transfers_to_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_transfers
    ADD CONSTRAINT coupon_transfers_to_student_id_fkey FOREIGN KEY (to_student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: coupons coupons_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.students(id);


--
-- Name: coupons coupons_owner_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_owner_student_id_fkey FOREIGN KEY (owner_student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: coupons coupons_reserved_queue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_reserved_queue_id_fkey FOREIGN KEY (reserved_queue_id) REFERENCES public.queue(id) ON DELETE SET NULL;


--
-- Name: coupons coupons_used_in_queue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_used_in_queue_id_fkey FOREIGN KEY (used_in_queue_id) REFERENCES public.queue(id) ON DELETE SET NULL;


--
-- Name: history history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history
    ADD CONSTRAINT history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: queue queue_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: queue queue_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: student_auth student_auth_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_auth
    ADD CONSTRAINT student_auth_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: students students_apartment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_apartment_id_fkey FOREIGN KEY (apartment_id) REFERENCES public.apartments(id);


--
-- Name: students students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: students Students can update avatar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can update avatar" ON public.students FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: apartments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;

--
-- Name: apartments apartments_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY apartments_select_public ON public.apartments FOR SELECT TO authenticated, anon USING (true);


--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings app_settings_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_settings_select_admin ON public.app_settings FOR SELECT TO authenticated USING ((public.is_admin() OR public.is_super_admin()));


--
-- Name: app_settings app_settings_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_settings_write_admin ON public.app_settings TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: cleanup_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cleanup_results ENABLE ROW LEVEL SECURITY;

--
-- Name: cleanup_results cleanup_results_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cleanup_results_select_public ON public.cleanup_results FOR SELECT TO authenticated, anon USING (true);


--
-- Name: cleanup_results cleanup_results_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cleanup_results_write_admin ON public.cleanup_results TO authenticated USING ((public.is_admin() OR public.is_super_admin())) WITH CHECK ((public.is_admin() OR public.is_super_admin()));


--
-- Name: cleanup_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cleanup_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: cleanup_schedules cleanup_schedules_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cleanup_schedules_select_public ON public.cleanup_schedules FOR SELECT TO authenticated, anon USING (true);


--
-- Name: cleanup_schedules cleanup_schedules_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cleanup_schedules_write_admin ON public.cleanup_schedules TO authenticated USING ((public.is_admin() OR public.is_super_admin())) WITH CHECK ((public.is_admin() OR public.is_super_admin()));


--
-- Name: coupon_transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coupon_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: coupon_transfers coupon_transfers_select_involved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coupon_transfers_select_involved ON public.coupon_transfers FOR SELECT TO authenticated USING ((public.is_admin() OR public.is_super_admin() OR (from_student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.user_id = auth.uid()))) OR (to_student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.user_id = auth.uid())))));


--
-- Name: coupon_transfers coupon_transfers_write_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coupon_transfers_write_admin_only ON public.coupon_transfers TO authenticated USING ((public.is_admin() OR public.is_super_admin())) WITH CHECK ((public.is_admin() OR public.is_super_admin()));


--
-- Name: coupons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

--
-- Name: coupons coupons_select_owner_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coupons_select_owner_or_admin ON public.coupons FOR SELECT TO authenticated USING ((public.is_admin() OR public.is_super_admin() OR public.is_student_owner(owner_student_id)));


--
-- Name: coupons coupons_write_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coupons_write_admin_only ON public.coupons TO authenticated USING ((public.is_admin() OR public.is_super_admin())) WITH CHECK ((public.is_admin() OR public.is_super_admin()));


--
-- Name: history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

--
-- Name: history history_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY history_insert_authenticated ON public.history FOR INSERT TO authenticated WITH CHECK (((auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text)));


--
-- Name: history history_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY history_select_public ON public.history FOR SELECT USING (true);


--
-- Name: machine_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.machine_state ENABLE ROW LEVEL SECURITY;

--
-- Name: machine_state machine_state_insert_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY machine_state_insert_public ON public.machine_state FOR INSERT WITH CHECK (true);


--
-- Name: machine_state machine_state_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY machine_state_select_public ON public.machine_state FOR SELECT USING (true);


--
-- Name: machine_state machine_state_update_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY machine_state_update_public ON public.machine_state FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;

--
-- Name: queue queue_delete_owner_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY queue_delete_owner_or_admin ON public.queue FOR DELETE TO authenticated USING ((public.is_queue_owner(queue.*) OR public.is_admin() OR public.is_super_admin()));


--
-- Name: queue queue_insert_owner_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY queue_insert_owner_or_admin ON public.queue FOR INSERT TO authenticated WITH CHECK ((public.is_student_owner(student_id) OR public.is_admin() OR public.is_super_admin()));


--
-- Name: queue queue_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY queue_select_public ON public.queue FOR SELECT TO authenticated, anon USING (true);


--
-- Name: queue queue_update_owner_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY queue_update_owner_or_admin ON public.queue FOR UPDATE TO authenticated USING ((public.is_queue_owner(queue.*) OR public.is_admin() OR public.is_super_admin())) WITH CHECK ((public.is_queue_owner(queue.*) OR public.is_admin() OR public.is_super_admin()));


--
-- Name: student_auth; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_auth ENABLE ROW LEVEL SECURITY;

--
-- Name: student_auth student_auth_manage_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_auth_manage_authenticated ON public.student_auth TO authenticated USING (true) WITH CHECK (true);


--
-- Name: student_auth student_auth_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_auth_select_public ON public.student_auth FOR SELECT USING (true);


--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: students students_delete_super_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_delete_super_admin ON public.students FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.user_id = auth.uid()) AND (s.is_super_admin = true)))));


--
-- Name: students students_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_insert_admin ON public.students FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.user_id = auth.uid()) AND ((s.is_admin = true) OR (s.is_super_admin = true))))));


--
-- Name: students students_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_select_admin ON public.students FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: students students_select_anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_select_anon ON public.students FOR SELECT TO anon USING (true);


--
-- Name: students students_select_roommates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_select_roommates ON public.students FOR SELECT TO authenticated USING (public.is_roommate(id));


--
-- Name: students students_select_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_select_self ON public.students FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: students students_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_update_admin ON public.students FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.user_id = auth.uid()) AND ((s.is_admin = true) OR (s.is_super_admin = true)))))) WITH CHECK (true);


--
-- Name: students students_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_update_self ON public.students FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- PostgreSQL database dump complete
--

\unrestrict nw6CwCHXtBGSgiTLAa0wlzzIzql3egtORRRTNAfHsBl1262eOOAKiqn5GFJGEUb


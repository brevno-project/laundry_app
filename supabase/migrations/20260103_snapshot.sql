--
-- PostgreSQL database dump
--

\restrict gdmAcgtGeu70hF5jHW2dCz7iauYfPsC35oUjXLx5llb4mqU2v67Wsfvm8hzVhxH

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
-- Name: get_queue_public(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_queue_public(p_date date) RETURNS TABLE(id uuid, student_id uuid, full_name text, room text, wash_count integer, payment_type text, joined_at timestamp with time zone, expected_finish_at timestamp with time zone, status text, scheduled_for_date date, queue_date date, queue_position integer, avatar_type text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select
    q.id,
    q.student_id,
    q.full_name,
    q.room,
    q.wash_count,
    q.payment_type,
    q.joined_at,
    q.expected_finish_at,
    q.status,
    q.scheduled_for_date,
    q.queue_date,
    q.queue_position,
    q.avatar_type
  from public.queue q
  where q.queue_date = p_date
  order by q.queue_position asc;
$$;


--
-- Name: get_sorted_queue(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_sorted_queue() RETURNS TABLE(id uuid, user_id uuid, student_id uuid, full_name text, room text, joined_at timestamp with time zone, planned_start_at timestamp with time zone, expected_finish_at timestamp with time zone, finished_at timestamp with time zone, note text, status text, wash_count integer, payment_type text, admin_message text, return_key_alert boolean, scheduled_for_date date, queue_date date, queue_position integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
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
    q.payment_type,
    q.admin_message,
    q.return_key_alert,
    q.scheduled_for_date,
    q.queue_date,
    q.queue_position
  FROM queue q
  WHERE q.status IN ('WAITING', 'READY', 'KEY_ISSUED', 'WASHING', 'DONE', 'queued', 'waiting', 'ready', 'washing')
  ORDER BY 
    q.queue_date ASC,
    q.queue_position ASC,
    q.joined_at ASC;
END;
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


SET default_tablespace = '';

SET default_table_access_method = heap;

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
    return_requested_at timestamp with time zone
);


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
    avatar_type text
);


--
-- Name: COLUMN queue.avatar_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.queue.avatar_type IS 'Snapshot of avatar type when joining queue';


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
    claim_code_issued_at timestamp with time zone
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
-- Name: machine_state id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_state ALTER COLUMN id SET DEFAULT nextval('public.machine_state_id_seq'::regclass);


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
-- Name: queue trg_reindex_queue; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_reindex_queue AFTER DELETE ON public.queue FOR EACH STATEMENT EXECUTE FUNCTION public.reindex_queue();


--
-- Name: history history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history
    ADD CONSTRAINT history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


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
-- Name: students students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


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
-- Name: queue queue_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY queue_delete_own ON public.queue FOR DELETE TO authenticated USING (public.is_student_owner(student_id));


--
-- Name: queue queue_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY queue_insert_own ON public.queue FOR INSERT TO authenticated WITH CHECK (public.is_student_owner(student_id));


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
-- Name: students students_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_select_public ON public.students FOR SELECT USING (true);


--
-- Name: students students_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_update_admin ON public.students FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.user_id = auth.uid()) AND ((s.is_admin = true) OR (s.is_super_admin = true)))))) WITH CHECK (true);


--
-- PostgreSQL database dump complete
--

\unrestrict gdmAcgtGeu70hF5jHW2dCz7iauYfPsC35oUjXLx5llb4mqU2v67Wsfvm8hzVhxH


-- Fix RLS policies to allow anonymous access
-- Run this in Supabase SQL Editor

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.queue;
DROP POLICY IF EXISTS "Allow authenticated update access" ON public.queue;
DROP POLICY IF EXISTS "Allow authenticated delete access" ON public.queue;
DROP POLICY IF EXISTS "Users can insert own queue items" ON public.queue;
DROP POLICY IF EXISTS "Users can update own queue or admin all" ON public.queue;
DROP POLICY IF EXISTS "Users can delete own queue or admin all" ON public.queue;

DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.machine_state;
DROP POLICY IF EXISTS "Allow authenticated update access" ON public.machine_state;
DROP POLICY IF EXISTS "Only admin can manage machine state" ON public.machine_state;

DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.history;
DROP POLICY IF EXISTS "Authenticated users can insert history" ON public.history;
DROP POLICY IF EXISTS "Allow all insert" ON public.history;

-- Create new policies for ALL users (anonymous and authenticated)
CREATE POLICY "Allow all insert" ON public.queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.queue FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.queue FOR DELETE USING (true);

CREATE POLICY "Allow all insert" ON public.machine_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.machine_state FOR UPDATE USING (true);

CREATE POLICY "Allow all insert" ON public.history FOR INSERT WITH CHECK (true);

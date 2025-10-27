-- Create queue table
CREATE TABLE IF NOT EXISTS public.queue (
  id UUID PRIMARY KEY,
  userId TEXT NOT NULL,
  userName TEXT NOT NULL,
  userRoom TEXT,
  joinedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  plannedStartAt TIMESTAMP WITH TIME ZONE,
  expectedFinishAt TIMESTAMP WITH TIME ZONE,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
);

-- Create machine_state table
CREATE TABLE IF NOT EXISTS public.machine_state (
  id SERIAL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'idle',
  currentQueueItemId UUID,
  startedAt TIMESTAMP WITH TIME ZONE,
  expectedFinishAt TIMESTAMP WITH TIME ZONE
);

-- Create history table
CREATE TABLE IF NOT EXISTS public.history (
  id UUID PRIMARY KEY,
  userId TEXT NOT NULL,
  userName TEXT NOT NULL,
  userRoom TEXT,
  startedAt TIMESTAMP WITH TIME ZONE NOT NULL,
  finishedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert initial machine state
INSERT INTO public.machine_state (status) 
VALUES ('idle') 
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- Add policies for public access
CREATE POLICY "Allow public read access" ON public.queue FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.machine_state FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.history FOR SELECT USING (true);

-- Add policies for insert, update, delete
CREATE POLICY "Allow authenticated insert access" ON public.queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update access" ON public.queue FOR UPDATE WITH CHECK (true);
CREATE POLICY "Allow authenticated delete access" ON public.queue FOR DELETE USING (true);

CREATE POLICY "Allow authenticated insert access" ON public.machine_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update access" ON public.machine_state FOR UPDATE WITH CHECK (true);

CREATE POLICY "Allow authenticated insert access" ON public.history FOR INSERT WITH CHECK (true);

-- Enable Realtime for tables
-- This allows the Supabase Realtime server to broadcast changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.machine_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.history;

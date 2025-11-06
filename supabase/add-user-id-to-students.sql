-- Add user_id column to students table for Supabase Auth integration
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Update existing registered students with dummy user_ids (will be updated during next login)
-- This is for backward compatibility with existing registered students

-- Enable RLS for students table
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Add policies for students table (these will be replaced by secure policies later)
CREATE POLICY "Students are readable by everyone" ON public.students FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update students" ON public.students FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert students" ON public.students FOR INSERT WITH CHECK (auth.role() = 'authenticated');

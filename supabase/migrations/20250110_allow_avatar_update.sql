-- Drop incorrect policy if exists
DROP POLICY IF EXISTS "Users can update their own avatar" ON public.students;

-- Create RPC function for safe avatar updates
CREATE OR REPLACE FUNCTION public.update_my_avatar(p_avatar_type text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.students
  SET avatar_type = p_avatar_type
  WHERE user_id = auth.uid();
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.update_my_avatar(text) FROM public;
GRANT EXECUTE ON FUNCTION public.update_my_avatar(text) TO authenticated;

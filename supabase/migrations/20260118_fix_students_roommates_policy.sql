-- Fix recursion in students_select_roommates policy
create or replace function public.is_roommate(p_target_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
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

drop policy if exists students_select_roommates on public.students;

create policy students_select_roommates on public.students
  for select to authenticated
  using (public.is_roommate(id));

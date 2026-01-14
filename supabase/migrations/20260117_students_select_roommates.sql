-- Allow students to see roommates for coupon transfer
drop policy if exists students_select_roommates on public.students;

create policy students_select_roommates on public.students
  for select to authenticated
  using (
    exists (
      select 1
      from public.students me
      where me.user_id = auth.uid()
        and (
          (me.apartment_id is not null and me.apartment_id = students.apartment_id)
          or (
            me.apartment_id is null
            and nullif(btrim(me.room), '') is not null
            and upper(btrim(me.room)) = upper(btrim(students.room))
          )
        )
    )
  );

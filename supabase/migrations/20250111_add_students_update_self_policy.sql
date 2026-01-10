-- Добавить политику для обновления своего профиля (аватар и т.д.)
-- Пользователь может обновлять только свою строку в students по user_id

-- Удалить старую политику если существует
drop policy if exists "students_update_self" on public.students;

-- Создать новую политику
create policy "students_update_self"
on public.students
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Комментарий
comment on policy "students_update_self" on public.students is 
'Authenticated users can update their own student record (avatar, telegram, etc)';

-- Store announcer name with cleanup results so everyone can see who published.

alter table public.cleanup_results
  add column if not exists announced_by_name text;

update public.cleanup_results cr
set announced_by_name = nullif(
  coalesce(
    nullif(s.full_name, ''),
    nullif(concat_ws(' ', s.first_name, s.last_name, s.middle_name), '')
  ),
  ''
)
from public.students s
where cr.announced_by = s.id
  and (cr.announced_by_name is null or cr.announced_by_name = '');

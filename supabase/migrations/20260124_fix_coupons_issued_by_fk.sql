-- Allow deleting a student who issued coupons.

alter table public.coupons
  drop constraint if exists coupons_issued_by_fkey;

alter table public.coupons
  add constraint coupons_issued_by_fkey
  foreign key (issued_by)
  references public.students(id)
  on delete set null;

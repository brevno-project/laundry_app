-- Set cleanup coupon TTL to 7 days.

insert into public.app_settings (key, value_int)
values ('cleanup_coupon_ttl_seconds', 604800)
on conflict (key) do update
  set value_int = excluded.value_int,
      updated_at = now();

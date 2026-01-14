-- Set cleanup coupon TTL to 5 minutes for testing
insert into public.app_settings (key, value_int)
values ('cleanup_coupon_ttl_seconds', 300)
on conflict (key) do update
  set value_int = excluded.value_int,
      updated_at = now();

import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseAdminConfigured = !!(supabaseUrl && serviceKey);

export const admin = isSupabaseAdminConfigured
  ? createClient(supabaseUrl as string, serviceKey as string, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : (new Proxy(
      {},
      {
        get() {
          throw new Error(
            "Server misconfigured: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing"
          );
        },
      }
    ) as any);

export function getAdminClient() {
  return admin;
}

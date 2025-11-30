import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "DEBUG ROUTE WORKS ✔️",

    env: {
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
      ANON_KEY_EXISTS: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SERVICE_KEY_EXISTS: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SERVICE_KEY_LENGTH: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    }
  });
}

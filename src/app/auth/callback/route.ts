import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Supabase-js на клиенте сам заберёт токены из URL если detectSessionInUrl=true,
  // но этот маршрут нужен как разрешённый redirect endpoint.
  const url = new URL(req.url);
  // просто возвращаем на главную
  return NextResponse.redirect(new URL('/', url.origin));
}

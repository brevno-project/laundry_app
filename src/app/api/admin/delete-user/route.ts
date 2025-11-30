import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const { userId, adminUserId } = await request.json();

    if (!userId || !adminUserId) {
      return NextResponse.json(
        { error: 'Missing userId or adminUserId' },
        { status: 400 }
      );
    }

    // Проверка прав
    const { data: admin, error: adminError } = await supabaseAdmin
      .from("students")
      .select("is_admin, is_super_admin")
      .eq("user_id", adminUserId)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 403 });
    }
    if (!admin.is_admin && !admin.is_super_admin) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // 🔥 Удаление user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("🔥 Supabase AUTH deleteUser error:", deleteError);

      return NextResponse.json(
        {
          error: "SupabaseAuthError",
          message: deleteError.message,
          status: deleteError.status ?? null,
          code: deleteError.code ?? null,
          details: deleteError,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("🔥 Unexpected API error:", err);
    return NextResponse.json(
      { error: "Unexpected server error", message: err.message },
      { status: 500 }
    );
  }
}

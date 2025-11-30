import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Создаем Supabase Admin client (только сервер!)
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

    // =============================
    // 1. Валидация входных данных
    // =============================
    if (!userId || !adminUserId) {
      return NextResponse.json(
        { error: "Missing userId or adminUserId" },
        { status: 400 }
      );
    }

    // =============================
    // 2. Проверка: adminUserId — это админ?
    // =============================
    const { data: admin, error: adminError } = await supabaseAdmin
      .from("students")
      .select("is_admin, is_super_admin")
      .eq("user_id", adminUserId)
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 403 }
      );
    }

    if (!admin.is_admin && !admin.is_super_admin) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // =============================
    // 3. Удаление AUTH пользователя
    // =============================

    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      const msg = deleteError.message?.toLowerCase() || "";

      // --- ❗ Если пользователь не найден — НЕ ошибка! ---
      if (
        deleteError.status === 404 ||
        msg.includes("not found") ||
        msg.includes("does not exist")
      ) {
        console.warn("⚠️ Auth user already deleted:", userId);

        return NextResponse.json({
          success: true,
          note: "Auth user already deleted",
        });
      }

      // --- Остальные ошибки — критические ---
      console.error("🔥 Auth delete error:", deleteError);

      return NextResponse.json(
        { error: `Auth delete error: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // =============================
    // 4. УСПЕШНО
    // =============================
    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("🔥 Unexpected delete-user error:", err);

    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

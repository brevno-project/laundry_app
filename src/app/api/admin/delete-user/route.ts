import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

export async function POST(req: NextRequest) {
  try {
    console.log("🔥 DELETE USER API HIT");

    const { userId, adminStudentId } = await req.json();
    console.log("📩 BODY:", { userId, adminStudentId });

    if (!userId || !adminStudentId) {
      return NextResponse.json(
        { error: "Missing userId or adminStudentId" },
        { status: 400 }
      );
    }

    // 1) Проверяем, что вызывающий – админ
    const { data: adminInfo, error: adminErr } = await supabaseAdmin
      .from("students")
      .select("is_admin, is_super_admin")
      .eq("id", adminStudentId)
      .single();

    if (adminErr || !adminInfo) {
      console.log("❌ Admin lookup failed:", adminErr);
      return NextResponse.json(
        { error: "Admin lookup failed" },
        { status: 500 }
      );
    }

    if (!adminInfo.is_admin && !adminInfo.is_super_admin) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    console.log("🔐 Admin verified");

    // 2) Проверяем, существует ли auth-пользователь
    let authExists = false;
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
      authExists = !!data;
    } catch (e) {
      authExists = false;
    }

    if (!authExists) {
      console.log("ℹ️ No auth user, cleaning database only…");
    } else {
      // 3) Пытаемся удалить auth-пользователя
      console.log("🗑️ Deleting auth user…");
      const { error: deleteError } =
        await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.log("⚠️ Auth delete error (ignored for app):", deleteError);
        // НЕ выходим — ниже всё равно чистим очередь/историю/students
      }
    }

    // 4) Чистим очередь
    await supabaseAdmin.from("queue").delete().eq("user_id", userId);

    // 5) Чистим историю
    await supabaseAdmin.from("history").delete().eq("user_id", userId);

    // 6) Сбрасываем связь у студентов
    await supabaseAdmin
      .from("students")
      .update({ user_id: null, is_registered: false })
      .eq("user_id", userId);

    console.log("✅ CLEANED: queue + history + students.user_id cleared");

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.log("💥 FATAL ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

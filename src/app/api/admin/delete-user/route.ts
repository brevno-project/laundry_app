import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
console.log("💣 DELETE-USER ROUTE ACTIVE 💣");
console.log("💣 KEY LENGTH:", process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

console.log("[DEBUG] SERVICE KEY PREFIX:", process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20));
console.log("[DEBUG] LENGTH:", process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

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

    // Проверка прав (students.id)
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from("students")
      .select("is_admin, is_super_admin")
      .eq("id", adminStudentId)
      .single();

    if (adminError) {
      console.log("❌ Admin lookup failed:", adminError);
      return NextResponse.json(
        { error: "Admin lookup failed" },
        { status: 500 }
      );
    }

    if (!adminData || (!adminData.is_admin && !adminData.is_super_admin)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    console.log("🔍 Admin verified");

    // Проверяем наличие user в auth
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
    const exists = usersList?.users?.some((u) => u.id === userId);

    console.log("🔍 Exists:", exists);

    if (!exists) {
      console.log("ℹ️ Auth user not found, skipping deletion");
      return NextResponse.json({ success: true, skipped: true });
    }

    // Удаляем
    console.log("🗑️ Deleting auth user…");

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.log("⚠️ DELETE ERROR:", deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.log("💥 FATAL ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function POST(req: NextRequest) {
  try {
    console.log("🔥 DELETE USER API HIT");

    const body = await req.json();
    console.log("📩 BODY:", body);

    const { userId, adminStudentId } = body;

    if (!userId || !adminStudentId) {
      console.log("❌ Missing required field");
      return NextResponse.json(
        { error: "Missing userId or adminStudentId" },
        { status: 400 }
      );
    }

    // Получаем админа
    console.log("🔍 Checking admin:", adminStudentId);
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from("students")
      .select("is_admin, is_super_admin")
      .eq("id", adminStudentId)
      .single();

    console.log("👤 ADMIN DATA:", adminData, adminError);

    if (adminError || !adminData) {
      console.log("❌ Admin not found");
      return NextResponse.json({ error: "Admin not found" }, { status: 403 });
    }

    if (!adminData.is_admin && !adminData.is_super_admin) {
      console.log("❌ Not enough permissions");
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Удаляем пользователя из AUTH
    console.log("🗑️ Deleting auth user:", userId);

    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.log("⚠️ DELETE ERROR:", deleteError);

      if (
        deleteError.status === 404 ||
        deleteError.message?.includes("not found")
      ) {
        console.log("ℹ️ User already deleted");
        return NextResponse.json({
          success: true,
          note: "Auth user already deleted",
        });
      }

      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    console.log("✅ USER DELETED SUCCESSFULLY");

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.log("💥 FATAL ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}

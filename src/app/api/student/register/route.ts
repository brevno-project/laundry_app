import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { student_id, auth_user_id } = await req.json();

    if (!student_id || !auth_user_id) {
      return NextResponse.json(
        { error: "Missing student_id or auth_user_id" },
        { status: 400 }
      );
    }

    // 🔥 service-role обновляет запись, RLS не мешает
    const { error } = await admin
      .from("students")
      .update({
        user_id: auth_user_id,
        is_registered: true,
        registered_at: new Date().toISOString(),
        is_banned: false,
        ban_reason: null,
        banned_at: null,
      })
      .eq("id", student_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

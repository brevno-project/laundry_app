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

    const { data: student, error: studentError } = await admin
      .from("students")
      .select("id, is_banned, ban_reason")
      .eq("id", student_id)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: "Студент не найден" }, { status: 404 });
    }

    if (student.is_banned) {
      return NextResponse.json(
        { error: `Студент забанен${student.ban_reason ? `: ${student.ban_reason}` : ""}` },
        { status: 403 }
      );
    }

    // 🔥 service-role обновляет запись, RLS не мешает
    const { error } = await admin
      .from("students")
      .update({
        user_id: auth_user_id,
        last_user_id: auth_user_id, // Сохраняем последний auth user ID
        is_registered: true,
        registered_at: new Date().toISOString(),
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

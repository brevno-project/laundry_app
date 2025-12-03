import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      student_id,
      full_name,
      room,
      wash_count,
      payment_type,
      expected_finish_at,
      scheduled_for_date,
      avatar_type,
      admin_student_id,
    } = body;

    if (!student_id) {
      return NextResponse.json({ error: "Missing student_id" }, { status: 400 });
    }
    

    // Проверяем админа
    const { data: adminInfo } = await admin
      .from("students")
      .select("is_admin, is_super_admin")
      .eq("id", admin_student_id)
      .single();

    if (!adminInfo || (!adminInfo.is_admin && !adminInfo.is_super_admin)) {
      return NextResponse.json({ error: "Admin not found" }, { status: 400 });
    }

    // Получаем user_id нужного студента (auth.uid)
    const { data: student } = await admin
      .from("students")
      .select("user_id")
      .eq("id", student_id)
      .single();

    if (!student || !student.user_id) {
      return NextResponse.json({ error: "Student has no user_id" }, { status: 400 });
    }

    // Позиция в очереди
    const { data: rows } = await admin
      .from("queue")
      .select("queue_position")
      .eq("queue_date", scheduled_for_date);

    const nextPos = rows?.length
      ? Math.max(...rows.map(r => r.queue_position || 0)) + 1
      : 1;

    // Вставляем
    const { error } = await admin.from("queue").insert({
      id: crypto.randomUUID(),
      student_id,
      user_id: student.user_id,    // 🔥 КЛЮЧЕВОЕ! RLS работает!!!
      full_name,
      room,
      wash_count,
      payment_type,
      expected_finish_at,
      scheduled_for_date,
      queue_date: scheduled_for_date,
      queue_position: nextPos,
      avatar_type,
      joined_at: new Date().toISOString(),
      status: "waiting",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    // ✅ Проверяем JWT и получаем инициатора
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    // ✅ Получаем данные из body
    const { student_id, reason, ban } = await req.json();

    if (!student_id || ban === undefined) {
      return NextResponse.json(
        { error: "Missing student_id or ban flag" },
        { status: 400 }
      );
    }

    // ✅ Получаем целевого студента
    const { data: targetStudent, error: targetError } = await supabaseAdmin
      .from("students")
      .select("id, is_super_admin")
      .eq("id", student_id)
      .maybeSingle();

    if (targetError || !targetStudent) {
      return NextResponse.json(
        { error: "Target student not found" },
        { status: 404 }
      );
    }

    // ✅ Защита: нельзя банить суперадминов (НИКОМУ!)
    if (targetStudent.is_super_admin) {
      return NextResponse.json(
        { error: "Cannot ban super admins" },
        { status: 403 }
      );
    }

    if (ban) {
      // ✅ Банить: удаляем из очереди
      await supabaseAdmin
        .from("queue")
        .delete()
        .eq("student_id", student_id);

      // ✅ Устанавливаем бан
      const { error: updateError } = await supabaseAdmin
        .from("students")
        .update({
          is_banned: true,
          banned_at: new Date().toISOString(),
          ban_reason: reason || "",
        })
        .eq("id", student_id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }
    } else {
      // ✅ Разбанить
      const { error: updateError } = await supabaseAdmin
        .from("students")
        .update({
          is_banned: false,
          banned_at: null,
          ban_reason: null,
        })
        .eq("id", student_id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error in ban-student:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

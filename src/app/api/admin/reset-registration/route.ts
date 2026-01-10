import { NextRequest, NextResponse } from "next/server";
import { getCaller, canModifyStudent, supabaseAdmin } from "../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    // ✅ Проверяем JWT и получаем инициатора
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    // ✅ Получаем student_id из body
    const { student_id } = await req.json();

    if (!student_id) {
      return NextResponse.json(
        { error: "Missing student_id" },
        { status: 400 }
      );
    }

    // ✅ Проверяем права на изменение целевого студента
    const { allowed, error: modifyError } = await canModifyStudent(caller, student_id);
    if (!allowed) return modifyError;

    // ✅ Удаляем активные записи очереди студента (выкидываем из очереди)
    await supabaseAdmin
      .from("queue")
      .delete()
      .eq("student_id", student_id)
      .in("status", ["waiting", "ready", "key_issued", "washing", "returning_key"]);

    // ✅ Сбрасываем только профильные данные (НЕ трогаем user_id!)
    // user_id остаётся → пользователь может войти тем же паролем
    const { error: updateError } = await supabaseAdmin
      .from("students")
      .update({
        is_registered: false,
        registered_at: null,
        telegram_chat_id: null,
        avatar_type: "default",
        // user_id НЕ обнуляем - оставляем связь Auth → students
      })
      .eq("id", student_id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error in reset-registration:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

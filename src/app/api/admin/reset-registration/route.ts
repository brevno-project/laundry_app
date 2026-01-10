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

    // ✅ Получить user_id перед сбросом
    const { data: studentData } = await supabaseAdmin
      .from("students")
      .select("user_id")
      .eq("id", student_id)
      .single();

    // ✅ Удалить пользователя из Supabase Auth (если есть user_id)
    if (studentData?.user_id) {
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
        studentData.user_id
      );
      
      if (deleteAuthError) {
        console.error("⚠️ Failed to delete user from Auth:", deleteAuthError.message);
        // Продолжаем выполнение - не критично
      } else {
        console.log("✅ Deleted user from Auth:", studentData.user_id);
      }
    }

    // ✅ Обнуляем user_id в очереди (необязательно, но безопасно)
    await supabaseAdmin
      .from("queue")
      .update({ user_id: null })
      .eq("student_id", student_id);

    // ✅ Сбрасываем регистрацию
    const { error: updateError } = await supabaseAdmin
      .from("students")
      .update({
        is_registered: false,
        registered_at: null,
        user_id: null,
        telegram_chat_id: null,
        avatar_type: "default",
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

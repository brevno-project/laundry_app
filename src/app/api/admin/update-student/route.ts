import { NextRequest, NextResponse } from "next/server";
import { getCaller, canModifyStudent, supabaseAdmin } from "../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    // ✅ Проверяем JWT и получаем инициатора
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    // ✅ Получаем данные из body
    const { student_id, updates } = await req.json();

    if (!student_id || !updates) {
      return NextResponse.json(
        { error: "Missing student_id or updates" },
        { status: 400 }
      );
    }

    // ✅ Проверяем права на изменение целевого студента
    const { allowed, target: targetStudent, error: modifyError } = await canModifyStudent(caller, student_id);
    if (!allowed) return modifyError;

    // ✅ Формируем updateData
    const updateData: any = {};

    // Имя / фамилия / отчество + пересборка full_name
    if (
      updates.first_name !== undefined ||
      updates.last_name !== undefined ||
      updates.middle_name !== undefined
    ) {
      const newFirstName =
        updates.first_name !== undefined
          ? updates.first_name
          : targetStudent.first_name;
      const newLastName =
        updates.last_name !== undefined
          ? updates.last_name
          : targetStudent.last_name || "";
      const newMiddleName =
        updates.middle_name !== undefined
          ? updates.middle_name
          : targetStudent.middle_name || "";

      const nameParts = [newFirstName, newLastName, newMiddleName].filter(
        Boolean
      );
      updateData.full_name = nameParts.join(" ");

      updateData.first_name = newFirstName;
      updateData.last_name = newLastName || null;
      updateData.middle_name = newMiddleName || null;
    }

    if (updates.room !== undefined) {
      updateData.room = updates.room;
    }
    if (updates.can_view_students !== undefined) {
      updateData.can_view_students = updates.can_view_students;
    }
    if (updates.avatar_type !== undefined) {
      updateData.avatar_type = updates.avatar_type;
    }

    // ✅ Обновляем студента
    const { data, error: updateError } = await supabaseAdmin
      .from("students")
      .update(updateData)
      .eq("id", student_id)
      .select();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, student: data?.[0] });
  } catch (err: any) {
    console.error("❌ Error in update-student:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

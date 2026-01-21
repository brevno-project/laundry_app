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
    if (updates.key_issued !== undefined) {
      updateData.key_issued = updates.key_issued;
    }
    if (updates.key_lost !== undefined) {
      updateData.key_lost = updates.key_lost;
    }
    if (updates.stay_type !== undefined) {
      const allowedStayTypes = ["unknown", "5days", "weekends"] as const;
      if (!allowedStayTypes.includes(updates.stay_type)) {
        return NextResponse.json(
          { error: "Invalid stay_type" },
          { status: 400 }
        );
      }
      updateData.stay_type = updates.stay_type;
    }
    if (updates.is_cleanup_admin !== undefined) {
      if (!caller.is_super_admin) {
        return NextResponse.json(
          { error: "Only super admin can manage cleanup admins" },
          { status: 403 }
        );
      }
      updateData.is_cleanup_admin = updates.is_cleanup_admin;
    }
    if (updates.avatar_style !== undefined) {
      updateData.avatar_style = updates.avatar_style;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // ✅ Обновляем студента
    const { data, error: updateError } = await supabaseAdmin
      .from("students")
      .update(updateData)
      .eq("id", student_id)
      .select();

    if (updateError) {
      const msg = updateError.message || "Update failed";
      if (msg.toLowerCase().includes("stay_type") && msg.toLowerCase().includes("does not exist")) {
        return NextResponse.json(
          { error: "Database schema is missing stay_type column. Apply migration 20260126_add_students_stay_type.sql" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: msg },
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

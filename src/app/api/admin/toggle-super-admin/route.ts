import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const { studentId, makeSuperAdmin, adminStudentId } = await req.json();

    if (!studentId || makeSuperAdmin === undefined || !adminStudentId) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    // 1) Проверяем что вызывающий — СУПЕРАДМИН
    const { data: caller } = await supabaseAdmin
      .from("students")
      .select("is_super_admin")
      .eq("id", adminStudentId)
      .single();

    // 1.5) Получить данные изменяемого студента
    const { data: studentToModify } = await supabaseAdmin
      .from("students")
      .select("is_super_admin")
      .eq("id", studentId)
      .single();

    // 1.6) ЗАЩИТА: суперадмина может менять только другой суперадмин
    if (studentToModify?.is_super_admin && !caller?.is_super_admin) {
      return NextResponse.json(
        { error: "Only super admin can manage super admins" },
        { status: 403 }
      );
    }

    // 2) Берём целевого студента
    const { data: target } = await supabaseAdmin
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single();

    if (!target) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // 3) Нельзя снять последнего суперадмина
    if (!makeSuperAdmin) {
      const { data: count } = await supabaseAdmin
        .from("students")
        .select("id", { count: "exact" })
        .eq("is_super_admin", true);

      if ((count?.length ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last super admin" },
          { status: 400 }
        );
      }
    }

    // 4) Нельзя снять самого себя
    if (!makeSuperAdmin && studentId === adminStudentId) {
      return NextResponse.json(
        { error: "Super admin cannot remove his own status" },
        { status: 400 }
      );
    }

    // 5) Обновляем статус
    const { error: updateErr } = await supabaseAdmin
      .from("students")
      .update({ is_super_admin: makeSuperAdmin })
      .eq("id", studentId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    console.log("🔥 DELETE-STUDENT API HIT");

    const { studentId, adminStudentId } = await req.json();

    if (!studentId || !adminStudentId) {
      return NextResponse.json(
        { error: "Missing studentId or adminStudentId" },
        { status: 400 }
      );
    }

    // --- 1. Проверяем права ---
    const { data: adminInfo } = await supabaseAdmin
      .from("students")
      .select("is_admin, is_super_admin, is_cleanup_admin")
      .eq("id", adminStudentId)
      .single();
      
      // 1.5) Получить данные удаляемого студента
    const { data: studentToDelete } = await supabaseAdmin
      .from("students")
      .select("is_super_admin, is_admin, is_cleanup_admin")
      .eq("id", studentId)
      .single();

    // 1.6) ЗАЩИТА: блокируем удаление суперадмина
    if (studentToDelete?.is_super_admin && !adminInfo?.is_super_admin) {
      return NextResponse.json(
        { error: "You cannot delete super admin" },
        { status: 403 }
      );
    }

    const isCleanupAdmin = !!adminInfo?.is_cleanup_admin;

    if (!adminInfo || (!adminInfo.is_admin && !adminInfo.is_super_admin && !isCleanupAdmin)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    if (isCleanupAdmin && !adminInfo?.is_admin && !adminInfo?.is_super_admin) {
      const targetIsPrivileged =
        !!studentToDelete?.is_super_admin ||
        !!studentToDelete?.is_admin ||
        !!studentToDelete?.is_cleanup_admin;
      if (targetIsPrivileged) {
        return NextResponse.json(
          { error: "Cleanup leaders cannot delete admins or leaders" },
          { status: 403 }
        );
      }
    }

    console.log("🔐 Admin verified");

    // --- 2. Берём студента ---
    const { data: studentData, error: studentErr } = await supabaseAdmin
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single();

    if (studentErr || !studentData) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const userId = studentData.user_id;

    // --- 3. Удаляем очередь студента ---
    await supabaseAdmin
      .from("queue")
      .delete()
      .eq("student_id", studentId);

    // --- 4. Удаляем историю ---
    if (userId) {
      await supabaseAdmin
        .from("history")
        .delete()
        .or(`user_id.eq.${userId},student_id.eq.${studentId}`);
    } else {
      await supabaseAdmin
        .from("history")
        .delete()
        .eq("student_id", studentId);
    }

    // --- 5. Удаляем auth user ---
    if (userId) {
      const { error: authError } =
        await supabaseAdmin.auth.admin.deleteUser(userId);

      if (authError) {
        console.log("⚠ Auth delete error (ignored):", authError.message);
        // продолжаем — не критично
      }
    }

    // --- 6. Удаляем студента ---
    const { error: deleteStudentErr } = await supabaseAdmin
      .from("students")
      .delete()
      .eq("id", studentId);

    if (deleteStudentErr) {
      return NextResponse.json(
        { error: deleteStudentErr.message },
        { status: 500 }
      );
    }

    console.log("✅ Student FULLY deleted:", studentId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.log("💥 FATAL ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { canModifyStudent, getCaller, supabaseAdmin } from "../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    const { studentId } = await req.json();
    if (!studentId) {
      return NextResponse.json(
        { error: "Missing studentId" },
        { status: 400 }
      );
    }

    const { allowed, error: modifyError } = await canModifyStudent(
      caller,
      studentId
    );
    if (!allowed) return modifyError;

    const { data: studentData, error: studentErr } = await supabaseAdmin
      .from("students")
      .select("id, is_super_admin, is_admin, is_cleanup_admin, user_id")
      .eq("id", studentId)
      .maybeSingle();

    if (studentErr || !studentData) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (studentData.is_super_admin || studentData.is_admin || studentData.is_cleanup_admin) {
      return NextResponse.json(
        { error: "Cannot delete privileged accounts" },
        { status: 403 }
      );
    }

    if (caller.is_cleanup_admin && !caller.is_admin && !caller.is_super_admin) {
      const targetIsPrivileged =
        !!studentData.is_super_admin ||
        !!studentData.is_admin ||
        !!studentData.is_cleanup_admin;
      if (targetIsPrivileged) {
        return NextResponse.json(
          { error: "Cleanup leaders cannot delete admins or leaders" },
          { status: 403 }
        );
      }
    }

    const userId = studentData.user_id;

    await supabaseAdmin.from("queue").delete().eq("student_id", studentId);

    if (userId) {
      await supabaseAdmin
        .from("history")
        .delete()
        .or(`user_id.eq.${userId},student_id.eq.${studentId}`);
    } else {
      await supabaseAdmin.from("history").delete().eq("student_id", studentId);
    }

    if (userId) {
      const { error: authError } =
        await supabaseAdmin.auth.admin.deleteUser(userId);

      if (authError) {
      }
    }

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

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

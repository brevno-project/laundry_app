import { NextRequest, NextResponse } from "next/server";
import { canModifyStudent, getCaller, supabaseAdmin } from "../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    // Проверяем JWT и права инициатора
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    const { studentId } = await req.json();
    console.log("🔄 RESET REQUEST: studentId =", studentId);

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    // Проверяем доступ к целевому студенту
    const { allowed, target, error: targetError } = await canModifyStudent(caller, studentId);
    if (targetError) return targetError;
    if (!allowed) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
    if (!caller.is_super_admin && target.is_admin) {
      return NextResponse.json({ error: "Only super admin can reset admins" }, { status: 403 });
    }

    // 2) Берём old_user_id и last_user_id у сбрасываемого студента
    const { data: student, error: sErr } = await supabaseAdmin
      .from("students")
      .select("id, user_id, last_user_id")
      .eq("id", studentId)
      .single();

    if (sErr || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const oldUserId = student.user_id as string | null;
    const lastUserId = student.last_user_id as string | null;
    console.log("🔄 RESET: oldUserId =", oldUserId);

    // 3) Чистим данные студента
    // queue — полностью удалить, чтобы гарантированно не было мусора/конфликтов
    const { error: qErr } = await supabaseAdmin.from("queue").delete().eq("student_id", studentId);
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });

    // student_auth — удалить
    const { error: aErr } = await supabaseAdmin.from("student_auth").delete().eq("student_id", studentId);
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 400 });

    // 4) Удаляем auth user (сначала!)
    // history удалится каскадом (ты уже сделал ON DELETE CASCADE)
    const authIdToDelete = oldUserId || lastUserId;
    
    if (authIdToDelete) {
      console.log("🔄 RESET: Deleting auth user by ID", authIdToDelete);
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(authIdToDelete);
      
      if (delErr) {
        const msg = (delErr.message || "").toLowerCase();
        const notFound =
          msg.includes("not found") ||
          msg.includes("user not found") ||
          msg.includes("404");
        
        if (!notFound) {
          console.error("🔄 RESET: deleteUser error:", delErr);
          return NextResponse.json({ error: delErr.message }, { status: 400 });
        }
        
        // user already deleted -> OK, продолжаем
        console.log("🔄 RESET: Auth user already deleted, continuing");
      } else {
        console.log("🔄 RESET: Auth user deleted successfully");
      }
    } else {
      console.log("🔄 RESET: No auth user ID to delete");
    }

    // 5) Теперь сбрасываем students (после успешного deleteUser)
    const { error: uErr } = await supabaseAdmin
      .from("students")
      .update({
        user_id: null,
        last_user_id: null,
        is_registered: false,
        registered_at: null,
        telegram_chat_id: null,
        avatar_type: "default",
        claim_code_hash: null,
        claim_code_issued_at: null,
      })
      .eq("id", studentId);

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

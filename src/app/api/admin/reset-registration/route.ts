import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { studentId } = await req.json();
    console.log("🔄 RESET REQUEST: studentId =", studentId);

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 1) Проверяем, что запрос делает супер-админ (по JWT)
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization Bearer token" }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const requesterId = userData.user.id;

    const { data: requester, error: reqErr } = await supabaseAdmin
      .from("students")
      .select("is_super_admin, is_banned")
      .eq("user_id", requesterId)
      .single();

    if (reqErr || !requester) {
      return NextResponse.json({ error: "Requester not found in students" }, { status: 403 });
    }
    if (requester.is_banned) {
      return NextResponse.json({ error: "Requester is banned" }, { status: 403 });
    }
    if (!requester.is_super_admin) {
      return NextResponse.json({ error: "Super admin only" }, { status: 403 });
    }

    // 2) Берём old_user_id у сбрасываемого студента
    const { data: student, error: sErr } = await supabaseAdmin
      .from("students")
      .select("id, user_id")
      .eq("id", studentId)
      .single();

    if (sErr || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const oldUserId = student.user_id as string | null;
    console.log("🔄 RESET: oldUserId =", oldUserId);

    // 3) Чистим данные студента
    // queue — полностью удалить, чтобы гарантированно не было мусора/конфликтов
    const { error: qErr } = await supabaseAdmin.from("queue").delete().eq("student_id", studentId);
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });

    // student_auth — удалить
    const { error: aErr } = await supabaseAdmin.from("student_auth").delete().eq("student_id", studentId);
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 400 });

    // 4) Сброс полей в students (карточка остаётся)
    const { error: uErr } = await supabaseAdmin
      .from("students")
      .update({
        user_id: null,
        is_registered: false,
        registered_at: null,
        telegram_chat_id: null,
        avatar_type: "default",
        claim_code_hash: null,
        claim_code_issued_at: null,
      })
      .eq("id", studentId);

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });

    // 5) Удаляем auth user (освобождаем email)
    // history удалится каскадом (ты уже сделал ON DELETE CASCADE)
    if (oldUserId) {
      console.log("🔄 RESET: Deleting auth user", oldUserId);
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(oldUserId);
      if (delErr) {
        console.error("🔄 RESET: deleteUser error:", delErr);
        return NextResponse.json({ error: delErr.message }, { status: 400 });
      }
      console.log("🔄 RESET: Auth user deleted successfully");
    } else {
      console.log("🔄 RESET: No oldUserId to delete");
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

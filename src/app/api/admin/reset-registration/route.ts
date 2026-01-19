import { NextRequest, NextResponse } from "next/server";
import { canModifyStudent, getCaller, supabaseAdmin, requireLaundryAdmin } from "../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;
    const roleError = requireLaundryAdmin(caller);
    if (roleError) return roleError;

    const { studentId } = await req.json();

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const { allowed, target, error: targetError } = await canModifyStudent(caller, studentId);
    if (targetError) return targetError;
    if (!allowed) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    if (!caller.is_super_admin && target.is_admin) {
      return NextResponse.json({ error: "Only super admin can reset admins" }, { status: 403 });
    }

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

    const { error: qErr } = await supabaseAdmin
      .from("queue")
      .delete()
      .eq("student_id", studentId);
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });

    const { error: aErr } = await supabaseAdmin
      .from("student_auth")
      .delete()
      .eq("student_id", studentId);
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 400 });

    const { error: tErr } = await supabaseAdmin
      .from("coupon_transfers")
      .delete()
      .or(`from_student_id.eq.${studentId},to_student_id.eq.${studentId}`);
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 400 });

    const { error: cErr } = await supabaseAdmin
      .from("coupons")
      .delete()
      .eq("owner_student_id", studentId);
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });

    const authIdToDelete = oldUserId || lastUserId;

    if (authIdToDelete) {
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(authIdToDelete);

      if (delErr) {
        const msg = (delErr.message || "").toLowerCase();
        const notFound =
          msg.includes("not found") ||
          msg.includes("user not found") ||
          msg.includes("404");

        if (!notFound) {
          return NextResponse.json({ error: delErr.message }, { status: 400 });
        }
      }
    }

    const { error: uErr } = await supabaseAdmin
      .from("students")
      .update({
        user_id: null,
        last_user_id: null,
        is_registered: false,
        registered_at: null,
        telegram_chat_id: null,
        can_view_students: false,
        is_banned: false,
        banned_at: null,
        ban_reason: null,
        key_issued: false,
        key_lost: false,
        avatar: "default",
        avatar_type: "default",
        avatar_style: "thumbs",
        avatar_seed: null,
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

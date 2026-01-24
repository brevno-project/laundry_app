import { NextRequest, NextResponse } from "next/server";
import { canModifyStudent, getCaller, supabaseAdmin } from "../../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    if (!caller.is_super_admin) {
      return NextResponse.json(
        { error: "Only super admin can clear coupons" },
        { status: 403 }
      );
    }

    const { student_id } = await req.json();
    if (!student_id) {
      return NextResponse.json(
        { error: "Missing student_id" },
        { status: 400 }
      );
    }

    const { allowed, error: modifyError } = await canModifyStudent(
      caller,
      student_id
    );
    if (!allowed) return modifyError;

    const { error: resetError } = await supabaseAdmin
      .from("queue")
      .update({ coupons_used: 0, payment_type: "money" })
      .eq("student_id", student_id)
      .in("status", ["waiting", "ready", "key_issued"])
      .is("washing_started_at", null);

    if (resetError) {
      return NextResponse.json(
        { error: resetError.message },
        { status: 500 }
      );
    }

    const { count, error } = await supabaseAdmin
      .from("coupons")
      .delete({ count: "exact" })
      .eq("owner_student_id", student_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      cleared: count ?? 0,
      student_id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

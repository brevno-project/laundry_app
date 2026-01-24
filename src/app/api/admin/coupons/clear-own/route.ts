import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../../_utils/adminAuth";

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

    await supabaseAdmin
      .from("queue")
      .update({ coupons_used: 0, payment_type: "money" })
      .eq("student_id", caller.student_id)
      .in("status", ["waiting", "ready", "key_issued"])
      .is("washing_started_at", null);

    const { count, error } = await supabaseAdmin
      .from("coupons")
      .delete({ count: "exact" })
      .eq("owner_student_id", caller.student_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, cleared: count ?? 0 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

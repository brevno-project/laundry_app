import { NextRequest, NextResponse } from "next/server";
import {
  canModifyStudent,
  getCaller,
  requireLaundryAdmin,
  supabaseAdmin,
} from "../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    const roleError = requireLaundryAdmin(caller);
    if (roleError) return roleError;

    if (!caller.is_super_admin) {
      return NextResponse.json(
        { error: "Only super admin can manage super admins" },
        { status: 403 }
      );
    }

    const { studentId, makeSuperAdmin } = await req.json();

    if (!studentId || makeSuperAdmin === undefined) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const { allowed, error: modifyError } = await canModifyStudent(
      caller,
      studentId
    );
    if (!allowed) return modifyError;

    if (!makeSuperAdmin) {
      const { count } = await supabaseAdmin
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("is_super_admin", true);

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last super admin" },
          { status: 400 }
        );
      }
    }

    if (!makeSuperAdmin && studentId === caller.student_id) {
      return NextResponse.json(
        { error: "Super admin cannot remove his own status" },
        { status: 400 }
      );
    }

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

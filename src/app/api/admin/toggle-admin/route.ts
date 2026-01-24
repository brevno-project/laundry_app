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
        { error: "Only super admin can manage admins" },
        { status: 403 }
      );
    }

    const { studentId, makeAdmin } = await req.json();

    if (!studentId || makeAdmin === undefined) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const { allowed, error: modifyError } = await canModifyStudent(
      caller,
      studentId
    );
    if (!allowed) return modifyError;

    const { data: target } = await supabaseAdmin
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single();

    if (!target) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    let userId = target.user_id;

    if (makeAdmin && !userId) {
      const email = `admin-${studentId.slice(0, 8)}@example.com`;
      const password = crypto.randomUUID().slice(0, 12);

      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }

      userId = created.user?.id;

      if (userId) {
        await supabaseAdmin
          .from("students")
          .update({ user_id: userId })
          .eq("id", studentId);
      }
    }

    const { error: updateErr } = await supabaseAdmin
      .from("students")
      .update({ is_admin: makeAdmin })
      .eq("id", studentId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

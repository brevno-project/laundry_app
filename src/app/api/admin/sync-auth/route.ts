import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    if (!caller.is_super_admin) {
      return NextResponse.json(
        { error: "Only super admin can sync auth users" },
        { status: 403 }
      );
    }

    const { data: admins } = await supabaseAdmin
      .from("students")
      .select("*")
      .or("is_admin.eq.true,is_super_admin.eq.true,is_cleanup_admin.eq.true")
      .is("user_id", null);

    if (!admins || admins.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "Все админы уже синхронизированы",
      });
    }

    for (const admin of admins) {
      const email = `admin-${admin.id.slice(0, 8)}@example.com`;
      const password = crypto.randomUUID().slice(0, 12);

      const { data: signUpData, error: signUpErr } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            student_id: admin.id,
            full_name: admin.full_name,
            admin: true,
            super_admin: admin.is_super_admin,
            cleanup_admin: admin.is_cleanup_admin,
          },
        });

      if (signUpErr) {
        console.log("FAILED:", signUpErr);
        continue;
      }

      const authUserId = signUpData.user?.id;

      if (!authUserId) continue;

      await supabaseAdmin
        .from("students")
        .update({ user_id: authUserId })
        .eq("id", admin.id);
    }

    return NextResponse.json({
      ok: true,
      message: "Админы синхронизированы",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

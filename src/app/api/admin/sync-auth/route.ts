// /api/admin/sync-auth/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    // Все админы и супер-админы без user_id
    const { data: admins } = await supabaseAdmin
      .from("students")
      .select("*")
      .or("is_admin.eq.true,is_super_admin.eq.true,is_cleanup_admin.eq.true")
      .is("user_id", null);

    if (!admins || admins.length === 0) {
      return NextResponse.json({ ok: true, message: "Все админы уже синхронизированы" });
    }

    for (const admin of admins) {
      const email = `admin-${admin.id.slice(0, 8)}@example.com`;
      const password = crypto.randomUUID().slice(0, 12);

      // Создаём auth user
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

      // Записываем user_id в таблицу students
      await supabaseAdmin
        .from("students")
        .update({ user_id: authUserId })
        .eq("id", admin.id);
    }

    return NextResponse.json({ ok: true, message: "Админы синхронизированы" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

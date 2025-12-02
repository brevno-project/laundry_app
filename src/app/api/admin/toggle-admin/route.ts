import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const { studentId, makeAdmin, adminStudentId } = await req.json();

    if (!studentId || makeAdmin === undefined || !adminStudentId) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    // 1) Проверяем, что вызывающий — суперадмин
    const { data: caller } = await supabaseAdmin
      .from("students")
      .select("is_super_admin")
      .eq("id", adminStudentId)
      .single();

    if (!caller?.is_super_admin) {
      return NextResponse.json(
        { error: "Only super admin can manage admins" },
        { status: 403 }
      );
    }

    // 2) Берём целевого студента
    const { data: target } = await supabaseAdmin
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single();

    if (!target) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // 3) Если назначаем админом и нет user_id → создаём auth user
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

    // 4) Обновляем admin статус
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

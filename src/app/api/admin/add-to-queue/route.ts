import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      student_id,
      wash_count,
      coupons_used,
      expected_finish_at,
      scheduled_for_date,
      admin_student_id,
    } = body;

    if (!student_id || !admin_student_id || !scheduled_for_date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1) Проверяем админа
    const { data: adminInfo } = await admin
      .from("students")
      .select("is_admin, is_super_admin")
      .eq("id", admin_student_id)
      .maybeSingle();

    if (!adminInfo || (!adminInfo.is_admin && !adminInfo.is_super_admin)) {
      return NextResponse.json({ error: "Admin not found" }, { status: 400 });
    }

    // 2) Получаем студента
    const { data: student } = await admin
      .from("students")
      .select("id, user_id, full_name, room, avatar_type, is_super_admin")  // ← ДОБАВИЛИ is_super_admin
      .eq("id", student_id)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 400 });
    }

    // 2.5) НОВАЯ ЗАЩИТА: блокируем действия над суперадмином
    if (student.is_super_admin && !adminInfo.is_super_admin) {
      return NextResponse.json(
        { error: "You cannot modify super admin" },
        { status: 403 }
      );
    }

    // 3) Определяем позицию
    const { data: rows } = await admin
      .from("queue")
      .select("queue_position")
      .eq("queue_date", scheduled_for_date);

    const nextPos =
      rows?.length && rows.length > 0
        ? Math.max(...rows.map((r) => r.queue_position || 0)) + 1
        : 1;

    // 4) Вставка ПОЛНОЙ записи
    const safeWashCount = typeof wash_count === "number" && wash_count > 0 ? wash_count : 1;
    const safeCouponsUsed =
      typeof coupons_used === "number" && coupons_used > 0
        ? Math.min(coupons_used, safeWashCount)
        : 0;
    const derivedPaymentType =
      safeCouponsUsed === 0 ? "money" : safeCouponsUsed >= safeWashCount ? "coupon" : "both";

    // Проверяем доступные купоны перед вставкой
    if (safeCouponsUsed > 0) {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const { data: couponRows } = await admin
        .from("coupons")
        .select("id, issued_at, expires_at")
        .eq("owner_student_id", student.id)
        .is("reserved_queue_id", null)
        .is("used_in_queue_id", null)
        .gt("expires_at", now.toISOString());

      const eligible = (couponRows || []).filter((coupon) => {
        const issuedAt = new Date(coupon.issued_at).getTime();
        const expiresAt = new Date(coupon.expires_at).getTime();
        const ttlMs = expiresAt - issuedAt;
        const expiresDateStr = new Date(coupon.expires_at).toISOString().slice(0, 10);

        if (ttlMs >= 24 * 60 * 60 * 1000) {
          return scheduled_for_date < expiresDateStr;
        }

        return scheduled_for_date === todayStr && expiresAt > now.getTime();
      });

      if (eligible.length < safeCouponsUsed) {
        return NextResponse.json(
          { error: "Недостаточно купонов для выбранной даты" },
          { status: 400 }
        );
      }
    }

    const row = {
      id: crypto.randomUUID(),
    
      student_id: student.id,
      user_id: student.user_id ?? null,
    
      full_name: student.full_name,
      room: student.room,
    
      wash_count: safeWashCount,
      coupons_used: safeCouponsUsed,
      payment_type: derivedPaymentType,
      expected_finish_at,
    
      scheduled_for_date,
      queue_date: scheduled_for_date,
      queue_position: nextPos,
    
      avatar_type: student.avatar_type,
    
      status: "waiting",
      joined_at: new Date().toISOString(),
    
      admin_message: null,
      return_key_alert: false,
      ready_at: null,
      key_issued_at: null,
      washing_started_at: null,
      return_requested_at: null,
      washing_finished_at: null,
    };

    const { error } = await admin.from("queue").insert(row);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (safeCouponsUsed > 0) {
      const now = new Date().toISOString();
      const { data: couponRows } = await admin
        .from("coupons")
        .select("id, issued_at, expires_at")
        .eq("owner_student_id", student.id)
        .is("reserved_queue_id", null)
        .is("used_in_queue_id", null)
        .gt("expires_at", now);

      const eligible = (couponRows || [])
        .filter((coupon) => {
          const issuedAt = new Date(coupon.issued_at).getTime();
          const expiresAt = new Date(coupon.expires_at).getTime();
          const ttlMs = expiresAt - issuedAt;
          const expiresDateStr = new Date(coupon.expires_at).toISOString().slice(0, 10);
          const todayStr = new Date().toISOString().slice(0, 10);

          if (ttlMs >= 24 * 60 * 60 * 1000) {
            return scheduled_for_date < expiresDateStr;
          }

          return scheduled_for_date === todayStr && expiresAt > Date.now();
        })
        .sort(
          (a, b) =>
            new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime() ||
            new Date(a.issued_at).getTime() - new Date(b.issued_at).getTime()
        )
        .slice(0, safeCouponsUsed);

      if (eligible.length < safeCouponsUsed) {
        await admin.from("queue").delete().eq("id", row.id);
        return NextResponse.json(
          { error: "Недостаточно купонов для брони" },
          { status: 400 }
        );
      }

      await admin
        .from("coupons")
        .update({ reserved_queue_id: row.id, reserved_at: now })
        .in("id", eligible.map((coupon) => coupon.id));
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

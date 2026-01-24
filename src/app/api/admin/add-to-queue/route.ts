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

    const body = await req.json();
    const {
      student_id,
      wash_count,
      coupons_used,
      expected_finish_at,
      scheduled_for_date,
    } = body;

    if (!student_id || !scheduled_for_date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { allowed, error: modifyError } = await canModifyStudent(
      caller,
      student_id
    );
    if (!allowed) return modifyError;

    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, user_id, full_name, room, avatar_type, is_super_admin")
      .eq("id", student_id)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 400 });
    }

    const { data: rows } = await supabaseAdmin
      .from("queue")
      .select("queue_position")
      .eq("queue_date", scheduled_for_date);

    const typedRows =
      (rows as { queue_position: number | null }[] | null | undefined) || [];

    const nextPos =
      typedRows.length > 0
        ? Math.max(
            ...typedRows.map(
              (r: { queue_position: number | null }) => r.queue_position || 0
            )
          ) + 1
        : 1;

    const safeWashCount =
      typeof wash_count === "number" && wash_count > 0 ? wash_count : 1;
    const safeCouponsUsed =
      typeof coupons_used === "number" && coupons_used > 0
        ? Math.min(coupons_used, safeWashCount)
        : 0;
    const derivedPaymentType =
      safeCouponsUsed === 0
        ? "money"
        : safeCouponsUsed >= safeWashCount
          ? "coupon"
          : "both";

    if (safeCouponsUsed > 0) {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const { data: couponRows } = await supabaseAdmin
        .from("coupons")
        .select("id, issued_at, expires_at")
        .eq("owner_student_id", student.id)
        .is("reserved_queue_id", null)
        .is("used_at", null)
        .is("used_in_queue_id", null)
        .gt("expires_at", now.toISOString());

      const typedCoupons =
        (couponRows as
          | { id: string; issued_at: string; expires_at: string }[]
          | null
          | undefined) || [];

      const eligible = typedCoupons.filter(
        (coupon: { id: string; issued_at: string; expires_at: string }) => {
          const issuedAt = new Date(coupon.issued_at).getTime();
          const expiresAt = new Date(coupon.expires_at).getTime();
          const ttlMs = expiresAt - issuedAt;
          const expiresDateStr = new Date(coupon.expires_at)
            .toISOString()
            .slice(0, 10);

          if (ttlMs >= 24 * 60 * 60 * 1000) {
            return scheduled_for_date < expiresDateStr;
          }

          return scheduled_for_date === todayStr && expiresAt > now.getTime();
        }
      );

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

    const { error } = await supabaseAdmin.from("queue").insert(row);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (safeCouponsUsed > 0) {
      const now = new Date().toISOString();
      const { data: couponRows } = await supabaseAdmin
        .from("coupons")
        .select("id, issued_at, expires_at")
        .eq("owner_student_id", student.id)
        .is("reserved_queue_id", null)
        .is("used_at", null)
        .is("used_in_queue_id", null)
        .gt("expires_at", now);

      const typedCoupons =
        (couponRows as
          | { id: string; issued_at: string; expires_at: string }[]
          | null
          | undefined) || [];

      const eligible = typedCoupons
        .filter(
          (coupon: { id: string; issued_at: string; expires_at: string }) => {
            const issuedAt = new Date(coupon.issued_at).getTime();
            const expiresAt = new Date(coupon.expires_at).getTime();
            const ttlMs = expiresAt - issuedAt;
            const expiresDateStr = new Date(coupon.expires_at)
              .toISOString()
              .slice(0, 10);
            const todayStr = new Date().toISOString().slice(0, 10);

            if (ttlMs >= 24 * 60 * 60 * 1000) {
              return scheduled_for_date < expiresDateStr;
            }

            return scheduled_for_date === todayStr && expiresAt > Date.now();
          }
        )
        .sort(
          (a, b) =>
            new Date(a.expires_at).getTime() -
              new Date(b.expires_at).getTime() ||
            new Date(a.issued_at).getTime() -
              new Date(b.issued_at).getTime()
        )
        .slice(0, safeCouponsUsed);

      if (eligible.length < safeCouponsUsed) {
        await supabaseAdmin.from("queue").delete().eq("id", row.id);
        return NextResponse.json(
          { error: "Недостаточно купонов для брони" },
          { status: 400 }
        );
      }

      await supabaseAdmin
        .from("coupons")
        .update({ reserved_queue_id: row.id, reserved_at: now })
        .in("id", eligible.map((coupon: { id: string }) => coupon.id));
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

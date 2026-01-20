import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin, getQueueItemOr404, isTargetSuperAdmin, requireLaundryAdmin } from "../../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    // ✅ Проверяем JWT и получаем инициатора
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;
    const roleError = requireLaundryAdmin(caller);
    if (roleError) return roleError;

    // ✅ Получаем данные из body
    const { queue_item_id } = await req.json();

    if (!queue_item_id) {
      return NextResponse.json(
        { error: "Missing queue_item_id" },
        { status: 400 }
      );
    }

    // ✅ Получаем queue item БЕЗ INNER JOIN
    const { queueItem, error: queueError } = await getQueueItemOr404(queue_item_id);
    if (queueError) return queueError;

    // ✅ Проверяем, супер-админ ли цель
    const targetIsSuperAdmin = await isTargetSuperAdmin(queueItem.student_id);

    // ✅ Защита: обычный админ не может трогать очередь суперадмина
    if (targetIsSuperAdmin && !caller.is_super_admin) {
      return NextResponse.json(
        { error: "Only super admin can modify super admin's queue items" },
        { status: 403 }
      );
    }

    const { data: queueDetails, error: queueDetailsError } = await supabaseAdmin
      .from("queue")
      .select("status, coupons_used, payment_type, washing_started_at")
      .eq("id", queue_item_id)
      .maybeSingle();

    if (queueDetailsError || !queueDetails) {
      return NextResponse.json(
        { error: "Queue item not found" },
        { status: 404 }
      );
    }

    const shouldCheckCoupons =
      (queueDetails.coupons_used ?? 0) > 0 ||
      queueDetails.payment_type === "coupon" ||
      queueDetails.payment_type === "both";
    const canAutoRemove =
      (queueDetails.status === "waiting" || queueDetails.status === "ready") &&
      !queueDetails.washing_started_at;

    if (shouldCheckCoupons && canAutoRemove) {
      const cutoff = new Date().toISOString();
      const { data: expiredCoupon, error: expiredError } = await supabaseAdmin
        .from("coupons")
        .select("id")
        .eq("reserved_queue_id", queue_item_id)
        .is("used_at", null)
        .is("used_in_queue_id", null)
        .lte("expires_at", cutoff)
        .limit(1)
        .maybeSingle();

      if (expiredError) {
        return NextResponse.json(
          { error: expiredError.message },
          { status: 500 }
        );
      }

      if (expiredCoupon) {
        const { error: releaseError } = await supabaseAdmin
          .from("coupons")
          .update({ reserved_queue_id: null, reserved_at: null })
          .eq("reserved_queue_id", queue_item_id)
          .is("used_at", null)
          .is("used_in_queue_id", null);

        if (releaseError) {
          return NextResponse.json(
            { error: releaseError.message },
            { status: 500 }
          );
        }

        const { error: removeError } = await supabaseAdmin
          .from("queue")
          .delete()
          .eq("id", queue_item_id);

        if (removeError) {
          return NextResponse.json(
            { error: removeError.message },
            { status: 500 }
          );
        }

        return NextResponse.json(
          {
            error: "Купон сгорел. Запись удалена из очереди.",
            code: "COUPON_EXPIRED",
            removed: true,
          },
          { status: 409 }
        );
      }
    }

    // ✅ Обновляем статус очереди на WASHING
    const startedAt = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("queue")
      .update({ status: "washing", washing_started_at: startedAt })
      .eq("id", queue_item_id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // ✅ Обновляем состояние машины
    const now = startedAt;
    const { error: machineError } = await supabaseAdmin
      .from("machine_state")
      .upsert({
        status: "washing",
        current_queue_item_id: queue_item_id,
        started_at: now,
        expected_finish_at: null,
      });

    if (machineError) {
      return NextResponse.json(
        { error: machineError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error in start-washing:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

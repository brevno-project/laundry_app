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
    const { queue_item_id, updates } = await req.json();

    if (!queue_item_id || !updates) {
      return NextResponse.json(
        { error: "Не передан queue_item_id или данные для обновления" },
        { status: 400 }
      );
    }

    // ✅ Получаем queue item БЕЗ INNER JOIN
    const { queueItem, error: queueError } = await getQueueItemOr404(queue_item_id);
    if (queueError) return queueError;

    // ✅ Получаем полную информацию о queue item для проверки статуса
    const { data: fullQueueItem, error: fullError } = await supabaseAdmin
      .from("queue")
      .select("status, wash_count, coupons_used, queue_date")
      .eq("id", queue_item_id)
      .single();

    if (fullError || !fullQueueItem) {
      return NextResponse.json(
        { error: "Запись очереди не найдена" },
        { status: 404 }
      );
    }

    // ✅ Проверяем, супер-админ ли цель
    const targetIsSuperAdmin = await isTargetSuperAdmin(queueItem.student_id);

    // ✅ Защита: обычный админ не может трогать очередь суперадмина
    if (targetIsSuperAdmin && !caller.is_super_admin) {
      return NextResponse.json(
        { error: "Только суперадмин может менять записи суперадмина" },
        { status: 403 }
      );
    }

    // ✅ Можно обновлять только WAITING
    if (fullQueueItem.status !== "waiting") {
      return NextResponse.json(
        { error: "Можно редактировать только записи со статусом ожидания" },
        { status: 400 }
      );
    }

    // ✅ Формируем updateData (whitelist)
    const updateData: any = {};
    const currentWashCount = fullQueueItem.wash_count ?? 1;
    const currentCouponsUsed = fullQueueItem.coupons_used ?? 0;

    const nextWashCount =
      updates.wash_count !== undefined ? updates.wash_count : currentWashCount;
    const nextCouponsUsedRaw =
      updates.coupons_used !== undefined ? updates.coupons_used : currentCouponsUsed;
    const nextCouponsUsed = Math.max(0, Math.min(nextCouponsUsedRaw, nextWashCount));
    const nextPaymentType =
      nextCouponsUsed === 0 ? "money" : nextCouponsUsed >= nextWashCount ? "coupon" : "both";
    const targetQueueDate = updates.chosen_date ?? fullQueueItem.queue_date;

    if (updates.wash_count !== undefined) updateData.wash_count = nextWashCount;
    if (updates.coupons_used !== undefined || updates.wash_count !== undefined) {
      updateData.coupons_used = nextCouponsUsed;
      updateData.payment_type = nextPaymentType;
    }
    if (updates.expected_finish_at !== undefined) updateData.expected_finish_at = updates.expected_finish_at;
    if (updates.chosen_date !== undefined) {
      updateData.queue_date = updates.chosen_date;
      updateData.scheduled_for_date = updates.chosen_date;
    }
    if (updates.admin_message !== undefined) updateData.admin_message = updates.admin_message;

    // ✅ Обновляем
    const shouldUpdateCoupons =
      (updates.coupons_used !== undefined ||
        updates.wash_count !== undefined ||
        updates.chosen_date !== undefined) &&
      (nextCouponsUsed !== currentCouponsUsed || updates.chosen_date !== undefined);

    let reserveCouponIds: string[] = [];
    if (shouldUpdateCoupons && nextCouponsUsed > 0) {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const { data: couponRows } = await supabaseAdmin
        .from("coupons")
        .select("id, issued_at, expires_at")
        .eq("owner_student_id", queueItem.student_id)
        .is("reserved_queue_id", null)
        .is("used_at", null)
        .is("used_in_queue_id", null)
        .gt("expires_at", now.toISOString());

      const eligible = (couponRows || [])
        .filter((coupon) => {
          const issuedAt = new Date(coupon.issued_at).getTime();
          const expiresAt = new Date(coupon.expires_at).getTime();
          const ttlMs = expiresAt - issuedAt;
          const expiresDateStr = new Date(coupon.expires_at).toISOString().slice(0, 10);

          if (ttlMs >= 24 * 60 * 60 * 1000) {
            return targetQueueDate < expiresDateStr;
          }

          return targetQueueDate === todayStr && expiresAt > now.getTime();
        })
        .sort(
          (a, b) =>
            new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime() ||
            new Date(a.issued_at).getTime() - new Date(b.issued_at).getTime()
        )
        .slice(0, nextCouponsUsed);

      if (eligible.length < nextCouponsUsed) {
        return NextResponse.json(
          { error: "Недостаточно купонов для выбранной даты" },
          { status: 400 }
        );
      }

      reserveCouponIds = eligible.map((coupon) => coupon.id);
    }

    const { error: updateError } = await supabaseAdmin
      .from("queue")
      .update(updateData)
      .eq("id", queue_item_id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    if (shouldUpdateCoupons) {
      await supabaseAdmin
        .from("coupons")
        .update({ reserved_queue_id: null, reserved_at: null })
        .eq("reserved_queue_id", queue_item_id)
        .is("used_at", null)
        .is("used_in_queue_id", null);

      if (reserveCouponIds.length > 0) {
        await supabaseAdmin
          .from("coupons")
          .update({ reserved_queue_id: queue_item_id, reserved_at: new Date().toISOString() })
          .in("id", reserveCouponIds);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error in update-details:", err);
    return NextResponse.json(
      { error: err.message || "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin, isTargetSuperAdmin, requireLaundryAdmin } from "../../../_utils/adminAuth";
import { v4 as uuidv4 } from "uuid";

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
    const { data: queueItem, error: queueError } = await supabaseAdmin
      .from("queue")
      .select("*")
      .eq("id", queue_item_id)
      .maybeSingle();

    if (queueError || !queueItem) {
      return NextResponse.json(
        { error: "Queue item not found" },
        { status: 404 }
      );
    }

    // ✅ Проверяем, супер-админ ли цель
    const targetIsSuperAdmin = await isTargetSuperAdmin(queueItem.student_id);

    // ✅ Защита: обычный админ не может трогать очередь суперадмина
    if (targetIsSuperAdmin && !caller.is_super_admin) {
      return NextResponse.json(
        { error: "Only super admin can modify super admin's queue items" },
        { status: 403 }
      );
    }

    // ✅ Получаем аватар студента из таблицы students
    let avatarStyle = 'bottts';
    let avatarSeed: string | null = null;
    
    if (queueItem.student_id) {
      const { data: studentData } = await supabaseAdmin
        .from("students")
        .select("avatar_style, avatar_seed")
        .eq("id", queueItem.student_id)
        .maybeSingle();
      
      if (studentData) {
        avatarStyle = studentData.avatar_style || 'bottts';
        avatarSeed = studentData.avatar_seed || null;
      }
    }

    // ✅ Добавляем в историю
    const now = new Date().toISOString();
    const washingFinishedAt = queueItem.washing_finished_at || now;
    const historyItem = {
      id: uuidv4(),
      user_id: queueItem.user_id,
      student_id: queueItem.student_id,
      full_name: queueItem.full_name,
      room: queueItem.room,
      started_at: queueItem.created_at || now,
      finished_at: now,
      ready_at: queueItem.ready_at,
      key_issued_at: queueItem.key_issued_at,
      washing_started_at: queueItem.washing_started_at,
      washing_finished_at: washingFinishedAt,
      return_requested_at: queueItem.return_requested_at,
      wash_count: queueItem.wash_count,
      payment_type: queueItem.payment_type,
      coupons_used: queueItem.coupons_used || 0,
      avatar_style: avatarStyle,
      avatar_seed: avatarSeed,
    };

    const { error: historyError } = await supabaseAdmin
      .from("history")
      .insert(historyItem);

    if (historyError) {
      console.error("Error inserting history:", historyError);
      // Не прерываем выполнение, продолжаем
    }

    // ✅ Удаляем из очереди
    const shouldFinalizeCoupons =
      (queueItem.coupons_used || 0) > 0 ||
      queueItem.payment_type === "coupon" ||
      queueItem.payment_type === "both";

    if (shouldFinalizeCoupons) {
      const { data: reservedRows } = await supabaseAdmin
        .from("coupons")
        .select("id")
        .eq("reserved_queue_id", queue_item_id)
        .is("used_at", null)
        .is("used_in_queue_id", null)
        .order("expires_at", { ascending: true })
        .order("issued_at", { ascending: true });

      const reservedIds = (reservedRows || []).map((row: any) => row.id);
      const baseCouponsUsed = Number(queueItem.coupons_used || 0);
      let couponsToConsume = baseCouponsUsed;

      if (couponsToConsume <= 0) {
        if (reservedIds.length > 0) {
          couponsToConsume = reservedIds.length;
        } else if (queueItem.payment_type === "coupon") {
          couponsToConsume = Math.max(1, queueItem.wash_count || 1);
        } else if (queueItem.payment_type === "both") {
          couponsToConsume = 1;
        }
      }

      const reservedToUse = reservedIds.slice(0, couponsToConsume);
      const reservedToRelease = reservedIds.slice(couponsToConsume);

      if (reservedToRelease.length > 0) {
        await supabaseAdmin
          .from("coupons")
          .update({ reserved_queue_id: null, reserved_at: null })
          .in("id", reservedToRelease)
          .is("used_at", null)
          .is("used_in_queue_id", null);
      }

      if (reservedToUse.length > 0) {
        await supabaseAdmin
          .from("coupons")
          .update({
            used_in_queue_id: queue_item_id,
            used_at: now,
            reserved_queue_id: null,
            reserved_at: null,
          })
          .in("id", reservedToUse)
          .is("used_at", null)
          .is("used_in_queue_id", null);
      }

      const remaining = couponsToConsume - reservedToUse.length;
      if (remaining > 0 && queueItem.student_id) {
        const { data: fallbackRows } = await supabaseAdmin
          .from("coupons")
          .select("id")
          .eq("owner_student_id", queueItem.student_id)
          .is("reserved_queue_id", null)
          .is("used_at", null)
          .is("used_in_queue_id", null)
          .gt("expires_at", now)
          .order("expires_at", { ascending: true })
          .order("issued_at", { ascending: true })
          .limit(remaining);

        const fallbackIds = (fallbackRows || []).map((row: any) => row.id);
        if (fallbackIds.length > 0) {
          await supabaseAdmin
            .from("coupons")
            .update({
              used_in_queue_id: queue_item_id,
              used_at: now,
              reserved_queue_id: null,
              reserved_at: null,
            })
            .in("id", fallbackIds)
            .is("used_at", null)
            .is("used_in_queue_id", null);
        }
      }
    } else {
      await supabaseAdmin
        .from("coupons")
        .update({ reserved_queue_id: null, reserved_at: null })
        .eq("reserved_queue_id", queue_item_id)
        .is("used_at", null)
        .is("used_in_queue_id", null);
    }

    const { error: deleteError } = await supabaseAdmin
      .from("queue")
      .delete()
      .eq("id", queue_item_id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    // ✅ Обновляем machine_state только если это был стирающий
    if (queueItem.status === "washing") {
      // Проверяем, есть ли другие записи со статусом washing
      const { data: washingItems, error: washingError } = await supabaseAdmin
        .from("queue")
        .select("id")
        .eq("status", "washing")
        .limit(1);

      // Если нет других стирающих, сбрасываем machine_state
      if (!washingError && (!washingItems || washingItems.length === 0)) {
        await supabaseAdmin
          .from("machine_state")
          .upsert({
            status: "idle",
            current_queue_item_id: null,
            started_at: null,
            expected_finish_at: null,
          });
      } else if (washingItems && washingItems.length > 0) {
        // Если есть другие стирающие, обновляем current_queue_item_id на первого
        await supabaseAdmin
          .from("machine_state")
          .upsert({
            status: "washing",
            current_queue_item_id: washingItems[0].id,
            started_at: new Date().toISOString(),
            expected_finish_at: null,
          });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error in mark-done:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

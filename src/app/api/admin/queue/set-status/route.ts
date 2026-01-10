import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin, getQueueItemOr404, isTargetSuperAdmin } from "../../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    // ✅ Проверяем JWT и получаем инициатора
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    // ✅ Получаем данные из body
    const { queue_item_id, status } = await req.json();

    if (!queue_item_id || !status) {
      return NextResponse.json(
        { error: "Missing queue_item_id or status" },
        { status: 400 }
      );
    }

    // ✅ Получаем queue item с полными данными
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

    // ✅ Сохраняем старый статус для проверки machine_state
    const oldStatus = queueItem.status;

    // ✅ Обновляем статус
    const { error: updateError } = await supabaseAdmin
      .from("queue")
      .update({ status })
      .eq("id", queue_item_id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // ✅ Если меняем статус с washing на другой, нужно обновить machine_state
    if (oldStatus === "washing" && status !== "washing") {
      // Проверяем, есть ли другие записи со статусом washing (после обновления текущей)
      const { data: washingItems, error: washingError } = await supabaseAdmin
        .from("queue")
        .select("id")
        .eq("status", "washing")
        .limit(1);

      // Если нет других стирающих, сбрасываем machine_state
      if (!washingError && (!washingItems || washingItems.length === 0)) {
        console.log("🔄 Resetting machine_state to idle - no washing items left");
        await supabaseAdmin
          .from("machine_state")
          .upsert({
            status: "idle",
            current_queue_item_id: null,
            started_at: null,
            expected_finish_at: null,
          });
      } else {
        console.log("⚠️ Not resetting machine_state - other washing items exist:", washingItems?.length);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error in set-status:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

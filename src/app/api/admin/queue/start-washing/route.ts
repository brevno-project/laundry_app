import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin, getQueueItemOr404, isTargetSuperAdmin } from "../../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    // ✅ Проверяем JWT и получаем инициатора
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

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

    // ✅ Обновляем статус очереди на WASHING
    const { error: updateError } = await supabaseAdmin
      .from("queue")
      .update({ status: "washing" })
      .eq("id", queue_item_id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // ✅ Обновляем состояние машины
    const now = new Date().toISOString();
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

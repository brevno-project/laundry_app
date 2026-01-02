import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../../_utils/adminAuth";
import { v4 as uuidv4 } from "uuid";

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

    // ✅ Получаем queue item и проверяем владельца
    const { data: queueItem, error: queueError } = await supabaseAdmin
      .from("queue")
      .select("*, students!inner(is_super_admin)")
      .eq("id", queue_item_id)
      .single();

    if (queueError || !queueItem) {
      return NextResponse.json(
        { error: "Queue item not found" },
        { status: 404 }
      );
    }

    // ✅ Защита: обычный админ не может трогать очередь суперадмина
    const targetStudent = queueItem.students as any;
    if (targetStudent?.is_super_admin && !caller.is_super_admin) {
      return NextResponse.json(
        { error: "Only super admin can modify super admin's queue items" },
        { status: 403 }
      );
    }

    // ✅ Добавляем в историю
    const now = new Date().toISOString();
    const historyItem = {
      id: uuidv4(),
      user_id: queueItem.user_id,
      full_name: queueItem.full_name,
      room: queueItem.room,
      started_at: queueItem.created_at || now,
      finished_at: now,
      ready_at: queueItem.ready_at,
      key_issued_at: queueItem.key_issued_at,
      washing_started_at: queueItem.washing_started_at,
      return_requested_at: queueItem.return_requested_at,
    };

    const { error: historyError } = await supabaseAdmin
      .from("history")
      .insert(historyItem);

    if (historyError) {
      console.error("Error inserting history:", historyError);
      // Не прерываем выполнение, продолжаем
    }

    // ✅ Удаляем из очереди
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

    // ✅ Сбрасываем состояние машины
    const { error: machineError } = await supabaseAdmin
      .from("machine_state")
      .upsert({
        status: "idle",
        current_queue_item_id: null,
        started_at: null,
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
    console.error("❌ Error in mark-done:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

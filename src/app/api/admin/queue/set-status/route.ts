import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../../_utils/adminAuth";

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

    // ✅ Получаем queue item и проверяем владельца
    const { data: queueItem, error: queueError } = await supabaseAdmin
      .from("queue")
      .select("id, student_id, students!inner(is_super_admin)")
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

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error in set-status:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

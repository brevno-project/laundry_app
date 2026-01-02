import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    // ✅ Проверяем JWT и получаем инициатора
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    // ✅ Получаем данные из body
    const { queue_item_id, updates } = await req.json();

    if (!queue_item_id || !updates) {
      return NextResponse.json(
        { error: "Missing queue_item_id or updates" },
        { status: 400 }
      );
    }

    // ✅ Получаем queue item и проверяем владельца
    const { data: queueItem, error: queueError } = await supabaseAdmin
      .from("queue")
      .select("id, student_id, status, students!inner(is_super_admin)")
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

    // ✅ Можно обновлять только WAITING
    if (queueItem.status !== "waiting") {
      return NextResponse.json(
        { error: "Can only update details for waiting items" },
        { status: 400 }
      );
    }

    // ✅ Формируем updateData (whitelist)
    const updateData: any = {};
    if (updates.wash_count !== undefined) updateData.wash_count = updates.wash_count;
    if (updates.payment_type !== undefined) updateData.payment_type = updates.payment_type;
    if (updates.expected_finish_at !== undefined) updateData.expected_finish_at = updates.expected_finish_at;
    if (updates.chosen_date !== undefined) updateData.chosen_date = updates.chosen_date;
    if (updates.admin_message !== undefined) updateData.admin_message = updates.admin_message;

    // ✅ Обновляем
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

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error in update-details:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    // ✅ Проверяем JWT и получаем инициатора
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    // ✅ Получаем данные из body
    const { mode, date } = await req.json();

    // mode: "all" | "completed" | "old" | "stuck"
    if (!mode) {
      return NextResponse.json(
        { error: "Missing mode" },
        { status: 400 }
      );
    }

    if (mode === "all") {
      // ✅ Очистить ВСЮ очередь
      // Сначала сбрасываем машину
      await supabaseAdmin
        .from("machine_state")
        .upsert({
          status: "idle",
          current_queue_item_id: null,
          started_at: null,
          expected_finish_at: null,
        });

      await supabaseAdmin
        .from("coupons")
        .update({ reserved_queue_id: null, reserved_at: null })
        .is("used_in_queue_id", null)
        .not("reserved_queue_id", "is", null);

      // Удаляем все записи
      const { data: doneItems } = await supabaseAdmin
        .from("queue")
        .select("id")
        .eq("status", "done");

      if (doneItems && doneItems.length > 0) {
        await supabaseAdmin
          .from("coupons")
          .update({ reserved_queue_id: null, reserved_at: null })
          .is("used_in_queue_id", null)
          .in("reserved_queue_id", doneItems.map((item) => item.id));
      }

      const { error: deleteError } = await supabaseAdmin
        .from("queue")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Удаляем ВСЕ

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }
    } else if (mode === "completed") {
      // ✅ Очистить завершенных
      const { error: deleteError } = await supabaseAdmin
        .from("queue")
        .delete()
        .eq("status", "done");

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }
    } else if (mode === "old") {
      // ✅ Очистить старую очередь (за предыдущие дни)
      const today = new Date().toISOString().split("T")[0];
      const { data: oldItems } = await supabaseAdmin
        .from("queue")
        .select("id")
        .lt("scheduled_for_date", today);

      if (oldItems && oldItems.length > 0) {
        await supabaseAdmin
          .from("coupons")
          .update({ reserved_queue_id: null, reserved_at: null })
          .is("used_in_queue_id", null)
          .in("reserved_queue_id", oldItems.map((item) => item.id));
      }

      const { error: deleteError } = await supabaseAdmin
        .from("queue")
        .delete()
        .lt("scheduled_for_date", today);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }
    } else if (mode === "stuck") {
      // ✅ Очистить зависшие (старше 2 дней, не DONE) - только для суперадмина
      if (!caller.is_super_admin) {
        return NextResponse.json(
          { error: "Only super admin can clear stuck queues" },
          { status: 403 }
        );
      }

      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const cutoffDate = twoDaysAgo.toISOString().split("T")[0];

      const { data: stuckItems } = await supabaseAdmin
        .from("queue")
        .select("id")
        .lt("scheduled_for_date", cutoffDate)
        .neq("status", "done");

      if (stuckItems && stuckItems.length > 0) {
        await supabaseAdmin
          .from("coupons")
          .update({ reserved_queue_id: null, reserved_at: null })
          .is("used_in_queue_id", null)
          .in("reserved_queue_id", stuckItems.map((item) => item.id));
      }

      const { error: deleteError } = await supabaseAdmin
        .from("queue")
        .delete()
        .lt("scheduled_for_date", cutoffDate)
        .neq("status", "done");

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid mode" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error in clear:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

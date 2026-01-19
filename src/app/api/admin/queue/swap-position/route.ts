import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getCaller, canModifyQueueItem, requireLaundryAdmin } from "@/app/api/_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const { caller, error } = await getCaller(req);
    if (error) return NextResponse.json({ error }, { status: 401 });
    const roleError = requireLaundryAdmin(caller);
    if (roleError) return roleError;

    const { a_id, b_id } = await req.json();
    if (!a_id || !b_id) {
      return NextResponse.json({ error: "Missing a_id or b_id" }, { status: 400 });
    }

    // Защита суперадмина: обычный админ не трогает item суперадмина
    const allowA = await canModifyQueueItem(caller, a_id);
    if (!allowA.allowed) return allowA.error;

    const allowB = await canModifyQueueItem(caller, b_id);
    if (!allowB.allowed) return allowB.error;

    const { data: a } = await supabaseAdmin
      .from("queue")
      .select("id, queue_position")
      .eq("id", a_id)
      .single();

    const { data: b } = await supabaseAdmin
      .from("queue")
      .select("id, queue_position")
      .eq("id", b_id)
      .single();

    if (!a || !b) return NextResponse.json({ error: "Queue item not found" }, { status: 404 });

    // swap positions
    await supabaseAdmin
      .from("queue")
      .update({ queue_position: b.queue_position })
      .eq("id", a_id);

    await supabaseAdmin
      .from("queue")
      .update({ queue_position: a.queue_position })
      .eq("id", b_id);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}

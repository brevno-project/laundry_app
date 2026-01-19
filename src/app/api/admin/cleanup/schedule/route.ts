import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    const { block, check_date, check_time } = await req.json();

    if (!block || !check_date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (block !== "A" && block !== "B") {
      return NextResponse.json({ error: "Invalid block" }, { status: 400 });
    }

    if (!caller.is_super_admin) {
      const { data: adminStudent } = await supabaseAdmin
        .from("students")
        .select("apartment_id, room")
        .eq("id", caller.student_id)
        .maybeSingle();

      let adminBlock: string | null = null;

      if (adminStudent?.apartment_id) {
        const { data: adminApartment } = await supabaseAdmin
          .from("apartments")
          .select("block")
          .eq("id", adminStudent.apartment_id)
          .maybeSingle();

        if (adminApartment?.block) {
          adminBlock = adminApartment.block;
        }
      }

      if (!adminBlock && adminStudent?.room) {
        const roomBlock = adminStudent.room.trim().charAt(0).toUpperCase();
        if (roomBlock === "A" || roomBlock === "B") {
          adminBlock = roomBlock;
        }
      }

      if (!adminBlock) {
        return NextResponse.json(
          { error: "У администратора не указан блок" },
          { status: 403 }
        );
      }

      if (adminBlock !== block) {
        return NextResponse.json(
          { error: "Not allowed to schedule for this block" },
          { status: 403 }
        );
      }
    }

    const nowIso = new Date().toISOString();
    const { error: upsertError } = await supabaseAdmin
      .from("cleanup_schedules")
      .upsert(
        {
          block,
          check_date,
          check_time: check_time || null,
          set_by: caller.student_id,
          updated_at: nowIso,
          reminder_sent_at: null,
        },
        { onConflict: "block" }
      );

    if (upsertError) {
      return NextResponse.json(
        { error: "Insert failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (err: any) {
    console.error("Error in cleanup schedule:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

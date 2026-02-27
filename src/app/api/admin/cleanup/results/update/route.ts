import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../../../_utils/adminAuth";

type Block = "A" | "B";

const resolveAdminBlock = async (studentId: string): Promise<Block | null> => {
  const { data: adminStudent } = await supabaseAdmin
    .from("students")
    .select("apartment_id, room")
    .eq("id", studentId)
    .maybeSingle();

  let adminBlock: Block | null = null;

  if (adminStudent?.apartment_id) {
    const { data: adminApartment } = await supabaseAdmin
      .from("apartments")
      .select("block")
      .eq("id", adminStudent.apartment_id)
      .maybeSingle();

    if (adminApartment?.block === "A" || adminApartment?.block === "B") {
      adminBlock = adminApartment.block;
    }
  }

  if (!adminBlock && adminStudent?.room) {
    const roomBlock = adminStudent.room.trim().charAt(0).toUpperCase();
    if (roomBlock === "A" || roomBlock === "B") {
      adminBlock = roomBlock;
    }
  }

  return adminBlock;
};

export async function POST(req: NextRequest) {
  try {
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    const { result_id, announcement_text } = await req.json();

    if (!result_id || typeof announcement_text !== "string" || !announcement_text.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: resultRow, error: resultError } = await supabaseAdmin
      .from("cleanup_results")
      .select("id, block")
      .eq("id", result_id)
      .maybeSingle();

    if (resultError) {
      return NextResponse.json({ error: resultError.message }, { status: 500 });
    }

    if (!resultRow) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    if (!caller.is_super_admin) {
      const adminBlock = await resolveAdminBlock(caller.student_id);
      if (!adminBlock) {
        return NextResponse.json({ error: "Admin apartment not set" }, { status: 403 });
      }
      if (resultRow.block !== adminBlock) {
        return NextResponse.json({ error: "Not allowed to edit result" }, { status: 403 });
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from("cleanup_results")
      .update({
        announcement_text: announcement_text.trim(),
        announcement_mode: "manual",
      })
      .eq("id", result_id);

    if (updateError) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: result_id,
      block: resultRow.block,
    });
  } catch (err: any) {
    console.error("Error updating cleanup result:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

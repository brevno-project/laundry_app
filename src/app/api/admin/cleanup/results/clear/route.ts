import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    const { block } = await req.json();

    if (!block) {
      return NextResponse.json({ error: "Missing block" }, { status: 400 });
    }

    if (block !== "A" && block !== "B") {
      return NextResponse.json({ error: "Invalid block" }, { status: 400 });
    }

    if (!caller.is_super_admin) {
      const { data: adminStudent } = await supabaseAdmin
        .from("students")
        .select("apartment_id")
        .eq("id", caller.student_id)
        .maybeSingle();

      if (!adminStudent?.apartment_id) {
        return NextResponse.json(
          { error: "Admin apartment not set" },
          { status: 403 }
        );
      }

      const { data: adminApartment } = await supabaseAdmin
        .from("apartments")
        .select("block")
        .eq("id", adminStudent.apartment_id)
        .maybeSingle();

      if (!adminApartment?.block || adminApartment.block !== block) {
        return NextResponse.json(
          { error: "Not allowed to clear results for this block" },
          { status: 403 }
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from("cleanup_results")
      .delete()
      .eq("block", block)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: data?.length || 0,
    });
  } catch (err: any) {
    console.error("Error clearing cleanup results:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

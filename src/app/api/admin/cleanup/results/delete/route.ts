import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    if (!caller.is_super_admin) {
      return NextResponse.json(
        { error: "Only super admin can delete result" },
        { status: 403 }
      );
    }

    const { result_id } = await req.json();
    if (!result_id) {
      return NextResponse.json({ error: "Missing result_id" }, { status: 400 });
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

    const { data: couponsDeletedRows, error: couponsDeleteError } = await supabaseAdmin
      .from("coupons")
      .delete()
      .eq("source_type", "cleanup")
      .eq("source_id", result_id)
      .select("id");

    if (couponsDeleteError) {
      return NextResponse.json({ error: couponsDeleteError.message }, { status: 500 });
    }

    const { error: resultDeleteError } = await supabaseAdmin
      .from("cleanup_results")
      .delete()
      .eq("id", result_id);

    if (resultDeleteError) {
      return NextResponse.json({ error: resultDeleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: result_id,
      block: resultRow.block,
      deleted_coupons: couponsDeletedRows?.length || 0,
    });
  } catch (err: any) {
    console.error("Error deleting cleanup result:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

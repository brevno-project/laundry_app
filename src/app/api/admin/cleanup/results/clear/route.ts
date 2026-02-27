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
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const { data: resultsToDelete, error: findError } = await supabaseAdmin
      .from("cleanup_results")
      .select("id")
      .eq("block", block);

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    const resultIds = (resultsToDelete || []).map((row: { id: string }) => row.id);
    let deletedCoupons = 0;

    if (resultIds.length > 0) {
      const { data: removedCoupons, error: couponsError } = await supabaseAdmin
        .from("coupons")
        .delete()
        .eq("source_type", "cleanup")
        .in("source_id", resultIds)
        .select("id");

      if (couponsError) {
        return NextResponse.json({ error: couponsError.message }, { status: 500 });
      }
      deletedCoupons = removedCoupons?.length || 0;
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
      deleted_coupons: deletedCoupons,
    });
  } catch (err: any) {
    console.error("Error clearing cleanup results:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

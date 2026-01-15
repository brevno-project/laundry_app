import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../../../_utils/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    if (!caller.is_admin && !caller.is_super_admin) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("coupon_transfers")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: data?.length || 0,
    });
  } catch (err: any) {
    console.error("Error clearing coupon transfers:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

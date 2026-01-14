import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../../_utils/adminAuth";

const DEFAULT_COUPON_TTL_SECONDS = 604800;

export async function POST(req: NextRequest) {
  try {
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    if (!caller.is_super_admin) {
      return NextResponse.json(
        { error: "Only super admin can grant coupons" },
        { status: 403 }
      );
    }

    const { student_id, count, note } = await req.json();

    if (!student_id || !count || count <= 0) {
      return NextResponse.json(
        { error: "Missing student_id or invalid count" },
        { status: 400 }
      );
    }

    const { data: ttlSetting } = await supabaseAdmin
      .from("app_settings")
      .select("value_int")
      .eq("key", "cleanup_coupon_ttl_seconds")
      .maybeSingle();

    const ttlSeconds =
      typeof ttlSetting?.value_int === "number"
        ? ttlSetting.value_int
        : DEFAULT_COUPON_TTL_SECONDS;

    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

    const coupons = Array.from({ length: count }).map(() => ({
      owner_student_id: student_id,
      source_type: "manual",
      source_id: null,
      issued_by: caller.student_id,
      issued_at: nowIso,
      valid_from: nowIso,
      expires_at: expiresAt,
      note: note || null,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("coupons")
      .insert(coupons);

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      issued: count,
      expires_at: expiresAt,
    });
  } catch (err: any) {
    console.error("Error in grant coupons:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

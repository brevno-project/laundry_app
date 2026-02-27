import { NextRequest, NextResponse } from "next/server";
import { fromZonedTime } from "date-fns-tz";
import { getCaller, supabaseAdmin } from "../../../../_utils/adminAuth";

const DEFAULT_COUPON_TTL_SECONDS = 604800;
const TIMEZONE = "Asia/Bishkek";

const parseDateTime = (dateStr?: string | null, timeStr?: string | null): Date | null => {
  if (!dateStr) return null;
  const normalizedTime = typeof timeStr === "string" && timeStr.trim() ? timeStr.slice(0, 5) : "00:00";
  const parsed = fromZonedTime(`${dateStr}T${normalizedTime}:00`, TIMEZONE);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export async function POST(req: NextRequest) {
  try {
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    if (!caller.is_super_admin) {
      return NextResponse.json(
        { error: "Only super admin can sync coupons" },
        { status: 403 }
      );
    }

    const { result_id } = await req.json();
    if (!result_id) {
      return NextResponse.json({ error: "Missing result_id" }, { status: 400 });
    }

    const { data: resultRow, error: resultError } = await supabaseAdmin
      .from("cleanup_results")
      .select("id, block, week_start")
      .eq("id", result_id)
      .maybeSingle();

    if (resultError) {
      return NextResponse.json({ error: resultError.message }, { status: 500 });
    }
    if (!resultRow) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    const { data: scheduleRow } = await supabaseAdmin
      .from("cleanup_schedules")
      .select("check_date, check_time")
      .eq("block", resultRow.block)
      .maybeSingle();

    const baseDate =
      parseDateTime(scheduleRow?.check_date || null, scheduleRow?.check_time || null) ||
      parseDateTime(resultRow.week_start, scheduleRow?.check_time || null) ||
      new Date();
    const baseIso = baseDate.toISOString();

    const { data: ttlSetting } = await supabaseAdmin
      .from("app_settings")
      .select("value_int")
      .eq("key", "cleanup_coupon_ttl_seconds")
      .maybeSingle();

    const ttlSeconds =
      typeof ttlSetting?.value_int === "number"
        ? ttlSetting.value_int
        : DEFAULT_COUPON_TTL_SECONDS;
    const expiresAt = new Date(baseDate.getTime() + ttlSeconds * 1000).toISOString();

    const { data: updatedCoupons, error: updateCouponsError } = await supabaseAdmin
      .from("coupons")
      .update({
        valid_from: baseIso,
        expires_at: expiresAt,
      })
      .eq("source_type", "cleanup")
      .eq("source_id", result_id)
      .is("used_at", null)
      .is("used_in_queue_id", null)
      .select("id");

    if (updateCouponsError) {
      return NextResponse.json({ error: updateCouponsError.message }, { status: 500 });
    }

    const { error: updateResultError } = await supabaseAdmin
      .from("cleanup_results")
      .update({ coupons_issued_at: baseIso })
      .eq("id", result_id);

    if (updateResultError) {
      return NextResponse.json({ error: updateResultError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: result_id,
      updated_coupons: updatedCoupons?.length || 0,
      valid_from: baseIso,
      expires_at: expiresAt,
    });
  } catch (err: any) {
    console.error("Error syncing cleanup coupons:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}


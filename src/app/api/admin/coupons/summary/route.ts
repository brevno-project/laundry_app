import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../../_utils/adminAuth";

type CouponRow = {
  owner_student_id: string | null;
  reserved_queue_id?: string | null;
  used_at?: string | null;
  used_in_queue_id?: string | null;
  expires_at?: string | null;
};

type CouponStats = {
  active: number;
  reserved: number;
  used: number;
  expired: number;
  total: number;
  valid: number;
};

const emptyStats = (): CouponStats => ({
  active: 0,
  reserved: 0,
  used: 0,
  expired: 0,
  total: 0,
  valid: 0,
});

export async function GET(req: NextRequest) {
  try {
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    if (!caller.is_admin && !caller.is_super_admin && !caller.is_cleanup_admin) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("coupons")
      .select("owner_student_id, reserved_queue_id, used_at, used_in_queue_id, expires_at");

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to load coupons" },
        { status: 500 }
      );
    }

    const now = Date.now();
    const stats: Record<string, CouponStats> = {};

    (data as CouponRow[] | null | undefined || []).forEach((coupon) => {
      if (!coupon.owner_student_id) return;
      const ownerId = coupon.owner_student_id;
      const entry = stats[ownerId] || emptyStats();

      entry.total += 1;
      const isUsed = !!coupon.used_at || !!coupon.used_in_queue_id;
      const expiresAt = coupon.expires_at ? new Date(coupon.expires_at).getTime() : null;
      const isExpired = !isUsed && expiresAt !== null && !Number.isNaN(expiresAt) && expiresAt <= now;

      if (isUsed) {
        entry.used += 1;
      } else if (isExpired) {
        entry.expired += 1;
      } else if (coupon.reserved_queue_id) {
        entry.reserved += 1;
      } else {
        entry.active += 1;
      }

      entry.valid = entry.active + entry.reserved;
      stats[ownerId] = entry;
    });

    return NextResponse.json({
      success: true,
      stats,
      as_of: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error in coupons summary:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

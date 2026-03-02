import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../../_utils/adminAuth";

type CouponRow = {
  id: string;
  owner_student_id: string | null;
  source_type: string | null;
  source_id: string | null;
  reserved_queue_id: string | null;
  used_at: string | null;
  used_in_queue_id: string | null;
  expires_at: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    if (!caller.is_super_admin) {
      return NextResponse.json({ error: "Only super admin can transfer coupons" }, { status: 403 });
    }

    const { coupon_id, to_student_id } = await req.json();
    if (!coupon_id || !to_student_id) {
      return NextResponse.json({ error: "Missing coupon_id or to_student_id" }, { status: 400 });
    }

    const { data: targetStudent, error: targetError } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("id", to_student_id)
      .maybeSingle();

    if (targetError || !targetStudent) {
      return NextResponse.json({ error: "Target student not found" }, { status: 404 });
    }

    const { data: coupon, error: couponError } = await supabaseAdmin
      .from("coupons")
      .select(
        "id, owner_student_id, source_type, source_id, reserved_queue_id, used_at, used_in_queue_id, expires_at"
      )
      .eq("id", coupon_id)
      .maybeSingle();

    if (couponError || !coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    const typedCoupon = coupon as CouponRow;
    const fromStudentId = typedCoupon.owner_student_id;

    if (!fromStudentId) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    if (fromStudentId === to_student_id) {
      return NextResponse.json(
        { error: "Source and target students must be different" },
        { status: 400 }
      );
    }

    const now = Date.now();
    const expiresAtMs = typedCoupon.expires_at ? new Date(typedCoupon.expires_at).getTime() : Number.NaN;

    if (Number.isNaN(expiresAtMs) || expiresAtMs <= now) {
      return NextResponse.json({ error: "Coupon expired" }, { status: 400 });
    }

    if (typedCoupon.reserved_queue_id || typedCoupon.used_at || typedCoupon.used_in_queue_id) {
      return NextResponse.json({ error: "Coupon is reserved or used" }, { status: 409 });
    }

    const nowIso = new Date().toISOString();
    const { data: updatedCoupons, error: updateError } = await supabaseAdmin
      .from("coupons")
      .update({
        owner_student_id: to_student_id,
        source_type: "transfer",
        source_id: null,
      })
      .eq("id", coupon_id)
      .eq("owner_student_id", fromStudentId)
      .is("reserved_queue_id", null)
      .is("used_at", null)
      .is("used_in_queue_id", null)
      .gt("expires_at", nowIso)
      .select("id");

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedCoupons || updatedCoupons.length === 0) {
      return NextResponse.json({ error: "Coupon is reserved or used" }, { status: 409 });
    }

    const { error: transferInsertError } = await supabaseAdmin.from("coupon_transfers").insert({
      coupon_id,
      from_student_id: fromStudentId,
      to_student_id,
      performed_by: caller.student_id,
      note: "super_admin_transfer",
    });

    if (transferInsertError) {
      // Best-effort rollback if history insert failed after ownership update.
      await supabaseAdmin
        .from("coupons")
        .update({
          owner_student_id: fromStudentId,
          source_type: typedCoupon.source_type || "cleanup_result",
          source_id: typedCoupon.source_id,
        })
        .eq("id", coupon_id)
        .eq("owner_student_id", to_student_id)
        .is("reserved_queue_id", null)
        .is("used_at", null)
        .is("used_in_queue_id", null);

      return NextResponse.json({ error: transferInsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      coupon_id,
      from_student_id: fromStudentId,
      to_student_id,
    });
  } catch (err: any) {
    console.error("Error transferring coupon as super admin:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

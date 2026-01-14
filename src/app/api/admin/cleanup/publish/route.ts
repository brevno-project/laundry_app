import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../_utils/adminAuth";

const DEFAULT_COUPON_TTL_SECONDS = 604800;

export async function POST(req: NextRequest) {
  try {
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    const {
      week_start,
      block,
      apartment_id,
      announcement_text,
      announcement_mode,
      template_key,
    } = await req.json();

    if (!week_start || !block || !apartment_id || !announcement_text) {
      return NextResponse.json(
        { error: "Заполните все обязательные поля" },
        { status: 400 }
      );
    }

    if (block !== "A" && block !== "B") {
      return NextResponse.json({ error: "Некорректный блок" }, { status: 400 });
    }

    if (!caller.is_super_admin) {
      const { data: adminStudent } = await supabaseAdmin
        .from("students")
        .select("apartment_id")
        .eq("id", caller.student_id)
        .maybeSingle();

      if (!adminStudent?.apartment_id) {
        return NextResponse.json(
          { error: "У администратора не указана квартира" },
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
          { error: "Нельзя публиковать результаты для этого блока" },
          { status: 403 }
        );
      }
    }

    const { data: winningApartment } = await supabaseAdmin
      .from("apartments")
      .select("id, block")
      .eq("id", apartment_id)
      .maybeSingle();

    if (!winningApartment) {
      return NextResponse.json({ error: "Квартира не найдена" }, { status: 404 });
    }

    if (winningApartment.block && winningApartment.block !== block) {
      return NextResponse.json(
        { error: "Квартира не относится к выбранному блоку" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("cleanup_results")
      .select("id")
      .eq("week_start", week_start)
      .eq("block", block)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Результаты уже опубликованы" },
        { status: 409 }
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const { data: ttlSetting } = await supabaseAdmin
      .from("app_settings")
      .select("value_int")
      .eq("key", "cleanup_coupon_ttl_seconds")
      .maybeSingle();

    const ttlSeconds =
      typeof ttlSetting?.value_int === "number"
        ? ttlSetting.value_int
        : DEFAULT_COUPON_TTL_SECONDS;
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

    const { data: result, error: insertError } = await supabaseAdmin
      .from("cleanup_results")
      .insert({
        week_start,
        block,
        winning_apartment_id: apartment_id,
        announcement_text,
        announcement_mode: announcement_mode || "template",
        template_key: template_key || null,
        announced_by: caller.student_id,
        created_by: caller.student_id,
        published_at: nowIso,
        coupons_issued_at: nowIso,
      })
      .select("id")
      .single();

    if (insertError || !result) {
      return NextResponse.json(
        { error: "Не удалось сохранить результаты" },
        { status: 500 }
      );
    }

    const { data: residents } = await supabaseAdmin
      .from("students")
      .select("id, is_banned")
      .eq("apartment_id", apartment_id);

    const eligibleResidents = (residents || []).filter(
      (student) => !student.is_banned
    );

    if (eligibleResidents.length > 0) {
      const couponRows = eligibleResidents.map((student) => ({
        owner_student_id: student.id,
        source_type: "cleanup",
        source_id: result.id,
        issued_by: caller.student_id,
        issued_at: nowIso,
        valid_from: nowIso,
        expires_at: expiresAt,
      }));

      const { error: couponError } = await supabaseAdmin
        .from("coupons")
        .insert(couponRows);

      if (couponError) {
        await supabaseAdmin.from("cleanup_results").delete().eq("id", result.id);
        return NextResponse.json(
          { error: "Не удалось выдать купоны" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      result_id: result.id,
      coupons_issued: eligibleResidents.length,
      expires_at: expiresAt,
    });
  } catch (err: any) {
    console.error("Error in cleanup publish:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

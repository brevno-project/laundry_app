import { randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { supabaseAdmin } from "../../_utils/adminAuth";

const TIMEZONE = "Asia/Bishkek";
const DEFAULT_WIN_PROBABILITY_BPS = 50; // 0.50%
const DEFAULT_COUPON_TTL_SECONDS = 7 * 24 * 60 * 60;

type StudentContext = {
  userId: string;
  studentId: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isCleanupAdmin: boolean;
};

const clampInt = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.floor(value)));

const getSpinDate = () => formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");

const getTokenFromRequest = (req: NextRequest): string | null => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
};

const getSettingInt = async (key: string, fallback: number): Promise<number> => {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value_int")
    .eq("key", key)
    .maybeSingle();

  if (typeof data?.value_int !== "number" || Number.isNaN(data.value_int)) {
    return fallback;
  }
  return data.value_int;
};

const getStudentContext = async (
  req: NextRequest
): Promise<{ context: StudentContext; error?: never } | { context?: never; error: NextResponse }> => {
  const token = getTokenFromRequest(req);
  if (!token) {
    return {
      error: NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 }),
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: student, error: studentError } = await supabaseAdmin
    .from("students")
    .select("id, is_admin, is_super_admin, is_cleanup_admin, is_banned")
    .eq("user_id", user.id)
    .maybeSingle();

  if (studentError || !student) {
    return {
      error: NextResponse.json({ error: "Student not found" }, { status: 404 }),
    };
  }

  if (student.is_banned) {
    return {
      error: NextResponse.json({ error: "You are banned" }, { status: 403 }),
    };
  }

  return {
    context: {
      userId: user.id,
      studentId: student.id,
      isAdmin: !!student.is_admin,
      isSuperAdmin: !!student.is_super_admin,
      isCleanupAdmin: !!student.is_cleanup_admin,
    },
  };
};

const getTodaySpin = async (studentId: string, spinDate: string) => {
  const { data } = await supabaseAdmin
    .from("daily_coupon_spins")
    .select("id, won, coupon_id, created_at, roll_value, win_probability_bps")
    .eq("student_id", studentId)
    .eq("spin_date", spinDate)
    .maybeSingle();

  return data;
};

const buildStatusPayload = (params: {
  chanceBps: number;
  spinDate: string;
  spinRow: {
    won: boolean;
    coupon_id: string | null;
    created_at: string;
    roll_value: number;
    win_probability_bps: number;
  } | null;
  lotteryBlocked: boolean;
}) => {
  const hasSpun = !!params.spinRow;
  return {
    success: true,
    spin_date: params.spinDate,
    chance_bps: params.chanceBps,
    chance_percent: params.chanceBps / 100,
    has_spun: hasSpun,
    can_spin: !hasSpun && !params.lotteryBlocked,
    lottery_blocked: params.lotteryBlocked,
    won: hasSpun ? !!params.spinRow?.won : false,
    coupon_id: hasSpun ? params.spinRow?.coupon_id ?? null : null,
    spun_at: hasSpun ? params.spinRow?.created_at ?? null : null,
    roll_value: hasSpun ? params.spinRow?.roll_value ?? null : null,
    used_probability_bps: hasSpun ? params.spinRow?.win_probability_bps ?? params.chanceBps : params.chanceBps,
  };
};

export async function GET(req: NextRequest) {
  try {
    const studentResult = await getStudentContext(req);
    if (studentResult.error) return studentResult.error;

    const { context } = studentResult;
    const lotteryBlocked = context.isAdmin || context.isSuperAdmin || context.isCleanupAdmin;
    const spinDate = getSpinDate();

    const chanceBpsRaw = await getSettingInt("daily_spin_win_probability_bps", DEFAULT_WIN_PROBABILITY_BPS);
    const chanceBps = clampInt(chanceBpsRaw, 0, 10000);

    const spinRow = await getTodaySpin(context.studentId, spinDate);

    return NextResponse.json(
      buildStatusPayload({
        chanceBps,
        spinDate,
        spinRow: spinRow
          ? {
              won: !!spinRow.won,
              coupon_id: spinRow.coupon_id ?? null,
              created_at: spinRow.created_at,
              roll_value: spinRow.roll_value,
              win_probability_bps: spinRow.win_probability_bps,
            }
          : null,
        lotteryBlocked,
      })
    );
  } catch (err: any) {
    console.error("Error in daily spin GET:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const studentResult = await getStudentContext(req);
    if (studentResult.error) return studentResult.error;

    const { context } = studentResult;
    if (context.isAdmin || context.isSuperAdmin || context.isCleanupAdmin) {
      return NextResponse.json({ error: "Daily spin is available only for students" }, { status: 403 });
    }

    const spinDate = getSpinDate();
    const chanceBpsRaw = await getSettingInt("daily_spin_win_probability_bps", DEFAULT_WIN_PROBABILITY_BPS);
    const chanceBps = clampInt(chanceBpsRaw, 0, 10000);

    const ttlSecondsRaw = await getSettingInt("daily_spin_coupon_ttl_seconds", DEFAULT_COUPON_TTL_SECONDS);
    const ttlSeconds = clampInt(ttlSecondsRaw, 60, 365 * 24 * 60 * 60);

    const rollValue = randomInt(0, 10000);

    const { data, error } = await supabaseAdmin.rpc("perform_daily_coupon_spin", {
      p_student_id: context.studentId,
      p_spin_date: spinDate,
      p_win_probability_bps: chanceBps,
      p_coupon_ttl_seconds: ttlSeconds,
      p_roll_value: rollValue,
    });

    if (error) {
      return NextResponse.json({ error: error.message || "Spin failed" }, { status: 500 });
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return NextResponse.json({ error: "Spin result is empty" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      spin_date: row.spin_date || spinDate,
      chance_bps: chanceBps,
      chance_percent: chanceBps / 100,
      has_spun: true,
      can_spin: false,
      already_spun: !!row.already_spun,
      won: !!row.won,
      coupon_id: row.coupon_id ?? null,
      spun_at: row.created_at ?? null,
      roll_value: typeof row.roll_value === "number" ? row.roll_value : null,
      used_probability_bps:
        typeof row.win_probability_bps === "number" ? row.win_probability_bps : chanceBps,
    });
  } catch (err: any) {
    console.error("Error in daily spin POST:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../../_utils/adminAuth";

const parseDateRange = (value?: string | null, endOfDay: boolean = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date.toISOString();
};

export async function POST(req: NextRequest) {
  try {
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    if (!caller.is_super_admin) {
      return NextResponse.json(
        { error: "Only super admin can clear history" },
        { status: 403 }
      );
    }

    const { mode, from, to, room, student_id } = await req.json();

    let query = supabaseAdmin.from("history").delete();

    if (mode === "all") {
      // no filters
    } else {
      const fromIso = parseDateRange(from, false);
      const toIso = parseDateRange(to, true);

      if (fromIso) query = query.gte("finished_at", fromIso);
      if (toIso) query = query.lte("finished_at", toIso);
      if (room) query = query.eq("room", room);
      if (student_id) query = query.eq("student_id", student_id);
    }

    const { data, error: deleteError, count } = await query.select("id", {
      count: "exact",
      head: true,
    });

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      count: count ?? data?.length ?? 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../_utils/adminAuth";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json(
      { error: "Invalid token" },
      { status: 401 }
    );
  }

  const { data: requester, error: requesterError } = await supabaseAdmin
    .from("students")
    .select("id, is_admin, is_super_admin, is_cleanup_admin, can_view_students, is_banned")
    .eq("user_id", user.id)
    .maybeSingle();

  if (requesterError || !requester) {
    return NextResponse.json({ error: "Requester not found" }, { status: 403 });
  }

  if (requester.is_banned) {
    return NextResponse.json({ error: "Requester is banned" }, { status: 403 });
  }

  const canViewList =
    requester.is_admin ||
    requester.is_super_admin ||
    requester.is_cleanup_admin ||
    requester.can_view_students;
  if (!canViewList) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const query = supabaseAdmin
    .from("students")
    .select(
      "id, first_name, last_name, middle_name, full_name, room, avatar_style, avatar_seed, telegram_chat_id, is_registered, is_banned, is_admin, is_super_admin, is_cleanup_admin, can_view_students, key_issued, key_lost, stay_type"
    );
  const { data, error } = await query.order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ students: data || [] });
}

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

  const { data, error } = await supabaseAdmin
    .from("students")
    .select("id, full_name, room, avatar_type, is_registered, is_banned, key_issued, key_lost")
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ students: data || [] });
}

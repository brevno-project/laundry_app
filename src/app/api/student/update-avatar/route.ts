import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    // ✅ Получаем JWT из Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("❌ Missing or invalid authorization header");
      return NextResponse.json(
        { error: "Missing or invalid authorization" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    // ✅ Создаем Supabase client с JWT для проверки пользователя
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // ✅ Получаем текущего пользователя
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("❌ Auth error:", authError);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ✅ Получаем данные из body
    const { avatar_style, avatar_seed } = await req.json();

    if (!avatar_style) {
      return NextResponse.json(
        { error: "Missing avatar_style" },
        { status: 400 }
      );
    }

    // ✅ Используем service_role для обновления (обходит RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ✅ Обновляем студента (только свои данные)
    const { data, error: updateError } = await supabaseAdmin
      .from("students")
      .update({
        avatar_style,
        avatar_seed: avatar_seed || null,
      })
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("❌ Update error:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    if (!data) {
      console.error("❌ No student found with user_id:", user.id);
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, student: data });
  } catch (err: any) {
    console.error("❌ Error in update-avatar:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

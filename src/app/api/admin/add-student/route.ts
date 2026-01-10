import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../_utils/adminAuth";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    // ✅ Проверяем JWT и получаем инициатора
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    // ✅ Получаем данные из body
    const { first_name, last_name, middle_name, room } = await req.json();

    if (!first_name || !first_name.trim()) {
      return NextResponse.json(
        { error: "First name is required" },
        { status: 400 }
      );
    }

    // ✅ Создаем полное имя
    const fullName = [first_name, middle_name, last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    // ✅ Создаем нового студента БЕЗ user_id (он будет null до регистрации)
    const studentId = uuidv4();
    const { error: insertError } = await supabaseAdmin
      .from("students")
      .insert({
        id: studentId,
        user_id: null, // Будет заполнено при регистрации
        first_name: first_name.trim(),
        last_name: last_name?.trim() || "",
        middle_name: middle_name?.trim() || null,
        full_name: fullName,
        room: room?.trim() || null,
        is_registered: false,
        is_banned: false,
        is_admin: false,
        is_super_admin: false,
        can_view_students: false,
        avatar_type: "default",
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error inserting student:", insertError);
      
      // Проверка на дубликат
      if (insertError.code === '23505' || insertError.message?.includes('unique_student_fullname')) {
        return NextResponse.json(
          { error: "Студент с таким ФИО и комнатой уже существует" },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      student_id: studentId 
    });
  } catch (err: any) {
    console.error("❌ Error in add-student:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
